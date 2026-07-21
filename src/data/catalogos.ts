// Catálogos usados por el formulario de Solicitud de Crédito
export const tiposActividad = [
  "Comercio", "Agropecuaria", "Servicios",
  "Producción / Manufactura", "Asalariado", "Otra",
] as const;

export const productosCredito = [
  { id: "comercial",    nombre: "Crédito Comercial",    color: "green", icono: "🟢" },
  { id: "agropecuario", nombre: "Crédito Agropecuario", color: "green", icono: "🟢" },
  { id: "agroresilia",  nombre: "AgroResilia",          color: "teal",  icono: "🌿" },
  { id: "estudiantil",  nombre: "Crédito Estudiantil",  color: "amber", icono: "🎓" },
  { id: "vivienda",     nombre: "Crédito de Vivienda",  color: "gray",  icono: "🏠" },
  { id: "otro",         nombre: "Otro",                 color: "gray",  icono: "⚙️" },
] as const;

export const plazos = [3, 6, 12, 18, 24, 36] as const;

export const frecuenciasPago = [
  "Semanal", "Quincenal", "Mensual",
  "Trimestral", "Al vencimiento", "Por ciclo productivo",
] as const;

export const lineasAgroResilia = [
  { id: "A", nombre: "A – Agua siempre",         desc: "Riego, reservorios, cosecha de agua lluvia" },
  { id: "B", nombre: "B – Producción protegida", desc: "Invernaderos, casas mallas, microtúneles" },
  { id: "C", nombre: "C – Finca resiliente",     desc: "Diversificación, agrosilvopastoriles" },
  { id: "D", nombre: "D – Energía propia",       desc: "Paneles solares, bombeo solar" },
] as const;

export const estadosCiviles = [
  "Soltero/a", "Casado/a", "Unión de hecho", "Divorciado/a", "Viudo/a",
] as const;

export const escolaridades = [
  "Sin estudios", "Primaria", "Secundaria", "Técnico", "Universitario",
] as const;

export const tiposVivienda = ["Propia", "Alquilada", "Familiar"] as const;

export const tiposSolicitud = [
  "Crédito nuevo", "Renovación", "Refinanciamiento", "Ampliación",
] as const;

export const ciclosProductivos = ["Primera", "Postrera", "Apante", "Todo el año"] as const;

export const relacionesFiador = ["Cónyuge", "Familiar directo", "Amigo", "Socio", "Otra"] as const;

export const tiposGarantia = [
  { id: "solidaria",  label: "Fianza solidaria",                nota: "El fiador responde con su capacidad de pago." },
  { id: "prendaria",  label: "Garantía prendaria (bienes muebles)", nota: "Los bienes se registran en el módulo de Análisis de Garantías." },
  { id: "hipotecaria", label: "Garantía hipotecaria (bien inmueble)", nota: "El inmueble y avalúo se registran en el módulo de Análisis de Garantías." },
  { id: "otra",       label: "Otra garantía",                    nota: "Detalle en el módulo de Análisis de Garantías." },
] as const;
