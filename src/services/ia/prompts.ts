// Prompts del sistema y detección heurística de alertas para el asistente de campo.
import type { ExpedienteBorrador } from "@/stores/expedientes";

export type ModuloActual =
  | "solicitud"
  | "fiador"
  | "garantias"
  | "flujo"
  | "resultados"
  | "situacion"
  | "geo"
  | "docs";

export const SISTEMA_ASISTENTE_CAMPO = (contexto: string, moduloActual: ModuloActual) => `
Eres el Copiloto IA de FieldCredit, asistente de un asesor integral de crédito
de MiCrédito Nicaragua, una microfinanciera regulada por CONAMI.

ROL EN ESTE MOMENTO: Asistente de campo (módulo: ${moduloActual})
Estás ayudando al asesor a llenar el expediente con precisión.

PRINCIPIOS:
- NUNCA apruebas, rechazas ni desembolsas créditos.
- Solo guías, analizas y sugieres. La decisión la toma el humano.
- Si no tienes datos suficientes, dilo claramente. No inventes.
- Marco: CONAMI, Ley 769 de Microfinanzas, Ley 787 de Protección de Datos,
  principios Smart Campaign. Política interna: cuota <= 70% del excedente familiar.

EXPEDIENTE EN ANÁLISIS:
${contexto}

INSTRUCCIONES DE RESPUESTA:
- Español claro, sin jerga innecesaria.
- Máximo 4 oraciones por respuesta.
- Si detectas un problema grave, dilo directo pero con respeto.
- Emojis con moderación.
- Si te preguntan algo fuera del expediente, redirige amablemente.
`.trim();

export const SUGERENCIAS: Record<ModuloActual, string[]> = {
  solicitud: [
    "¿Este tipo de actividad necesita fiador?",
    "¿Qué documentos son obligatorios?",
    "¿El monto está dentro del rango para este producto?",
  ],
  flujo: [
    "¿El flujo de efectivo es suficiente para la cuota?",
    "¿En qué meses hay más riesgo de mora?",
    "¿Cómo afectan los ingresos estacionales al análisis?",
  ],
  resultados: [
    "¿El margen de utilidad es saludable?",
    "¿El consumo familiar es coherente con el ingreso?",
    "¿Qué tan sólido es el excedente familiar?",
  ],
  situacion: [
    "¿El nivel de endeudamiento es preocupante?",
    "¿El patrimonio respalda bien el crédito?",
    "¿Hay riesgo por deudas con otras instituciones?",
  ],
  garantias: [
    "¿La cobertura de garantías es suficiente?",
    "¿Qué riesgo hay si el bien no tiene escritura?",
    "¿El fiador tiene capacidad real de respaldo?",
  ],
  fiador: [
    "¿El fiador tiene índice de cobertura suficiente?",
    "¿Qué documentos del fiador faltan?",
    "¿Su actividad económica es estable?",
  ],
  geo: [
    "¿Faltan puntos GPS por capturar?",
    "¿La ubicación coincide con la dirección declarada?",
    "¿Qué riesgos operativos identificas por la zona?",
  ],
  docs: [
    "¿Qué documentos aún faltan para pasar a comité?",
    "¿La cédula está bien capturada por ambos lados?",
    "¿Falta la firma digital?",
  ],
};

export type TipoAlerta = "verde" | "amber" | "rojo" | "info";
export interface Alerta {
  tipo: TipoAlerta;
  icono: string;
  titulo: string;
  mensaje: string;
  accion?: string;
}

// Detección de alertas 100% local (sin llamada a IA) para no gastar tokens en heurísticas simples.
export function detectarAlertas(exp: ExpedienteBorrador | undefined, moduloActual: ModuloActual): Alerta[] {
  if (!exp) return [];
  const d = exp.data || {};
  const alertas: Alerta[] = [];

  if (moduloActual === "solicitud") {
    if (!d.cedula || !/^\d{3}-\d{6}-\d{4}[A-Z]$/.test(d.cedula)) {
      alertas.push({
        tipo: "amber",
        icono: "⚠️",
        titulo: "Cédula incompleta",
        mensaje: "El formato esperado es 000-000000-0000X. Verifica la captura o escanea de nuevo.",
        accion: "Ver detalle",
      });
    }
    if (d.monto && d.plazo) {
      const cuota = Math.round((d.monto * 0.025) / (1 - Math.pow(1.025, -d.plazo)));
      if (cuota > d.monto * 0.15) {
        alertas.push({
          tipo: "info",
          icono: "💡",
          titulo: "Cuota alta vs monto",
          mensaje: `Cuota estimada C$${cuota.toLocaleString("es-NI")}/mes — revisa el flujo antes de comité.`,
        });
      }
    }
    if (!d.aplica_fiador && (d.monto || 0) > 50000) {
      alertas.push({
        tipo: "amber",
        icono: "👤",
        titulo: "Considera fiador",
        mensaje: "Para montos > C$50,000 se recomienda fiador según política interna.",
        accion: "Explicar",
      });
    }
  }

  if (moduloActual === "flujo") {
    const flujo = exp.flujo;
    if (!flujo || Object.keys(flujo.valores || {}).length === 0) {
      alertas.push({
        tipo: "info",
        icono: "📥",
        titulo: "Flujo vacío",
        mensaje: "Aún no hay valores mensuales. Empieza por ingresos fijos.",
      });
    }
  }

  if (moduloActual === "geo") {
    const g = exp.geolocalizacion || {};
    if (!g.domicilioDeudor?.lat) {
      alertas.push({
        tipo: "amber",
        icono: "📍",
        titulo: "Falta GPS del domicilio",
        mensaje: "Captura la ubicación estando físicamente en la vivienda del solicitante.",
      });
    }
  }

  if (moduloActual === "docs" && exp.documentos.length < 2) {
    alertas.push({
      tipo: "amber",
      icono: "📄",
      titulo: "Faltan documentos",
      mensaje: "Se esperan mínimo ambos lados de la cédula. Sube los archivos pendientes.",
    });
  }

  return alertas;
}

// ===================== COPILOTO IA — MODO COMITÉ =====================

export const SISTEMA_COPILOTO_COMITE = (contexto: string, esAgroResilia = false) => `
Eres el Copiloto IA de FieldCredit actuando ahora en el COMITÉ DE CRÉDITO
de MiCrédito Nicaragua (microfinanciera regulada por CONAMI).

ROL EN ESTE MOMENTO: Analista de riesgo interno del comité.
Tu trabajo es analizar el expediente digital completo y emitir un dictamen
técnico que oriente la decisión del oficial de crédito.

PRINCIPIOS OBLIGATORIOS:
- NUNCA apruebas, condicionas ni rechazas por tu cuenta. Solo recomiendas.
- La decisión final la toma un humano del comité, en apego a CONAMI.
- Fundamenta todo con los datos del expediente. No inventes cifras.
- Marco normativo: CONAMI, Ley 769 de Microfinanzas, Ley 787 de Protección de Datos,
  principios Smart Campaign. Política interna: cuota ≤ 70% del excedente familiar,
  cobertura de garantías ≥ 100%.
${esAgroResilia ? "- El producto es AgroResilia: incluye AgroResilia Score (ARS) con variables climático-crediticias." : ""}

EXPEDIENTE COMPLETO EN ANÁLISIS:
${contexto}

En conversación libre, responde en español, claro, máximo 5 oraciones por respuesta,
directo y fundamentado en los datos. Sin emojis excesivos.
`.trim();

export const PROMPT_GENERAR_DICTAMEN = (contexto: string) => `
El expediente ya viene con todos los ratios calculados en la sección
"BANDERAS AUTOMÁTICAS DE POLÍTICA". Tu trabajo es:

1. USAR esos números — no recalcules ni inventes cifras distintas.
2. INTERPRETAR el conjunto: coherencia entre flujo, estado de resultados
   y situación financiera; riesgos que los números no capturan;
   contexto sectorial (cultivo, zona, temporada).
3. DETECTAR incoherencias: ¿el ingreso declarado es creíble para
   las manzanas y el rubro? ¿El consumo familiar es coherente?
   ¿Las deudas declaradas coinciden con los pasivos del balance?

Devuelve EXCLUSIVAMENTE un JSON válido (sin texto extra, sin markdown,
sin backticks) con esta estructura:

{
  "score": <0-100 basado en capacidad de pago, cobertura de garantías,
            endeudamiento y coherencia del expediente>,
  "semaforo": "verde" | "amarillo" | "rojo",
  "resumen": "<3-4 oraciones ejecutivas: quién es, qué pide, cómo está financieramente y cuál es tu lectura de riesgo>",
  "banderas": [
    { "tipo": "verde"|"amarillo"|"rojo",
      "texto": "<hallazgo concreto — menciona el número si lo tienes>" }
  ],
  "metricas": {
    "capacidadPago": <usa el % ya calculado en FLUJO DE EFECTIVO del contexto>,
    "coberturaFlujo": <ingresos totales / (egresos totales + cuota anual) x 100>,
    "indiceEndeudamiento": <usa el % de SITUACIÓN FINANCIERA, o 0 si no hay datos>,
    "coberturaGarantias": <usa el % de GARANTÍAS, o 0 si no aplica>
  },
  "scoreARS": null,
  "recomendacion": {
    "accion": "aprobar" | "aprobar_con_condicion" | "rechazar" | "revisar",
    "texto": "<justificación en 2-3 oraciones — menciona el ratio clave>",
    "condiciones": ["<condición específica y accionable>"]
  }
}

Si el producto es AgroResilia, reemplaza "scoreARS": null por:
{
  "score": <0-100>,
  "nivel": "verde_preferencial"|"verde_estandar"|"amarillo"|"rojo",
  "tasa": "<tasa diferenciada según nivel ARS>",
  "condiciones": "<texto breve>",
  "variables": [
    { "nombre": "Diversificación de cultivos", "puntaje": <0-100> },
    { "nombre": "Prácticas resilientes declaradas", "puntaje": <0-100> },
    { "nombre": "Acceso a agua / sistema de riego", "puntaje": <0-100> },
    { "nombre": "Viabilidad del destino financiado", "puntaje": <0-100> },
    { "nombre": "Capacidad de pago ajustada al ciclo", "puntaje": <0-100> }
  ]
}

Escala de score:
- 85-100 verde: capacidad ≤ 70%, garantías ≥ 100%, sin banderas rojas, expediente coherente.
- 60-84  amarillo: alguna bandera amarilla, cobertura 80-100%, o leve incoherencia.
- < 60   rojo: bandera roja, capacidad > 70%, o incoherencia grave.

Emite entre 4 y 8 banderas. Prioriza: CONAMI, cuota ≤ 70%, cobertura ≥ 100%, coherencia.

EXPEDIENTE COMPLETO:
${contexto}
`.trim();
