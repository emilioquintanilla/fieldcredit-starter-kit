// src/routes/api/rag/consultar.ts
// Consulta normativa con RAG:
//   1. Embed la pregunta del asesor
//   2. Busca los fragmentos más similares en pgvector
//   3. Construye el contexto normativo
//   4. Llama a Groq para generar la respuesta con citas
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type Fragmento = {
  fragmento_id   : string;
  documento_id   : string;
  contenido      : string;
  nombre_documento: string;
  tipo_documento : string;
  similaridad    : number;
};

type RespuestaConsulta = {
  exito     : boolean;
  respuesta : string;
  fuentes   : Array<{ nombre: string; tipo: string; fragmento_id: string }>;
  error?    : string;
};

const SISTEMA_NORMATIVO = `Eres el Asistente Normativo de MiCrédito, una institución de microfinanzas regulada por CONAMI en Nicaragua.

Tu función es responder consultas de asesores de crédito sobre políticas, reglamentos y manuales internos de MiCrédito, basándote EXCLUSIVAMENTE en el contenido normativo proporcionado.

REGLAS:
• Responde en español formal pero claro y directo — el asesor está en campo.
• Cita siempre la fuente (nombre del documento) al final de tu respuesta.
• Si la información no está en los fragmentos normativos, dilo explícitamente: "Esta consulta no está cubierta en los documentos disponibles."
• NO inventes políticas ni porcentajes. Si no está en los fragmentos, no lo afirmes.
• Para excepciones y casos especiales, indica que debe consultar con el supervisor.
• Sé conciso: máximo 3-4 párrafos. El asesor necesita respuestas prácticas y rápidas.`;

export const Route = createFileRoute("/api/rag/consultar")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        let pregunta: string;
        let contextoExpediente: string | undefined;

        try {
          const body = (await request.json()) as {
            pregunta          : string;
            contextoExpediente?: string;
          };
          pregunta           = body.pregunta?.trim();
          contextoExpediente = body.contextoExpediente;
        } catch {
          return Response.json({ exito: false, respuesta: "", fuentes: [], error: "JSON inválido" }, { status: 400 });
        }

        if (!pregunta) {
          return Response.json({ exito: false, respuesta: "", fuentes: [], error: "La pregunta es requerida" }, { status: 400 });
        }

        const baseUrl      = new URL(request.url).origin;
        const supabaseUrl  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const groqKey      = process.env.GROQ_API_KEY;

        if (!supabaseUrl || !serviceKey || !groqKey) {
          return Response.json(
            { exito: false, respuesta: "", fuentes: [], error: "Variables de entorno del servidor no configuradas" },
            { status: 500 }
          );
        }

        const supabase = createClient(supabaseUrl, serviceKey);

        // 1. Generar embedding de la pregunta
        const embRes = await fetch(`${baseUrl}/api/rag/embeber`, {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ texto: pregunta }),
        });

        if (!embRes.ok) {
          return Response.json(
            { exito: false, respuesta: "", fuentes: [], error: "Error generando embedding de la pregunta" },
            { status: 500 }
          );
        }

        const { embedding } = (await embRes.json()) as { embedding: number[] };

        // 2. Buscar fragmentos similares en pgvector
        const { data: fragmentos, error: rpcError } = await supabase.rpc("buscar_fragmentos", {
          query_embedding: embedding,
          limite         : 5,
          similitud_min  : 0.25,
        }) as { data: Fragmento[] | null; error: unknown };

        if (rpcError || !fragmentos || fragmentos.length === 0) {
          const respuestaVacia: RespuestaConsulta = {
            exito    : true,
            respuesta: "No encontré información relacionada en los documentos normativos disponibles. Te recomiendo consultar directamente con el área de riesgos o con tu supervisor.",
            fuentes  : [],
          };
          return Response.json(respuestaVacia);
        }

        // 3. Construir contexto normativo con los fragmentos recuperados
        const contextoNormativo = fragmentos
          .map((f, i) =>
            `--- Fragmento ${i + 1} (${f.nombre_documento} · ${f.tipo_documento}) ---\n${f.contenido}`
          )
          .join("\n\n");

        // 4. Construir el prompt con contexto del expediente si aplica
        const contextoAdicional = contextoExpediente
          ? `\nCONTEXTO DEL EXPEDIENTE ACTIVO:\n${contextoExpediente}\n`
          : "";

        const mensajeUsuario = `${contextoAdicional}
DOCUMENTOS NORMATIVOS DISPONIBLES:
${contextoNormativo}

CONSULTA DEL ASESOR:
${pregunta}

Responde basándote únicamente en los fragmentos normativos anteriores. Cita el documento fuente al final.`;

        // 5. Llamar a Groq para generar la respuesta
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization : `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model      : "llama-3.3-70b-versatile",
            max_tokens : 600,
            temperature: 0.2,
            messages   : [
              { role: "system", content: SISTEMA_NORMATIVO },
              { role: "user"  , content: mensajeUsuario },
            ],
          }),
        });

        if (!groqRes.ok) {
          const err = await groqRes.text();
          console.error("[RAG/consultar] Groq error:", err);
          return Response.json(
            { exito: false, respuesta: "", fuentes: [], error: `Error del modelo de IA: ${groqRes.status}` },
            { status: 500 }
          );
        }

        const groqData = (await groqRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const respuesta = groqData.choices?.[0]?.message?.content ?? "";

        // 6. Deduplicar fuentes
        const fuentesMap = new Map<string, { nombre: string; tipo: string; fragmento_id: string }>();
        for (const f of fragmentos) {
          if (!fuentesMap.has(f.nombre_documento)) {
            fuentesMap.set(f.nombre_documento, {
              nombre      : f.nombre_documento,
              tipo        : f.tipo_documento,
              fragmento_id: f.fragmento_id,
            });
          }
        }

        const resultado: RespuestaConsulta = {
          exito    : true,
          respuesta,
          fuentes  : Array.from(fuentesMap.values()),
        };

        return Response.json(resultado);
      },
    },
  },
});
