// src/routes/api/rag/procesar.ts
// Procesa un documento: chunking → bulk INSERT de fragmentos de texto.
// SIN embeddings externos — usa FTS (full-text search) de PostgreSQL.
// Mucho más rápido y sin dependencias externas.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const CHUNK_SIZE   = 800;
const CHUNK_SOLAPE = 150;

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

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          return Response.json(
            { error: "Variables de entorno Supabase no configuradas" },
            { status: 500 }
          );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Borrar fragmentos anteriores
        await supabase
          .from("fragmentos_normativos")
          .delete()
          .eq("documento_id", documentoId);

        // 2. Chunkear texto
        const fragmentos = chunkearTexto(contenidoTexto);
        if (fragmentos.length === 0) {
          return Response.json(
            { error: "El texto no produjo fragmentos válidos" },
            { status: 422 }
          );
        }

        // 3. Bulk INSERT — sin embeddings, solo texto plano
        const filas = fragmentos.map((contenido, i) => ({
          documento_id    : documentoId,
          contenido,
          indice_fragmento: i,
          metadata        : { longitud: contenido.length },
          // embedding queda NULL — la búsqueda usa FTS nativo de PostgreSQL
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

        // 4. Actualizar estado del documento
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
