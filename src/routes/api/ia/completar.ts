// Endpoint del servidor para llamadas a IA (multi-proveedor: Groq / Claude / OpenAI).
// Las API keys viven solo en variables de entorno del servidor; nunca en el cliente.
import { createFileRoute } from "@tanstack/react-router";

type Mensaje = { role: "user" | "assistant" | "system"; content: string };
type Body = {
  proveedor: "groq" | "claude" | "openai";
  modelo?: string;
  sistema: string;
  mensajes: Mensaje[];
  maxTokens?: number;
};

export const Route = createFileRoute("/api/ia/completar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ exito: false, texto: "", error: "JSON inválido" }, { status: 400 });
        }

        const { proveedor, modelo, sistema, mensajes, maxTokens = 800 } = body;
        if (!proveedor || !sistema || !Array.isArray(mensajes)) {
          return Response.json({ exito: false, texto: "", error: "Faltan campos" }, { status: 400 });
        }

        try {
          let texto = "";

          if (proveedor === "groq") {
            const key = process.env.GROQ_API_KEY;
            if (!key) throw new Error("GROQ_API_KEY no configurado en el servidor.");
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify({
                model: modelo || "llama-3.3-70b-versatile",
                max_tokens: maxTokens,
                messages: [{ role: "system", content: sistema }, ...mensajes],
              }),
            });
            const data = (await res.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
              error?: { message?: string };
            };
            if (!res.ok) throw new Error(data.error?.message || `Groq ${res.status}`);
            texto = data.choices?.[0]?.message?.content ?? "";
          } else if (proveedor === "claude") {
            const key = process.env.ANTHROPIC_API_KEY;
            if (!key) throw new Error("ANTHROPIC_API_KEY no configurado.");
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: modelo || "claude-3-5-sonnet-latest",
                max_tokens: maxTokens,
                system: sistema,
                messages: mensajes,
              }),
            });
            const data = (await res.json()) as {
              content?: Array<{ text?: string }>;
              error?: { message?: string };
            };
            if (!res.ok) throw new Error(data.error?.message || `Claude ${res.status}`);
            texto = data.content?.[0]?.text ?? "";
          } else if (proveedor === "openai") {
            const key = process.env.OPENAI_API_KEY;
            if (!key) throw new Error("OPENAI_API_KEY no configurado.");
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify({
                model: modelo || "gpt-4o-mini",
                max_tokens: maxTokens,
                messages: [{ role: "system", content: sistema }, ...mensajes],
              }),
            });
            const data = (await res.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
              error?: { message?: string };
            };
            if (!res.ok) throw new Error(data.error?.message || `OpenAI ${res.status}`);
            texto = data.choices?.[0]?.message?.content ?? "";
          } else {
            return Response.json(
              { exito: false, texto: "", error: `Proveedor no soportado: ${proveedor}` },
              { status: 400 },
            );
          }

          return Response.json({ exito: true, texto });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Error desconocido";
          console.error("[IA]", msg);
          return Response.json({ exito: false, texto: "", error: msg }, { status: 500 });
        }
      },
    },
  },
});
