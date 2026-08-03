// src/routes/api/rag/procesar.ts
// Toma el texto de un documento_normativo, lo divide en fragmentos,
// genera embeddings para cada uno y los guarda en fragmentos_normativos.
// Usa SUPABASE_SERVICE_ROLE_KEY para escribir sin restricción de RLS.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// ── Chunking ──────────────────────────────────────────────────────────────────
// Tamaño: ~800 caracteres / Solapamiento: 150 caracteres
// Divide respetando saltos de párrafo cuando es posible.
function chunkearTexto(texto: string, tamano = 800, solape = 150): string[] {
  const parrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const fragmentos: string[] = [];
  let buffer = "";

  for (const parrafo of parrafos) {
    if (buffer.length + parrafo.length + 2 <= tamano) {
      buffer = buffer ? `${buffer}\n\n${parrafo}` : parrafo;
    } else {
      if (buffer) {
        fragmentos.push(buffer.trim());
        // Solapamiento: conserva las últimas `solape` caracteres del fragmento anterior
        buffer = buffer.slice(-solape) + "\n\n" + parrafo;
      } else {
        // Párrafo muy largo: partir por caracteres
        let inicio = 0;
        while (inicio < parrafo.length) {
          fragmentos.push(parrafo.slice(inicio, inicio + tamano).trim());
          inicio += tamano - solape;
        }
        buffer = "";
      }
    }
  }
  if (buffer.trim()) fragmentos.push(buffer.trim());

  return fragmentos.filter((f) => f.length > 30);
}

// ── Route ─────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/api/rag/api_rag_procesar")({
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

        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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

        if (docError || !doc) {
          return Response.json({ error: "Documento no encontrado" }, { status: 404 });
        }

        if (!doc.contenido_texto) {
          return Response.json({ error: "El documento no tiene texto para procesar" }, { status: 422 });
        }

        // 2. Borrar fragmentos anteriores (reprocesamiento)
        await supabase
          .from("fragmentos_normativos")
          .delete()
          .eq("documento_id", documentoId);

        // 3. Chunkear el texto
        const fragmentos = chunkearTexto(doc.contenido_texto);
        const baseUrl    = new URL(request.url).origin;

        let procesados = 0;
        const errores: string[] = [];

        // 4. Generar embedding para cada fragmento y guardar
        for (let i = 0; i < fragmentos.length; i++) {
          const fragmento = fragmentos[i];

          try {
            // Llamar al propio endpoint de embedding (reutiliza lógica + rate limiting)
            const embRes = await fetch(`${baseUrl}/api/rag/embeber`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ texto: fragmento }),
            });

            if (!embRes.ok) {
              const err = await embRes.text();
              throw new Error(`Embedding falló para fragmento ${i}: ${err}`);
            }

            const { embedding } = (await embRes.json()) as { embedding: number[] };

            await supabase.from("fragmentos_normativos").insert({
              documento_id     : documentoId,
              contenido        : fragmento,
              embedding        : embedding as unknown as string, // pgvector acepta array
              indice_fragmento : i,
              metadata         : { longitud: fragmento.length },
            });

            procesados++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errores.push(msg);
            console.error("[RAG/procesar] Fragmento", i, msg);
          }

          // Pausa breve entre llamadas a HuggingFace para respetar rate limit
          if (i < fragmentos.length - 1) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        // 5. Actualizar estado del documento
        await supabase
          .from("documentos_normativos")
          .update({
            procesado       : procesados > 0,
            fragmentos_count: procesados,
          })
          .eq("id", documentoId);

        return Response.json({
          exito     : procesados > 0,
          procesados,
          total     : fragmentos.length,
          errores   : errores.length > 0 ? errores : undefined,
          mensaje   : `${procesados} de ${fragmentos.length} fragmentos indexados para "${doc.nombre}"`,
        });
      },
    },
  },
});
