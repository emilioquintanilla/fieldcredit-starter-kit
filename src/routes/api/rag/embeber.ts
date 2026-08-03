// src/routes/api/rag/embeber.ts
// Genera embeddings usando sentence-transformers/all-MiniLM-L6-v2 (HuggingFace, gratuito).
// El HF_TOKEN vive solo en el servidor — nunca expuesto al cliente.
import { createFileRoute } from "@tanstack/react-router";

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_URL   = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

export const Route = createFileRoute("/api/rag/embeber")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let texto: string;
        try {
          const body = (await request.json()) as { texto: string };
          texto = body.texto?.trim();
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        if (!texto) {
          return Response.json({ error: "El campo 'texto' es requerido" }, { status: 400 });
        }

        // Limitar texto a 512 tokens (≈ 2000 caracteres) — límite del modelo
        const textoTruncado = texto.slice(0, 2000);

        const token = process.env.HF_TOKEN;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
          const res = await fetch(HF_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
              inputs: textoTruncado,
              options: { wait_for_model: true },
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            throw new Error(`HuggingFace ${res.status}: ${err}`);
          }

          const data = await res.json() as number[] | number[][];

          // El modelo puede devolver un array de arrays (una por cada texto de entrada)
          // o un array plano cuando se pasa un solo string.
          const embedding = Array.isArray(data[0]) ? (data as number[][])[0] : (data as number[]);

          if (!embedding || embedding.length !== 384) {
            throw new Error(`Embedding inválido: dimensión ${embedding?.length ?? 0}`);
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
