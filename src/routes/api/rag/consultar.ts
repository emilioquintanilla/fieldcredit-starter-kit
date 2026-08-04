// src/routes/api/rag/consultar.ts
// Agente Normativo con Query Expansion + RAG
//
// Flujo de dos pasos con Groq (sin APIs externas):
//   1. Groq expande la pregunta del asesor a términos técnicos del manual
//   2. PostgreSQL FTS busca fragmentos con esos términos
//   3. Groq genera la respuesta en lenguaje natural con los fragmentos
//
// Esto resuelve el problema de que el asesor no conoce los términos exactos
// del manual — Groq hace el puente entre lenguaje cotidiano y lenguaje técnico.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type FragmentoFTS = {
  fragmento_id    : string;
  documento_id    : string;
  contenido       : string;
  nombre_documento: string;
  tipo_documento  : string;
};

// ── Paso 1: Expandir la pregunta a términos técnicos ──────────────────────────
async function expandirConsulta(
  pregunta  : string,
  groqKey   : string,
  contexto? : string
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

// Extracción básica de palabras clave como fallback
function extraerPalabrasClave(texto: string): string[] {
  const stopwords = new Set([
    "cuál","cuáles","cómo","qué","dónde","cuándo","cuánto","para","con",
    "los","las","del","que","son","hay","una","uno","por","como","más",
    "este","esta","estos","estas","pero","cuando","puede","puedo","tiene",
    "tengo","necesito","quiero","saber","sobre","acerca","quisiera","duda",
  ]);
  return texto
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w))
    .slice(0, 6);
}

// ── Paso 2: Búsqueda FTS con términos expandidos ──────────────────────────────
async function buscarFragmentos(
  supabase    : ReturnType<typeof createClient>,
  preguntaOriginal: string,
  terminosExpandidos: string[]
): Promise<FragmentoFTS[]> {

  // Intento 1: FTS con la pregunta original completa
  const { data: r1 } = await supabase.rpc("buscar_fragmentos_texto", {
    consulta: preguntaOriginal,
    limite  : 6,
  }) as { data: FragmentoFTS[] | null };

  if (r1 && r1.length >= 2) return r1;

  // Intento 2: FTS con cada término expandido (OR implícito por múltiples llamadas)
  const resultados = new Map<string, FragmentoFTS>();

  for (const termino of terminosExpandidos.slice(0, 5)) {
    const { data } = await supabase.rpc("buscar_fragmentos_texto", {
      consulta: termino,
      limite  : 3,
    }) as { data: FragmentoFTS[] | null };

    if (data) {
      for (const f of data) {
        if (!resultados.has(f.fragmento_id)) {
          resultados.set(f.fragmento_id, f);
        }
      }
    }
    if (resultados.size >= 6) break;
  }

  if (resultados.size > 0) return Array.from(resultados.values()).slice(0, 6);

  // Intento 3: Recuperar fragmentos aleatorios de todos los documentos
  // (último recurso: la IA puede al menos indicar qué documentos existen)
  const { data: r3 } = await supabase
    .from("fragmentos_normativos")
    .select("id, documento_id, contenido, documentos_normativos(nombre, tipo)")
    .eq("indice_fragmento", 0) // primer fragmento de cada documento
    .limit(4) as { data: Array<{
      id: string;
      documento_id: string;
      contenido: string;
      documentos_normativos: { nombre: string; tipo: string } | null;
    }> | null };

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

// ── Prompt de respuesta final ─────────────────────────────────────────────────
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
            pregunta          : string;
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

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
        const groqKey     = process.env.GROQ_API_KEY;

        if (!supabaseUrl || !supabaseKey || !groqKey) {
          return Response.json(
            { exito: false, respuesta: "", fuentes: [], error: "Variables de entorno no configuradas" },
            { status: 500 }
          );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // ── PASO 1: Expandir la consulta con Groq ─────────────────────────────
        const terminosExpandidos = await expandirConsulta(
          pregunta,
          groqKey,
          contextoExpediente
        );

        // ── PASO 2: Buscar fragmentos relevantes (FTS multi-término) ──────────
        const fragmentos = await buscarFragmentos(supabase, pregunta, terminosExpandidos);

        // ── PASO 3: Generar respuesta con Groq ────────────────────────────────
        let contextoNormativo: string;

        if (fragmentos.length === 0) {
          contextoNormativo = "(No se encontraron fragmentos relevantes en los documentos cargados.)";
        } else {
          contextoNormativo = fragmentos
            .map((f, i) =>
              `--- Fragmento ${i + 1} · ${f.nombre_documento} (${f.tipo_documento}) ---\n${f.contenido}`
            )
            .join("\n\n");
        }

        const contextoAdicional = contextoExpediente
          ? `\nCONTEXTO DEL EXPEDIENTE ACTIVO:\n${contextoExpediente}\n`
          : "";

        const mensajeUsuario = `${contextoAdicional}
PREGUNTA DEL ASESOR (lenguaje natural):
${pregunta}

TÉRMINOS TÉCNICOS IDENTIFICADOS:
${terminosExpandidos.join(", ")}

FRAGMENTOS NORMATIVOS RECUPERADOS:
${contextoNormativo}

Responde la duda del asesor de forma clara y práctica, interpretando su pregunta aunque no use los términos exactos del manual. Basa tu respuesta en los fragmentos normativos proporcionados y cita el documento al final.`;

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

        // Deduplicar fuentes
        const fuentesMap = new Map<string, {
          nombre: string; tipo: string; fragmento_id: string;
        }>();
        for (const f of fragmentos) {
          if (!fuentesMap.has(f.nombre_documento)) {
            fuentesMap.set(f.nombre_documento, {
              nombre      : f.nombre_documento,
              tipo        : f.tipo_documento,
              fragmento_id: f.fragmento_id,
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
