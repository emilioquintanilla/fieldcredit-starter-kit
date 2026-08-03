// src/routes/api/rag/embeber.ts
// Genera embeddings con sentence-transformers/all-MiniLM-L6-v2 (HuggingFace).
// Acepta un texto único O un array de textos para procesamiento en batch.
// Un solo array de 40 textos tarda lo mismo que 1 texto individual.
import { createFileRoute } from "@tanstack/react-router";

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_URL   = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;
const MAX_CHARS = 2000; // límite por fragmento (~512 tokens)

export const Route = createFileRoute("/api/rag/embeber")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let inputs: string | string[];
        try {
          const body = (await request.json()) as { texto?: string; textos?: string[] };
          // Acepta { texto: "..." } para una sola entrada
          // o    { textos: ["...", "..."] } para batch
          if (body.textos && Array.isArray(body.textos)) {
            inputs = body.textos.map((t) => t.slice(0, MAX_CHARS));
          } else if (body.texto) {
            inputs = body.texto.slice(0, MAX_CHARS);
          } else {
            return Response.json(
              { error: "Se requiere 'texto' (string) o 'textos' (array)" },
              { status: 400 }
            );
          }
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        const token = process.env.HF_TOKEN;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
          const res = await fetch(HF_URL, {
            method : "POST",
            headers,
            body   : JSON.stringify({
              inputs,
              options: { wait_for_model: true },
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            throw new Error(`HuggingFace ${res.status}: ${err}`);
          }

          const data = (await res.json()) as number[] | number[][];

          // Batch: devuelve number[][]
          if (Array.isArray(inputs)) {
            const embeddings = data as number[][];
            if (!embeddings[0] || embeddings[0].length !== 384) {
              throw new Error(`Embedding batch inválido: dim ${embeddings[0]?.length ?? 0}`);
            }
            return Response.json({ embeddings });
          }

          // Single: devuelve number[] o number[][]
          const embedding = Array.isArray(data[0])
            ? (data as number[][])[0]
            : (data as number[]);
          if (!embedding || embedding.length !== 384) {
            throw new Error(`Embedding inválido: dim ${embedding?.length ?? 0}`);
          }
          return Response.json({ embedding });

        } catch (error) {
          const msg = error instanceof Error ? error.message : "Error desconocido";
          console.error("[RAG/embeber]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
