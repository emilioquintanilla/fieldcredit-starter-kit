// src/hooks/useDictamen.ts

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { llamarIA, MODELOS, PROVEEDOR_ACTIVO } from "@/services/ia/adaptadorIA";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ItemFlujoCaja {
  tipo: "ingreso" | "egreso";
  monto_mensual?: number;
  concepto?: string;
}

interface Garantia {
  tipo: string;
  descripcion: string;
  valor_estimado?: number;
}

interface Fiador {
  nombre_completo?: string;
  nombre?: string;
  ingreso_mensual?: number;
}

interface Solicitud {
  id: number;                      // INTEGER — coincide con solicitudes.id
  nombre_cliente?: string;
  cedula?: string;
  telefono?: string;
  municipio?: string;
  departamento?: string;
  actividad_economica?: string;
  anos_experiencia?: number | string;
  linea_producto?: string;
  destino_credito?: string;
  monto_solicitado?: number;
  plazo_meses?: number;
  frecuencia_pago?: string;
  cuota_estimada?: number;
}

interface DictamenMeta {
  modelo_ia: string;
  proveedor: string;
  generado_en: string;
  editado_por_asesor: boolean;
  numero_dictamen?: string;
}

interface DictamenCompleto {
  datos_cliente: {
    nombre: string;
    cedula: string;
    telefono: string;
    municipio: string;
    departamento: string;
    actividad: string;
    anos_experiencia: string | number;
  };
  solicitud_credito: {
    linea_producto: string;
    monto_solicitado: number;
    plazo_meses: number;
    frecuencia_pago: string;
    destino_credito: string;
    cuota_estimada: number;
  };
  financiero_datos: {
    ingresos_mensuales: number;
    egresos_mensuales: number;
    capacidad_pago_neta: number;
    indice_cobertura: number | null;
  };
  garantias: Garantia[];
  fiadores: Fiador[];
  descripcion_actividad: { narrativa: string };
  analisis_financiero: { narrativa: string; observaciones: string };
  solicitud_justificacion: string;
  analisis_riesgo: {
    factores_positivos: string[];
    factores_de_atencion: string[];
    nivel_riesgo_sugerido: "Bajo" | "Medio" | "Alto";
    observaciones: string;
  };
  recomendacion: {
    decision_sugerida: string;
    condiciones_propuestas: string;
    observaciones_comite: string;
  };
  _meta: DictamenMeta;
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function calcularTotales(flujo: ItemFlujoCaja[]) {
  const ingresos = flujo
    .filter((i) => i.tipo === "ingreso")
    .reduce((s, i) => s + (Number(i.monto_mensual) || 0), 0);
  const egresos = flujo
    .filter((i) => i.tipo === "egreso")
    .reduce((s, i) => s + (Number(i.monto_mensual) || 0), 0);
  return { ingresos, egresos, neto: ingresos - egresos };
}

function fmtNIO(monto?: number | null) {
  return `C$ ${Number(monto || 0).toLocaleString("es-NI", { minimumFractionDigits: 0 })}`;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(
  solicitud: Solicitud,
  flujo: ItemFlujoCaja[],
  garantias: Garantia[],
  fiadores: Fiador[]
): string {
  const { ingresos, egresos, neto } = calcularTotales(flujo);
  const cuota = Number(solicitud.cuota_estimada) || 0;
  const indice = cuota > 0 ? (neto / cuota).toFixed(2) : null;

  const txtGarantias =
    garantias.length > 0
      ? garantias.map((g) => `• ${g.tipo}: ${g.descripcion}, valor estimado ${fmtNIO(g.valor_estimado)}`).join("\n")
      : "• No se registraron garantías";

  const txtFiadores =
    fiadores.length > 0
      ? fiadores.map((f) => `• ${f.nombre_completo || f.nombre}, ingreso mensual ${fmtNIO(f.ingreso_mensual)}`).join("\n")
      : "• Sin fiadores registrados";

  return `Eres un analista de crédito senior de MiCrédito, institución de microfinanzas regulada por CONAMI en Nicaragua, especializada en productores rurales del Corredor Seco (Teustepe, Estelí, Jinotega y zonas similares).

Redacta el borrador de un dictamen técnico de crédito basándote EXCLUSIVAMENTE en los datos del expediente. No inventes datos ni asumas información no proporcionada.

=== EXPEDIENTE ===
Nombre               : ${solicitud.nombre_cliente || "No especificado"}
Cédula               : ${solicitud.cedula || "No especificada"}
Municipio/Depto.     : ${solicitud.municipio || ""}, ${solicitud.departamento || ""}
Actividad económica  : ${solicitud.actividad_economica || "No especificada"}
Tiempo en actividad  : ${solicitud.anos_experiencia ? solicitud.anos_experiencia + " años" : "No especificado"}
Línea AgroResilia    : ${solicitud.linea_producto || "No especificada"}
Destino del crédito  : ${solicitud.destino_credito || "No especificado"}

=== SOLICITUD ===
Monto solicitado  : ${fmtNIO(solicitud.monto_solicitado)}
Plazo             : ${solicitud.plazo_meses || 0} meses
Frecuencia de pago: ${solicitud.frecuencia_pago || "No especificada"}
Cuota estimada    : ${fmtNIO(cuota)}

=== ANÁLISIS FINANCIERO ===
Ingresos mensuales     : ${fmtNIO(ingresos)}
Egresos mensuales      : ${fmtNIO(egresos)}
Capacidad de pago neta : ${fmtNIO(neto)}
Índice de cobertura    : ${indice ? indice + "x (neto / cuota)" : "No calculable"}

=== GARANTÍAS ===
${txtGarantias}

=== FIADORES ===
${txtFiadores}

=== INSTRUCCIONES ===
• Español formal institucional, tercera persona.
• En analisis_financiero.narrativa menciona el índice de cobertura y su implicación.
• En factores_de_atencion incluye OBLIGATORIAMENTE: índice < 1.2x, ausencia de garantías formales, ausencia de fiadores (solo los que apliquen).
• nivel_riesgo_sugerido: únicamente "Bajo", "Medio" o "Alto".
• decision_sugerida: "Se recomienda aprobar", "Se recomienda aprobar con condiciones" o "Se recomienda no aprobar en esta instancia".

Responde SOLO con JSON válido, sin texto adicional ni markdown:
{
  "descripcion_actividad": { "narrativa": "..." },
  "analisis_financiero": { "narrativa": "...", "observaciones": "" },
  "solicitud_justificacion": "...",
  "analisis_riesgo": {
    "factores_positivos": ["...", "..."],
    "factores_de_atencion": [],
    "nivel_riesgo_sugerido": "Medio",
    "observaciones": ""
  },
  "recomendacion": {
    "decision_sugerida": "Se recomienda aprobar",
    "condiciones_propuestas": "...",
    "observaciones_comite": "..."
  }
}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface GenerarParams {
  solicitud: Solicitud;
  flujoCaja?: ItemFlujoCaja[];
  garantias?: Garantia[];
  fiadores?: Fiador[];
}

export function useDictamen(solicitudId: number) {  // INTEGER — coincide con solicitudes.id
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [dictamen, setDictamen] = useState<DictamenCompleto | null>(null);
  const [numDoc, setNumDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generarDictamen = useCallback(
    async ({ solicitud, flujoCaja = [], garantias = [], fiadores = [] }: GenerarParams) => {
      setGenerando(true);
      setError(null);
      setDictamen(null);
      setNumDoc(null);

      try {
        const prompt = buildPrompt(solicitud, flujoCaja, garantias, fiadores);

        const respuesta = await llamarIA({
          sistema: "Eres un analista de crédito. Responde EXCLUSIVAMENTE con JSON válido, sin markdown.",
          mensajes: [{ role: "user", content: prompt }],
          maxTokens: 1600,
        });

        const cleaned = respuesta.replace(/```json|```/g, "").trim();

        let iaContent: DictamenCompleto["analisis_riesgo"] & {
          descripcion_actividad: DictamenCompleto["descripcion_actividad"];
          analisis_financiero: DictamenCompleto["analisis_financiero"];
          solicitud_justificacion: string;
          recomendacion: DictamenCompleto["recomendacion"];
        };

        try {
          iaContent = JSON.parse(cleaned);
        } catch {
          throw new Error("La IA devolvió un formato inesperado. Intenta de nuevo.");
        }

        const { ingresos, egresos, neto } = calcularTotales(flujoCaja);
        const cuota = Number(solicitud.cuota_estimada) || 0;

        const dictamenCompleto: DictamenCompleto = {
          datos_cliente: {
            nombre: solicitud.nombre_cliente || "",
            cedula: solicitud.cedula || "",
            telefono: solicitud.telefono || "",
            municipio: solicitud.municipio || "",
            departamento: solicitud.departamento || "",
            actividad: solicitud.actividad_economica || "",
            anos_experiencia: solicitud.anos_experiencia || "",
          },
          solicitud_credito: {
            linea_producto: solicitud.linea_producto || "",
            monto_solicitado: solicitud.monto_solicitado || 0,
            plazo_meses: solicitud.plazo_meses || 0,
            frecuencia_pago: solicitud.frecuencia_pago || "",
            destino_credito: solicitud.destino_credito || "",
            cuota_estimada: cuota,
          },
          financiero_datos: {
            ingresos_mensuales: ingresos,
            egresos_mensuales: egresos,
            capacidad_pago_neta: neto,
            indice_cobertura: cuota > 0 ? parseFloat((neto / cuota).toFixed(2)) : null,
          },
          garantias,
          fiadores,
          descripcion_actividad: iaContent.descripcion_actividad,
          analisis_financiero: iaContent.analisis_financiero,
          solicitud_justificacion: iaContent.solicitud_justificacion,
          analisis_riesgo: iaContent.analisis_riesgo,
          recomendacion: iaContent.recomendacion,
          _meta: {
            modelo_ia: MODELOS[PROVEEDOR_ACTIVO],
            proveedor: PROVEEDOR_ACTIVO,
            generado_en: new Date().toISOString(),
            editado_por_asesor: false,
          },
        };

        setDictamen(dictamenCompleto);
        return dictamenCompleto;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al generar el dictamen.";
        console.error("[useDictamen] generarDictamen:", err);
        setError(msg);
        throw err;
      } finally {
        setGenerando(false);
      }
    },
    []
  );

  const editarSeccion = useCallback((path: string, valor: string) => {
    setDictamen((prev) => {
      if (!prev) return prev;
      const parts = path.split(".");
      const next = { ...prev } as Record<string, unknown>;
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...(cur[parts[i]] as Record<string, unknown>) };
        cur = cur[parts[i]] as Record<string, unknown>;
      }
      cur[parts[parts.length - 1]] = valor;
      (next as DictamenCompleto)._meta = {
        ...(next as DictamenCompleto)._meta,
        editado_por_asesor: true,
      };
      return next as DictamenCompleto;
    });
  }, []);

  const editarFactorRiesgo = useCallback(
    (tipo: "factores_positivos" | "factores_de_atencion", index: number, valor: string) => {
      setDictamen((prev) => {
        if (!prev) return prev;
        const lista = [...(prev.analisis_riesgo[tipo] || [])];
        lista[index] = valor;
        return {
          ...prev,
          analisis_riesgo: { ...prev.analisis_riesgo, [tipo]: lista },
          _meta: { ...prev._meta, editado_por_asesor: true },
        };
      });
    },
    []
  );

  const guardarEnSupabase = useCallback(
    async (usuarioId: string) => {
      if (!dictamen) throw new Error("No hay dictamen para guardar.");
      setGuardando(true);
      try {
        const { data, error: dbErr } = await supabase
          .from("dictamenes")
          .insert({
            solicitud_id: solicitudId,          // number — INTEGER en Supabase
            contenido_json: dictamen,
            estado: "borrador",
            generado_por: usuarioId,            // string UUID — auth.uid()
            modelo_ia: dictamen._meta?.modelo_ia || "desconocido",
            editado_por_asesor: dictamen._meta?.editado_por_asesor || false,
          })
          .select("id, numero_dictamen")
          .single();

        if (dbErr) throw dbErr;

        const num = (data as { numero_dictamen: string }).numero_dictamen;
        setNumDoc(num);
        setDictamen((prev) =>
          prev ? { ...prev, _meta: { ...prev._meta, numero_dictamen: num } } : prev
        );
        return data;
      } catch (err) {
        console.error("[useDictamen] guardarEnSupabase:", err);
        throw err;
      } finally {
        setGuardando(false);
      }
    },
    [dictamen, solicitudId]
  );

  return {
    generando,
    guardando,
    dictamen,
    numDoc,
    error,
    generarDictamen,
    editarSeccion,
    editarFactorRiesgo,
    guardarEnSupabase,
  };
}
