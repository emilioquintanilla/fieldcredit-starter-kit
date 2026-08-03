// src/routes/api/rag/procesar.ts
// Procesa un documento normativo: chunking → batch embedding → bulk INSERT.
//
// OPTIMIZACIÓN vs versión anterior:
//   Antes: 1 llamada HuggingFace por fragmento + 1 INSERT por fragmento
//          → 40 fragmentos = ~40 llamadas en serie (~60-120 seg)
//   Ahora: 1 llamada HuggingFace con todos los fragmentos + 1 INSERT masivo
//          → 40 fragmentos = ~2-4 segundos en total
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const CHUNK_SIZE  = 800; // caracteres por fragmento
const CHUNK_SOLAPE = 150; // solapamiento entre fragmentos
const BATCH_MAX   = 50;  // máximo de fragmentos por llamada HuggingFace

// ── Chunking ──────────────────────────────────────────────────────────────────
function chunkearTexto(texto: string): string[] {
  const parrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const fragmentos: string[] = [];
  let buffer = "";

  for (const parrafo of parrafos) {
    if (buffer.length + parrafo.length + 2 <= CHUNK_SIZE) {
      buffer = buffer ? `${buffer}\n\n${parrafo}` : parrafo;
    } else {
      if (buffer) {
        fragmentos.push(buffer.trim());
        buffer = buffer.slice(-CHUNK_SOLAPE) + "\n\n" + parrafo;
      } else {
        // Párrafo más largo que CHUNK_SIZE: partir por caracteres
        for (let i = 0; i < parrafo.length; i += CHUNK_SIZE - CHUNK_SOLAPE) {
          fragmentos.push(parrafo.slice(i, i + CHUNK_SIZE).trim());
        }
        buffer = "";
      }
    }
  }
  if (buffer.trim()) fragmentos.push(buffer.trim());
  return fragmentos.filter((f) => f.length > 30);
}

// ── Route ─────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/api/rag/procesar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let documentoId: string;
        try {
          const body = (await request.json()) as { documento_id: string };
          documentoId = body.documento_id;
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        if (!documentoId) {
          return Response.json({ error: "documento_id requerido" }, { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
          return Response.json(
            { error: "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados" },
            { status: 500 }
          );
        }

        const supabase = createClient(supabaseUrl, serviceKey);

        // 1. Leer el documento
        const { data: doc, error: docError } = await supabase
          .from("documentos_normativos")
          .select("id, nombre, contenido_texto")
          .eq("id", documentoId)
          .single();

        if (docError || !doc?.contenido_texto) {
          return Response.json(
            { error: "Documento no encontrado o sin texto" },
            { status: 404 }
          );
        }

        // 2. Borrar fragmentos anteriores (permite re-indexar)
        await supabase
          .from("fragmentos_normativos")
          .delete()
          .eq("documento_id", documentoId);

        // 3. Chunkear el texto completo
        const fragmentos = chunkearTexto(doc.contenido_texto);

        if (fragmentos.length === 0) {
          return Response.json({ error: "El texto no produjo fragmentos válidos" }, { status: 422 });
        }

        const baseUrl = new URL(request.url).origin;

        // 4. ── BATCH EMBEDDING ────────────────────────────────────────────────
        // Dividir en lotes de BATCH_MAX para respetar límites del modelo.
        // Incluso con 2 lotes esto es 2 llamadas vs 40+ anteriores.
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < fragmentos.length; i += BATCH_MAX) {
          const lote = fragmentos.slice(i, i + BATCH_MAX);

          const embRes = await fetch(`${baseUrl}/api/rag/embeber`, {
            method : "POST",
            headers: { "Content-Type": "application/json" },
            body   : JSON.stringify({ textos: lote }), // ← array batch
          });

          if (!embRes.ok) {
            const err = await embRes.text();
            return Response.json(
              { error: `Error generando embeddings (lote ${i / BATCH_MAX + 1}): ${err}` },
              { status: 500 }
            );
          }

          const { embeddings } = (await embRes.json()) as { embeddings: number[][] };
          allEmbeddings.push(...embeddings);
        }

        // 5. ── BULK INSERT ────────────────────────────────────────────────────
        // Un solo INSERT con todos los fragmentos en lugar de N inserts
        const filas = fragmentos.map((contenido, i) => ({
          documento_id    : documentoId,
          contenido,
          embedding       : allEmbeddings[i] as unknown as string,
          indice_fragmento: i,
          metadata        : { longitud: contenido.length },
        }));

        const { error: insertError } = await supabase
          .from("fragmentos_normativos")
          .insert(filas);

        if (insertError) {
          return Response.json(
            { error: `Error guardando fragmentos: ${insertError.message}` },
            { status: 500 }
          );
        }

        // 6. Actualizar estado del documento
        await supabase
          .from("documentos_normativos")
          .update({ procesado: true, fragmentos_count: fragmentos.length })
          .eq("id", documentoId);

        return Response.json({
          exito     : true,
          procesados: fragmentos.length,
          total     : fragmentos.length,
          mensaje   : `${fragmentos.length} fragmentos indexados para "${doc.nombre}"`,
        });
      },
    },
  },
});
