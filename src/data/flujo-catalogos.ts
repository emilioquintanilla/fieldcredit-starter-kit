// Catálogos y definiciones de rubros para el módulo de Flujo de Efectivo

export type Bloque = "A" | "B" | "C" | "D" | "F" | "E";

export interface RubroDef {
  key: string;
  label: string;
  ayuda: string;
}

export const RUBROS: Record<Bloque, RubroDef[]> = {
  A: [
    { key: "ventasNegocio", label: "Ventas del negocio / Comercio", ayuda: "Total de ventas del mes" },
    { key: "ingresosLeche", label: "Ingresos por leche / lácteos", ayuda: "Litros producidos × precio por litro" },
    { key: "salarioJornal", label: "Salario o jornal mensual", ayuda: "Ingreso fijo como empleado" },
    { key: "arriendoRecibe", label: "Arriendo o alquiler que recibe", ayuda: "Si alquila local, tierra o vivienda" },
    { key: "remesas", label: "Remesas del exterior", ayuda: "Dinero de familiares en el extranjero" },
    { key: "otroFijo", label: "Otro ingreso fijo", ayuda: "Describir en campo de texto libre" },
  ],
  B: [
    { key: "cosechaMaizP", label: "Cosecha maíz primera", ayuda: "Quintales vendidos × precio por quintal" },
    { key: "cosechaMaizPo", label: "Cosecha maíz postrera / apante", ayuda: "Quintales vendidos × precio por quintal" },
    { key: "cosechaFrijolP", label: "Cosecha frijol primera", ayuda: "Quintales vendidos × precio por quintal" },
    { key: "cosechaFrijolPo", label: "Cosecha frijol postrera", ayuda: "Quintales vendidos × precio por quintal" },
    { key: "cosechaSorgo", label: "Cosecha sorgo / millón", ayuda: "Quintales vendidos × precio por quintal" },
    { key: "ventaGanado", label: "Venta de ganado / animales", ayuda: "Número de animales × precio por cabeza" },
    { key: "cosechaCafe", label: "Cosecha café", ayuda: "Quintales uva × precio por quintal" },
    { key: "otroEstacional", label: "Venta de otros cultivos", ayuda: "Especificar cultivo, cantidad y precio" },
  ],
  C: [
    { key: "alimentacion", label: "Alimentación familiar", ayuda: "Comida y artículos básicos del hogar" },
    { key: "educacion", label: "Educación", ayuda: "Mensualidad, útiles, uniformes" },
    { key: "salud", label: "Salud y medicinas", ayuda: "Promedio mensual de consultas y medicinas" },
    { key: "servicios", label: "Servicios básicos", ayuda: "Agua, luz, internet, teléfono" },
    { key: "transporte", label: "Transporte personal", ayuda: "Pasajes o combustible personal" },
    { key: "alquilerViv", label: "Alquiler de vivienda", ayuda: "Solo si paga alquiler donde vive" },
  ],
  D: [
    { key: "semillas", label: "Semillas e insumos agrícolas", ayuda: "Semillas, fertilizantes, herbicidas" },
    { key: "manoObra", label: "Mano de obra contratada", ayuda: "Peones, jornaleros, chapiales" },
    { key: "alimGanado", label: "Alimentación del ganado", ayuda: "Concentrado, sal, gallinaza, melaza" },
    { key: "veterinario", label: "Veterinario / medicamentos animales", ayuda: "Vacunas, desparasitantes, vitaminas" },
    { key: "mercaderia", label: "Compra de mercadería", ayuda: "Inventario para revender (comerciantes)" },
    { key: "transporteProd", label: "Transporte de productos", ayuda: "Flete de cosecha o mercadería al mercado" },
    { key: "mantMaq", label: "Mantenimiento de maquinaria", ayuda: "Reparaciones, repuestos, combustible" },
    { key: "alquilerTierra", label: "Alquiler de tierra o local", ayuda: "Renta de manzanas cultivadas o local" },
  ],
  F: [],
  E: [
    { key: "otrasIMF", label: "Cuotas con otras instituciones", ayuda: "Pagos mensuales a otras IMF o bancos" },
    { key: "micredito", label: "Cuotas actuales con MiCrédito", ayuda: "Créditos vigentes actuales" },
    { key: "imprevistos", label: "Gastos imprevistos", ayuda: "Estimación mensual (sugerido: 5-10% del ingreso)" },
  ],
};

export const BLOQUE_META: Record<Bloque, { titulo: string; tip: string; header: string; subtotal: string }> = {
  A: {
    titulo: "A. Ingresos fijos",
    tip: "Ingresos que llegan todos los meses, sin importar la temporada.",
    header: "bg-fieldcredit-green text-white",
    subtotal: "bg-fieldcredit-green-pale text-fieldcredit-green-dark dark:bg-fieldcredit-green-dark/20 dark:text-fieldcredit-green-light",
  },
  B: {
    titulo: "B. Ingresos estacionales",
    tip: "Ingresos que solo llegan en ciertas épocas: cosechas, venta de animales. Escribe 0 en los meses que no hay ingreso de ese rubro.",
    header: "bg-fieldcredit-teal text-white",
    subtotal: "bg-fieldcredit-teal-pale text-fieldcredit-teal-dark dark:bg-fieldcredit-teal-dark/20 dark:text-fieldcredit-teal-light",
  },
  C: {
    titulo: "C. Gastos del hogar y consumo familiar",
    tip: "Los gastos de la familia son tan importantes como los del negocio. Si no se cubren, afectan directamente el pago del crédito.",
    header: "text-white",
    subtotal: "bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200",
  },
  D: {
    titulo: "D. Costos de producción / negocio",
    tip: "Gastos directamente relacionados con la actividad económica del cliente.",
    header: "text-white",
    subtotal: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  },
  E: {
    titulo: "E. Otras deudas y gastos",
    tip: "Pagos de deudas existentes que reducen el dinero disponible cada mes.",
    header: "bg-fieldcredit-red text-white",
    subtotal: "bg-fieldcredit-red-light text-fieldcredit-red dark:bg-fieldcredit-red/20 dark:text-red-300",
  },
};

// Colores inline para los bloques con fondos personalizados
export const BLOQUE_BG: Partial<Record<Bloque, string>> = {
  C: "#5D4037",
  D: "#37474F",
};

export const COLORES_GRAFICO = [
  "#5eb837", "#45ada2", "#f59e0b", "#3d7a21",
  "#2d7a71", "#b45309", "#0d47a1", "#37474f",
];

// Genera etiquetas de mes: 'Ago 26', 'Sep 26', ...
const MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export function generarMeses(inicio: string, plazo: number): string[] {
  // inicio en formato 'YYYY-MM'
  const [y, m] = inicio.split("-").map(Number);
  const out: string[] = [];
  let year = y;
  let month = (m || 1) - 1;
  for (let i = 0; i < plazo; i++) {
    out.push(`${MESES_ES[month]} ${String(year).slice(-2)}`);
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return out;
}

export function mesActualISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
