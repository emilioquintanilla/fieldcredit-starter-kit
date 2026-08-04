// src/routes/api/rag/consultar.ts
// Agente Normativo con Query Expansion + RAG.
// Usa el cliente Supabase del proyecto (URL hardcodeada en src/lib/supabase.ts).
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type FragmentoFTS = {
  fragmento_id    : string;
  documento_id    : string;
  contenido       : string;
  nombre_documento: string;
  tipo_documento  : string;
};

// ── Paso 1: Groq expande la pregunta a términos técnicos ──────────────────────
async function expandirConsulta(
  pregunta : string,
  groqKey  : string,
  contexto?: string
): Promise<string[]> {
  const prompt = `Eres un experto en microfinanzas y crédito rural en Nicaragua.

Un asesor de campo pregunta: "${pregunta}"
${contexto ? `\nContexto del expediente activo:\n${contexto}` : ""}

Extrae entre 4 y 8 términos o frases técnicas que un manual de crédito nicaragüense usaría para responder esta consulta. Piensa en sinónimos, términos formales y palabras clave del sector financiero.

Responde SOLO con los términos separados por espacio, sin numeración, sin puntuación adicional, en español.
Ejemplo: garantía hipotecaria fiador colateral bien inmueble cobertura monto máximo`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization : `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model      : "llama-3.3-70b-versatile",
        max_tokens : 80,
        temperature: 0.1,
        messages   : [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return extraerPalabrasClave(pregunta);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const texto = data.choices?.[0]?.message?.content?.trim() ?? "";
    const terminos = texto
      .toLowerCase()
      .replace(/[^a-záéíóúüñ\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3)
      .slice(0, 10);
    return terminos.length > 0 ? terminos : extraerPalabrasClave(pregunta);
  } catch {
    return extraerPalabrasClave(pregunta);
  }
}

function extraerPalabrasClave(texto: string): string[] {
  const stop = new Set(["cuál","cuáles","cómo","qué","dónde","para","con","los","las",
    "del","que","son","hay","una","uno","por","como","más","este","esta","pero",
    "cuando","puede","puedo","tiene","tengo","necesito","quiero","saber","sobre"]);
  return texto.toLowerCase().replace(/[^a-záéíóúüñ\s]/g, " ")
    .split(/\s+/).filter((w) => w.length > 3 && !stop.has(w)).slice(0, 6);
}

// ── Paso 2: FTS con términos expandidos ───────────────────────────────────────
async function buscarFragmentos(
  pregunta          : string,
  terminosExpandidos: string[]
): Promise<FragmentoFTS[]> {
  // Intento 1: FTS con pregunta original
  const { data: r1 } = await supabase.rpc("buscar_fragmentos_texto", {
    consulta: pregunta, limite: 6,
  }) as { data: FragmentoFTS[] | null };
  if (r1 && r1.length >= 2) return r1;

  // Intento 2: FTS con cada término expandido
  const mapa = new Map<string, FragmentoFTS>();
  for (const termino of terminosExpandidos.slice(0, 5)) {
    const { data } = await supabase.rpc("buscar_fragmentos_texto", {
      consulta: termino, limite: 3,
    }) as { data: FragmentoFTS[] | null };
    if (data) for (const f of data) if (!mapa.has(f.fragmento_id)) mapa.set(f.fragmento_id, f);
    if (mapa.size >= 6) break;
  }
  if (mapa.size > 0) return Array.from(mapa.values()).slice(0, 6);

  // Intento 3: primeros fragmentos de cada documento (último recurso)
  const { data: r3 } = await supabase
    .from("fragmentos_normativos")
    .select("id, documento_id, contenido, documentos_normativos(nombre, tipo)")
    .eq("indice_fragmento", 0)
    .limit(4) as {
      data: Array<{
        id: string; documento_id: string; contenido: string;
        documentos_normativos: { nombre: string; tipo: string } | null;
      }> | null
    };
  if (r3 && r3.length > 0) {
    return r3.map((row) => ({
      fragmento_id    : row.id,
      documento_id    : row.documento_id,
      contenido       : row.contenido,
      nombre_documento: row.documentos_normativos?.nombre ?? "Manual",
      tipo_documento  : row.documentos_normativos?.tipo ?? "manual",
    }));
  }
  return [];
}

const SISTEMA_NORMATIVO = `Eres el Agente Normativo de MiCrédito, institución de microfinanzas regulada por CONAMI en Nicaragua.

Ayudas a asesores de crédito en campo respondiendo sus dudas sobre políticas, reglamentos y procedimientos internos.

CÓMO RESPONDER:
• Usa español claro y directo — el asesor está en campo con un cliente enfrente.
• Interpreta la pregunta aunque use términos informales o no exactos del manual.
• Basa tu respuesta en los fragmentos del manual proporcionados.
• Si los fragmentos cubren la duda aunque sea parcialmente, usa esa información.
• Si la información no está cubierta, dilo con claridad y sugiere consultar al supervisor.
• Cita el documento fuente al final.
• Máximo 3-4 párrafos concisos y prácticos.
• NUNCA inventes montos, porcentajes ni plazos que no estén en los fragmentos.`;

// ── Route ─────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/api/rag/consultar")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        let pregunta: string;
        let contextoExpediente: string | undefined;

        try {
          const body = (await request.json()) as {
            pregunta           : string;
            contextoExpediente?: string;
          };
          pregunta           = body.pregunta?.trim();
          contextoExpediente = body.contextoExpediente;
        } catch {
          return Response.json(
            { exito: false, respuesta: "", fuentes: [], error: "JSON inválido" },
            { status: 400 }
          );
        }

        if (!pregunta) {
          return Response.json(
            { exito: false, respuesta: "", fuentes: [], error: "La pregunta es requerida" },
            { status: 400 }
          );
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
          return Response.json(
            { exito: false, respuesta: "", fuentes: [], error: "GROQ_API_KEY no configurada" },
            { status: 500 }
          );
        }

        // Paso 1: Expandir consulta
        const terminosExpandidos = await expandirConsulta(pregunta, groqKey, contextoExpediente);

        // Paso 2: Buscar fragmentos
        const fragmentos = await buscarFragmentos(pregunta, terminosExpandidos);

        // Paso 3: Generar respuesta con Groq
        const contextoNormativo = fragmentos.length === 0
          ? "(No se encontraron fragmentos en los documentos cargados.)"
          : fragmentos.map((f, i) =>
              `--- Fragmento ${i + 1} · ${f.nombre_documento} ---\n${f.contenido}`
            ).join("\n\n");

        const contextoAdicional = contextoExpediente
          ? `\nCONTEXTO DEL EXPEDIENTE:\n${contextoExpediente}\n`
          : "";

        const mensajeUsuario = `${contextoAdicional}
PREGUNTA DEL ASESOR: ${pregunta}
TÉRMINOS TÉCNICOS IDENTIFICADOS: ${terminosExpandidos.join(", ")}

FRAGMENTOS NORMATIVOS:
${contextoNormativo}

Responde la duda del asesor de forma clara y práctica. Basa tu respuesta en los fragmentos normativos y cita el documento al final.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization : `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model      : "llama-3.3-70b-versatile",
            max_tokens : 700,
            temperature: 0.3,
            messages   : [
              { role: "system", content: SISTEMA_NORMATIVO },
              { role: "user",   content: mensajeUsuario },
            ],
          }),
        });

        if (!groqRes.ok) {
          const err = await groqRes.text();
          return Response.json(
            { exito: false, respuesta: "", fuentes: [], error: `Error del modelo: ${err}` },
            { status: 500 }
          );
        }

        const groqData = (await groqRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const respuesta = groqData.choices?.[0]?.message?.content ?? "";

        const fuentesMap = new Map<string, { nombre: string; tipo: string; fragmento_id: string }>();
        for (const f of fragmentos) {
          if (!fuentesMap.has(f.nombre_documento)) {
            fuentesMap.set(f.nombre_documento, {
              nombre: f.nombre_documento, tipo: f.tipo_documento, fragmento_id: f.fragmento_id,
            });
          }
        }

        return Response.json({
          exito  : true,
          respuesta,
          fuentes: Array.from(fuentesMap.values()),
        });
      },
    },
  },
});
