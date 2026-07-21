// Catálogos para módulos de Fiador y Análisis de Garantías
export const tiposBienPrendado = [
  "Vehículo (carro, moto, camión)",
  "Maquinaria agrícola (tractor, bomba, arado)",
  "Equipo de trabajo (herramientas, equipos)",
  "Electrodomésticos",
  "Inventario de mercadería",
  "Semovientes (ganado vacuno, porcino, equino)",
  "Otro",
] as const;

// Emoji por tipo (para cards resumen)
export const iconosBienPrendado: Record<string, string> = {
  "Vehículo (carro, moto, camión)": "🚗",
  "Maquinaria agrícola (tractor, bomba, arado)": "🚜",
  "Equipo de trabajo (herramientas, equipos)": "🛠️",
  "Electrodomésticos": "📺",
  "Inventario de mercadería": "📦",
  "Semovientes (ganado vacuno, porcino, equino)": "🐄",
  "Otro": "📦",
};

export const estadosBien = [
  { id: "nuevo",   label: "Nuevo",   emoji: "🟢" },
  { id: "bueno",   label: "Bueno",   emoji: "🟡" },
  { id: "regular", label: "Regular", emoji: "🟠" },
  { id: "malo",    label: "Malo",    emoji: "🔴" },
] as const;

export const tiposInmueble = [
  "Casa habitación",
  "Terreno (sin construcción)",
  "Local comercial",
  "Finca agrícola",
  "Bodega / galera",
  "Otro",
] as const;

export const estadosInmueble = [
  { id: "muy_bueno", label: "Muy bueno", emoji: "🟢" },
  { id: "bueno",     label: "Bueno",     emoji: "🟡" },
  { id: "regular",   label: "Regular",   emoji: "🟠" },
  { id: "malo",      label: "Malo",      emoji: "🔴" },
] as const;

export const tiposActividadFiador = [
  "Comercio", "Agropecuaria", "Servicios",
  "Producción / Manufactura", "Asalariado", "Pensionado", "Otra",
] as const;

export const tiposIngresoFiador = [
  "Actividad principal (negocio / salario)",
  "Actividad secundaria",
  "Leche / productos lácteos",
  "Alquiler o arriendo que recibe",
  "Remesas del exterior",
  "Pensión o jubilación",
  "Otro ingreso",
] as const;

export const tiposEgresoFiador = [
  "Gastos del hogar (alimentación, básicos)",
  "Educación de hijos",
  "Salud y medicinas",
  "Transporte personal",
  "Alquiler de vivienda",
  "Cuota crédito con MiCrédito",
  "Cuota crédito con otras instituciones",
  "Otros gastos",
] as const;

// Porcentajes de cobertura institucional (hardcodeados para prototipo)
export const COBERTURA_PRENDARIA = 0.8;
export const COBERTURA_HIPOTECARIA = 0.7;
