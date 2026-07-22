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
