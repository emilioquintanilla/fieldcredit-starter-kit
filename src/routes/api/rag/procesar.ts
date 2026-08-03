// src/routes/api/rag/api_rag_procesar.ts
// Procesa un documento normativo: chunking → batch embedding → bulk INSERT.
// El texto llega directamente en el body — no necesita leerlo de Supabase,
// lo que elimina la dependencia de SUPABASE_SERVICE_ROLE_KEY para la lectura.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const CHUNK_SIZE   = 800;
const CHUNK_SOLAPE = 150;
const BATCH_MAX    = 50;

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

export const Route = createFileRoute("/api/rag/procesar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let documentoId: string;
        let contenidoTexto: string;

        try {
          const body = (await request.json()) as {
            documento_id   : string;
            contenido_texto: string;
          };
          documentoId    = body.documento_id;
          contenidoTexto = body.contenido_texto;
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        if (!documentoId) {
          return Response.json({ error: "documento_id requerido" }, { status: 400 });
        }

        if (!contenidoTexto?.trim()) {
          return Response.json({ error: "contenido_texto vacío" }, { status: 422 });
        }

        // Supabase solo para INSERT de fragmentos (no para leer el documento)
        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          return Response.json(
            { error: "Variables de entorno de Supabase no configuradas" },
            { status: 500 }
          );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const baseUrl  = new URL(request.url).origin;

        // 1. Borrar fragmentos anteriores
        await supabase
          .from("fragmentos_normativos")
          .delete()
          .eq("documento_id", documentoId);

        // 2. Chunkear
        const fragmentos = chunkearTexto(contenidoTexto);

        if (fragmentos.length === 0) {
          return Response.json({ error: "El texto no produjo fragmentos válidos" }, { status: 422 });
        }

        // 3. Batch embedding
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < fragmentos.length; i += BATCH_MAX) {
          const lote = fragmentos.slice(i, i + BATCH_MAX);

          const embRes = await fetch(`${baseUrl}/api/rag/embeber`, {
            method : "POST",
            headers: { "Content-Type": "application/json" },
            body   : JSON.stringify({ textos: lote }),
          });

          if (!embRes.ok) {
            const err = await embRes.text();
            return Response.json(
              { error: `Error generando embeddings: ${err}` },
              { status: 500 }
            );
          }

          const { embeddings } = (await embRes.json()) as { embeddings: number[][] };
          allEmbeddings.push(...embeddings);
        }

        // 4. Bulk INSERT de fragmentos
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

        // 5. Actualizar estado del documento
        await supabase
          .from("documentos_normativos")
          .update({ procesado: true, fragmentos_count: fragmentos.length })
          .eq("id", documentoId);

        return Response.json({
          exito     : true,
          procesados: fragmentos.length,
          total     : fragmentos.length,
          mensaje   : `${fragmentos.length} fragmentos indexados correctamente`,
        });
      },
    },
  },
});
