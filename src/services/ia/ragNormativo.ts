// src/services/ia/ragNormativo.ts
// Servicio cliente para el Agente Normativo (Fase 3 — RAG).
// Llama a las API routes del servidor — las claves nunca tocan el cliente.

export interface FuenteNormativa {
  nombre      : string;
  tipo        : string;
  fragmento_id: string;
}

export interface RespuestaNormativa {
  respuesta: string;
  fuentes  : FuenteNormativa[];
}

export async function consultarNormativa(
  pregunta          : string,
  contextoExpediente?: string
): Promise<RespuestaNormativa> {
  const res = await fetch("/api/rag/api_rag_consultar", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ pregunta, contextoExpediente }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Error ${res.status}`);
  }

  const data = await res.json() as {
    exito    : boolean;
    respuesta: string;
    fuentes  : FuenteNormativa[];
    error?   : string;
  };

  if (!data.exito) throw new Error(data.error || "Error en la consulta normativa");
  return { respuesta: data.respuesta, fuentes: data.fuentes };
}

// contenidoTexto se pasa directamente para evitar que el servidor
// tenga que releerlo de Supabase (elimina dependencia de SUPABASE_SERVICE_ROLE_KEY
// para la lectura del documento)
export async function procesarDocumento(
  documentoId    : string,
  contenidoTexto : string
): Promise<{ procesados: number; total: number; mensaje: string }> {
  const res = await fetch("/api/rag/api_rag_procesar", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({
      documento_id   : documentoId,
      contenido_texto: contenidoTexto,   // texto directo — sin lectura de DB
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}
