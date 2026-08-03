// src/routes/api/rag/embeber.ts
// Genera embeddings con sentence-transformers/all-MiniLM-L6-v2 (HuggingFace).
// Acepta texto único o array para batch.
// Endpoint actualizado: /models/ (el /pipeline/ está deprecado)
import { createFileRoute } from "@tanstack/react-router";

const HF_MODEL   = "sentence-transformers/all-MiniLM-L6-v2";
const HF_URL     = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const MAX_CHARS  = 2000;
const MAX_REINTENTOS = 3;
const ESPERA_BASE_MS = 1500;

// Reintento con backoff exponencial para errores temporales (503, 530)
async function fetchConReintento(url: string, options: RequestInit): Promise<Response> {
  let ultimo_error: Error = new Error("Sin respuesta");
  for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
    if (intento > 0) {
      await new Promise((r) => setTimeout(r, ESPERA_BASE_MS * Math.pow(2, intento - 1)));
    }
    try {
      const res = await fetch(url, options);
      // Reintentar solo en errores temporales del servidor
      if (res.status === 503 || res.status === 530 || res.status === 529) {
        const texto = await res.text();
        ultimo_error = new Error(`HuggingFace ${res.status}: ${texto}`);
        continue;
      }
      return res;
    } catch (err) {
      ultimo_error = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw ultimo_error;
}

export const Route = createFileRoute("/api/rag/embeber")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let inputs: string | string[];
        let esBatch = false;

        try {
          const body = (await request.json()) as { texto?: string; textos?: string[] };
          if (body.textos && Array.isArray(body.textos) && body.textos.length > 0) {
            inputs  = body.textos.map((t) => t.slice(0, MAX_CHARS));
            esBatch = true;
          } else if (body.texto) {
            inputs = body.texto.slice(0, MAX_CHARS);
          } else {
            return Response.json(
              { error: "Se requiere 'texto' (string) o 'textos' (array no vacío)" },
              { status: 400 }
            );
          }
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        const token = process.env.HF_TOKEN;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
          const res = await fetchConReintento(HF_URL, {
            method : "POST",
            headers,
            body   : JSON.stringify({
              inputs,
              options: { wait_for_model: true, use_cache: true },
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            return Response.json(
              { error: `HuggingFace ${res.status}: ${err}` },
              { status: 502 }
            );
          }

          const data = (await res.json()) as number[] | number[][];

          if (esBatch) {
            // Batch: el modelo devuelve number[][] directamente
            let embeddings: number[][];
            if (Array.isArray(data[0])) {
              embeddings = data as number[][];
            } else {
              // Modelo devolvió un solo vector — envolver en array
              embeddings = [data as number[]];
            }

            if (embeddings[0]?.length !== 384) {
              return Response.json(
                { error: `Dimensión incorrecta: ${embeddings[0]?.length ?? 0} (esperado 384)` },
                { status: 502 }
              );
            }
            return Response.json({ embeddings });
          }

          // Single: puede venir como number[] o number[][]
          const embedding = Array.isArray(data[0])
            ? (data as number[][])[0]
            : (data as number[]);

          if (embedding?.length !== 384) {
            return Response.json(
              { error: `Dimensión incorrecta: ${embedding?.length ?? 0} (esperado 384)` },
              { status: 502 }
            );
          }
          return Response.json({ embedding });

        } catch (error) {
          const msg = error instanceof Error ? error.message : "Error desconocido";
          console.error("[RAG/embeber]", msg);
          return Response.json({ error: msg }, { status: 502 });
        }
      },
    },
  },
});
