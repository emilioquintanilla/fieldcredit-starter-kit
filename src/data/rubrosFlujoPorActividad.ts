// Rubros dinámicos del Flujo de Efectivo por tipo de actividad económica.
// Solo cambian los bloques A (Ingresos fijos), B (Ingresos estacionales) y D (Costos de producción).
// C (Gastos del hogar) y E (Otras deudas) permanecen fijos y se leen desde flujo-catalogos.ts.
import { RUBROS as RUBROS_BASE, type RubroDef, type Bloque } from "./flujo-catalogos";

export const TIPOS_ACTIVIDAD = {
  COMERCIO:    "Comercio",
  AGRICULTURA: "Agropecuaria",
  GANADERIA:   "Ganadería / Pecuario",
  MIXTO:       "Mixto (Agro + Comercio)",
  SERVICIOS:   "Servicios",
  MANUFACTURA: "Producción / Manufactura",
  ASALARIADO:  "Asalariado",
  AGRORESILIA: "AgroResilia",
  OTRO:        "Otra",
} as const;

export type TipoActividad = typeof TIPOS_ACTIVIDAD[keyof typeof TIPOS_ACTIVIDAD];

// ── BLOQUE A: INGRESOS FIJOS POR ACTIVIDAD ───────────────────────────
export const RUBROS_INGRESOS_FIJOS: Record<TipoActividad, RubroDef[]> = {
  [TIPOS_ACTIVIDAD.COMERCIO]: [
    { key: "ventasContado",    label: "Ventas al contado",           ayuda: "Total cobrado en efectivo o transferencia en el mes" },
    { key: "ventasCredito",    label: "Cobro de ventas al crédito",  ayuda: "Lo que cobró de ventas a crédito anteriores" },
    { key: "otrosIngresosCom", label: "Otros ingresos del negocio",  ayuda: "Comisiones, alquileres u otros ingresos recurrentes" },
  ],
  [TIPOS_ACTIVIDAD.AGRICULTURA]: [
    { key: "ingresoJornales",  label: "Ingresos por jornales externos", ayuda: "Si el cliente trabaja como jornalero en fincas ajenas" },
    { key: "arriendoRecibeAg", label: "Arriendo o alquiler que recibe", ayuda: "Si alquila tierra, equipo o local a otra persona" },
    { key: "otrosIngAgro",     label: "Otros ingresos fijos agrícolas", ayuda: "Alquiler de maquinaria, servicios de arado, subproductos mensuales" },
  ],
  [TIPOS_ACTIVIDAD.GANADERIA]: [
    { key: "ventaLeche",       label: "Ingresos por leche",              ayuda: "Litros/día × precio por litro × días del mes" },
    { key: "ventaQuesoCrema",  label: "Venta de queso y crema",          ayuda: "Kg de queso × precio + litros de crema × precio" },
    { key: "otrosIngGanadero", label: "Otros ingresos pecuarios fijos",  ayuda: "Alquiler de toros, servicios de inseminación, otros mensuales" },
  ],
  [TIPOS_ACTIVIDAD.MIXTO]: [
    { key: "ventasNegocioMx",  label: "Ventas del negocio",              ayuda: "Ingresos del negocio comercial en el mes" },
    { key: "ingresosLecheMx",  label: "Ingresos por leche / lácteos",    ayuda: "Si también tiene actividad ganadera" },
    { key: "otrosIngMixto",    label: "Otros ingresos fijos",            ayuda: "Jornales, alquileres, remesas u otros" },
  ],
  [TIPOS_ACTIVIDAD.SERVICIOS]: [
    { key: "ingresoServicios", label: "Ingresos por servicios",          ayuda: "Total cobrado por servicios prestados en el mes" },
    { key: "contratosFijos",   label: "Contratos o clientes fijos",      ayuda: "Clientes con pago mensual recurrente" },
    { key: "otrosIngSrv",      label: "Otros ingresos",                  ayuda: "Comisiones, bonificaciones, otros ingresos fijos" },
  ],
  [TIPOS_ACTIVIDAD.MANUFACTURA]: [
    { key: "ventaProductos",    label: "Venta de productos elaborados",  ayuda: "Total de ventas de los productos que fabrica" },
    { key: "pedidosEspeciales", label: "Pedidos especiales",             ayuda: "Trabajos o pedidos fuera de la producción habitual" },
    { key: "otrosIngMfg",       label: "Otros ingresos",                 ayuda: "Alquiler de equipos, subcontratación, otros" },
  ],
  [TIPOS_ACTIVIDAD.ASALARIADO]: [
    { key: "salarioNeto",     label: "Salario neto mensual",             ayuda: "Salario después de deducciones (INSS, IR)" },
    { key: "horasExtra",      label: "Horas extra y bonificaciones",     ayuda: "Promedio mensual de pagos adicionales al salario base" },
    { key: "negocioParalelo", label: "Negocio o actividad extra",        ayuda: "Si tiene un negocio adicional al empleo" },
    { key: "otrosIngAsal",    label: "Otros ingresos",                   ayuda: "Remesas, alquileres, pensión u otros" },
  ],
  [TIPOS_ACTIVIDAD.AGRORESILIA]: [
    { key: "ingresosLecheAr",  label: "Ingresos por leche / lácteos",    ayuda: "Si el sistema AgroResilia incluye ganadería" },
    { key: "ahorroTecnologia", label: "Ahorro por tecnología AgroResilia", ayuda: "Reducción de costos gracias al sistema financiado (riego, paneles, etc.)" },
    { key: "otrosIngAr",       label: "Otros ingresos fijos del sistema", ayuda: "Subproductos, servicios, alquileres de equipo" },
  ],
  [TIPOS_ACTIVIDAD.OTRO]: [
    { key: "ingresoPrincipal",  label: "Ingreso principal",              ayuda: "Principal fuente de ingresos del cliente" },
    { key: "ingresoSecundario", label: "Ingreso secundario",             ayuda: "Otra fuente de ingreso adicional" },
    { key: "otrosIngOtro",      label: "Otros ingresos",                 ayuda: "Cualquier otro ingreso mensual recurrente" },
  ],
};

// ── BLOQUE B: INGRESOS ESTACIONALES POR ACTIVIDAD ────────────────────
export const RUBROS_INGRESOS_ESTACIONALES: Record<TipoActividad, RubroDef[]> = {
  [TIPOS_ACTIVIDAD.COMERCIO]: [
    { key: "ventasTemporada",  label: "Ventas de temporada alta",   ayuda: "Pico de ventas en meses especiales (navidad, escolar, etc.)" },
    { key: "liquidacionStock", label: "Liquidación de inventario",  ayuda: "Ventas por liquidación de mercadería en ciertos meses" },
  ],
  [TIPOS_ACTIVIDAD.AGRICULTURA]: [
    { key: "cosechaMaizP",    label: "Cosecha maíz primera",             ayuda: "Quintales vendidos × precio — ciclo de primera" },
    { key: "cosechaMaizPo",   label: "Cosecha maíz postrera / apante",   ayuda: "Quintales vendidos × precio — ciclo postrera" },
    { key: "cosechaFrijolP",  label: "Cosecha frijol primera",           ayuda: "Quintales vendidos × precio — ciclo primera" },
    { key: "cosechaFrijolPo", label: "Cosecha frijol postrera",          ayuda: "Quintales vendidos × precio — ciclo postrera" },
    { key: "cosechaSorgo",    label: "Cosecha sorgo / millón",           ayuda: "Quintales vendidos × precio por quintal" },
    { key: "cosechaCafe",     label: "Cosecha café",                     ayuda: "Quintales uva × precio por quintal" },
    { key: "otrosCultivos",   label: "Venta de otros cultivos",          ayuda: "Hortalizas, yuca, quequisque, plátano u otros" },
  ],
  [TIPOS_ACTIVIDAD.GANADERIA]: [
    { key: "ventaGanadoEst",  label: "Venta de ganado / animales",       ayuda: "Número de cabezas × precio — meses en que realiza ventas" },
    { key: "ventaAvesCerdos", label: "Venta de aves / cerdos",           ayuda: "Ingresos por venta de aves de corral y cerdos" },
    { key: "otrosEstacGanad", label: "Otros ingresos estacionales pecuarios", ayuda: "Venta de pieles, abono, otros subproductos estacionales" },
  ],
  [TIPOS_ACTIVIDAD.MIXTO]: [
    { key: "cosechaMxP",      label: "Cosecha primera",                  ayuda: "Ingresos por cosecha de primera del ciclo agrícola" },
    { key: "cosechaMxPo",     label: "Cosecha postrera",                 ayuda: "Ingresos por cosecha postrera del ciclo agrícola" },
    { key: "ventaGanadoMx",   label: "Venta de animales",                ayuda: "Si también tiene actividad ganadera" },
    { key: "temporadaAltaMx", label: "Temporada alta del negocio",       ayuda: "Pico de ventas en meses especiales del negocio comercial" },
  ],
  [TIPOS_ACTIVIDAD.SERVICIOS]: [
    { key: "temporadaAltaSrv", label: "Temporada alta de servicios",     ayuda: "Meses con mayor demanda de sus servicios" },
    { key: "proyectosEsp",     label: "Proyectos especiales",            ayuda: "Trabajos grandes o contratos puntuales" },
  ],
  [TIPOS_ACTIVIDAD.MANUFACTURA]: [
    { key: "temporadaMfg",   label: "Producción de temporada alta",      ayuda: "Meses con mayor producción y ventas" },
    { key: "pedidosGrandes", label: "Pedidos grandes o contratos",       ayuda: "Contratos puntuales de gran volumen" },
  ],
  [TIPOS_ACTIVIDAD.ASALARIADO]: [
    { key: "decimoTercero", label: "Décimo tercer mes / aguinaldo",       ayuda: "Pago de aguinaldo — registrar en el mes que lo recibe" },
    { key: "vacaciones",    label: "Pago de vacaciones",                  ayuda: "Si recibe pago de vacaciones en algún mes del período" },
    { key: "bonusEsp",      label: "Bonos o pagos especiales",            ayuda: "Bonos de productividad, incentivos anuales u otros" },
  ],
  [TIPOS_ACTIVIDAD.AGRORESILIA]: [
    { key: "cosechaArP",        label: "Cosecha primera — cultivo AgroResilia",  ayuda: "Producción del cultivo principal del proyecto" },
    { key: "cosechaArPo",       label: "Cosecha postrera — cultivo AgroResilia", ayuda: "Si el cultivo tiene ciclo postrera" },
    { key: "ventaSubproductos", label: "Venta de subproductos",                  ayuda: "Rastrojos, abono orgánico, subproductos del sistema" },
    { key: "bonoVerde",         label: "Bono Verde AgroResilia",                 ayuda: "Si aplica bono por cumplimiento — registrar en el mes que lo recibe" },
  ],
  [TIPOS_ACTIVIDAD.OTRO]: [
    { key: "ingresoExtra1", label: "Ingreso estacional 1", ayuda: "Ingreso que solo llega en algunos meses del año" },
    { key: "ingresoExtra2", label: "Ingreso estacional 2", ayuda: "Otro ingreso que solo llega en ciertos meses" },
  ],
};

// ── BLOQUE D: COSTOS DE PRODUCCIÓN POR ACTIVIDAD ─────────────────────
export const RUBROS_COSTOS_PRODUCCION: Record<TipoActividad, RubroDef[]> = {
  [TIPOS_ACTIVIDAD.COMERCIO]: [
    { key: "compraMercaderia", label: "Compra de mercadería",              ayuda: "Lo que gasta en comprar los productos que vende" },
    { key: "transporteMerch",  label: "Transporte de mercadería",          ayuda: "Flete para traer o llevar mercadería" },
    { key: "empaquesComercio", label: "Empaques y bolsas",                 ayuda: "Bolsas, cajas, empaques para los productos" },
    { key: "mermaVencimiento", label: "Pérdidas por merma / vencimiento",  ayuda: "Productos dañados o vencidos — estimación mensual" },
  ],
  [TIPOS_ACTIVIDAD.AGRICULTURA]: [
    { key: "semillasInsumos",   label: "Semillas e insumos agrícolas",     ayuda: "Semillas, fertilizantes, herbicidas, plaguicidas — promedio mensual" },
    { key: "manoObraAgro",      label: "Mano de obra contratada",          ayuda: "Peones, jornaleros, chapiales — costo mensual promedio" },
    { key: "alquilerTierraAg",  label: "Alquiler de tierra",               ayuda: "Si alquila las manzanas que cultiva" },
    { key: "fletesCosecha",     label: "Flete de cosecha",                 ayuda: "Transporte de la cosecha al mercado o acopio — promedio mensual" },
    { key: "mantenimientoAgro", label: "Mantenimiento de equipos",         ayuda: "Reparaciones de maquinaria o herramientas agrícolas" },
  ],
  [TIPOS_ACTIVIDAD.GANADERIA]: [
    { key: "alimentacionGanado", label: "Concentrado y alimento",          ayuda: "Concentrado, sal, gallinaza, melaza, pasto cultivado" },
    { key: "veterinarioMeds",    label: "Veterinario y medicamentos",      ayuda: "Vacunas, desparasitantes, vitaminas, antibióticos" },
    { key: "compraAnimales",     label: "Compra de animales",              ayuda: "Si compra animales para engordar — costo mensual promedio" },
    { key: "manoObraGanad",      label: "Mano de obra / vaquero",          ayuda: "Pago a trabajadores de la finca" },
    { key: "alquilerPotrero",    label: "Alquiler de potrero",             ayuda: "Si alquila potreros para pastoreo" },
  ],
  [TIPOS_ACTIVIDAD.MIXTO]: [
    { key: "compraMerchMx",  label: "Compra de mercadería",                ayuda: "Inventario del negocio comercial" },
    { key: "insumosAgroMx",  label: "Insumos agrícolas",                   ayuda: "Semillas, fertilizantes, herbicidas" },
    { key: "manoObraMx",     label: "Mano de obra",                        ayuda: "Peones agrícolas o ayudantes del negocio" },
    { key: "transporteMx",   label: "Transporte",                          ayuda: "Flete de cosecha o mercadería" },
  ],
  [TIPOS_ACTIVIDAD.SERVICIOS]: [
    { key: "materialesSrv",   label: "Materiales e insumos",               ayuda: "Materiales usados para prestar el servicio" },
    { key: "herramientasSrv", label: "Herramientas y equipo",              ayuda: "Desgaste o reposición de herramientas de trabajo" },
    { key: "transporteSrv",   label: "Transporte para el servicio",        ayuda: "Combustible o pasajes para llegar al cliente" },
  ],
  [TIPOS_ACTIVIDAD.MANUFACTURA]: [
    { key: "materiaPrima",      label: "Materia prima",                    ayuda: "Materiales que transforma en el producto final" },
    { key: "manoObraMfg",       label: "Mano de obra de producción",       ayuda: "Pago a trabajadores que elaboran el producto" },
    { key: "energiaProduccion", label: "Energía para producción",          ayuda: "Electricidad o combustible del proceso productivo" },
    { key: "empaqueMfg",        label: "Empaques y presentación",          ayuda: "Bolsas, etiquetas, cajas del producto terminado" },
  ],
  [TIPOS_ACTIVIDAD.ASALARIADO]: [
    { key: "gastosTrabajo", label: "Gastos relacionados al empleo", ayuda: "Uniforme, herramientas propias, cuotas sindicales u otros gastos del empleo" },
  ],
  [TIPOS_ACTIVIDAD.AGRORESILIA]: [
    { key: "semillasAr",      label: "Semillas certificadas",             ayuda: "Semillas del sistema productivo AgroResilia" },
    { key: "fertilizantesAr", label: "Fertilizantes / bioinsumos",        ayuda: "Insumos del plan productivo AgroResilia" },
    { key: "energiaRiegoAr",  label: "Energía para riego",                ayuda: "Combustible o electricidad del sistema de riego financiado" },
    { key: "manoObraAr",      label: "Mano de obra contratada",           ayuda: "Peones o jornaleros del sistema productivo" },
    { key: "mantenimientoAr", label: "Mantenimiento de tecnología",       ayuda: "Mantenimiento del sistema financiado (bomba, paneles, invernadero)" },
  ],
  [TIPOS_ACTIVIDAD.OTRO]: [
    { key: "costoProductivo", label: "Costo principal de la actividad",   ayuda: "El gasto más importante para realizar su actividad económica" },
    { key: "otrosCostosOtro", label: "Otros costos de la actividad",      ayuda: "Cualquier otro gasto directo de la actividad" },
  ],
};

export interface EtiquetaFlujo { icono: string; costos: string; nota: string }

export const ETIQUETAS_FLUJO: Record<TipoActividad, EtiquetaFlujo> = {
  [TIPOS_ACTIVIDAD.COMERCIO]:    { icono: "🛒", costos: "Compras y costos del negocio",   nota: "Ingresos por ventas de su negocio comercial" },
  [TIPOS_ACTIVIDAD.AGRICULTURA]: { icono: "🌱", costos: "Costos de producción agrícola",  nota: "Ingresos por jornales y subproductos mensuales (las cosechas van en Bloque B)" },
  [TIPOS_ACTIVIDAD.GANADERIA]:   { icono: "🐄", costos: "Costos de la ganadería",         nota: "Ingresos mensuales de leche, queso y crema" },
  [TIPOS_ACTIVIDAD.MIXTO]:       { icono: "🌿", costos: "Costos de producción y ventas",  nota: "Ingresos del negocio y actividad agropecuaria" },
  [TIPOS_ACTIVIDAD.SERVICIOS]:   { icono: "🔧", costos: "Costos del servicio",            nota: "Ingresos por servicios prestados en el mes" },
  [TIPOS_ACTIVIDAD.MANUFACTURA]: { icono: "🏭", costos: "Costos de producción",           nota: "Ingresos por venta de los productos que elabora" },
  [TIPOS_ACTIVIDAD.ASALARIADO]:  { icono: "💼", costos: "Gastos del empleo",              nota: "Salario y otros ingresos del empleo" },
  [TIPOS_ACTIVIDAD.AGRORESILIA]: { icono: "🌾", costos: "Costos del sistema AgroResilia", nota: "Ingresos fijos del sistema productivo (cosechas van en Bloque B)" },
  [TIPOS_ACTIVIDAD.OTRO]:        { icono: "📦", costos: "Costos de la actividad",         nota: "Ingresos principales de la actividad" },
};

// Normaliza cualquier string de actividad al enum (fallback OTRO)
export function resolverTipoActividad(tipo?: string): TipoActividad {
  const valores = Object.values(TIPOS_ACTIVIDAD) as string[];
  return (valores.includes(tipo ?? "") ? (tipo as TipoActividad) : TIPOS_ACTIVIDAD.OTRO);
}

// Devuelve la estructura completa RUBROS por bloque para la actividad dada.
// Bloques C y E se mantienen desde el catálogo base (iguales para todos).
export function getRubrosParaActividad(tipo?: string): Record<Bloque, RubroDef[]> {
  const t = resolverTipoActividad(tipo);
  return {
    A: RUBROS_INGRESOS_FIJOS[t],
    B: RUBROS_INGRESOS_ESTACIONALES[t],
    C: RUBROS_BASE.C,
    D: RUBROS_COSTOS_PRODUCCION[t],
    E: RUBROS_BASE.E,
  };
}
