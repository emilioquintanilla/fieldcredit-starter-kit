// Cuentas dinámicas para Estado de Resultados y Estado de Situación Financiera.
// Se adaptan según el tipo de actividad económica declarado en la solicitud.
import { TIPOS_ACTIVIDAD, type TipoActividad } from "./rubrosFlujoPorActividad";

export { TIPOS_ACTIVIDAD };
export type { TipoActividad };

export interface CuentaDef {
  id: string;
  etiqueta: string;
  ayuda?: string;
  obligatorio?: boolean;
  prefillDesde?: string; // key del rubro en el flujo de efectivo
}

// ── INGRESOS POR ACTIVIDAD ───────────────────────────────────────────
export const CUENTAS_INGRESOS: Record<TipoActividad, CuentaDef[]> = {
  [TIPOS_ACTIVIDAD.COMERCIO]: [
    { id: "ventas_contado",     etiqueta: "Ventas al contado (C$/mes)",             ayuda: "Total cobrado en efectivo o transferencia en el mes", prefillDesde: "ventasContado", obligatorio: true },
    { id: "ventas_credito",     etiqueta: "Ventas al crédito cobradas (C$/mes)",    ayuda: "Lo que cobró de ventas a crédito anteriores", prefillDesde: "ventasCredito" },
    { id: "otros_ingresos_com", etiqueta: "Otros ingresos (C$/mes)",                ayuda: "Comisiones, alquileres u otros ingresos del negocio", prefillDesde: "otrosIngresosCom" },
  ],
  [TIPOS_ACTIVIDAD.AGRICULTURA]: [
    { id: "venta_cosecha_p",       etiqueta: "Venta de cosecha primera (C$)",         ayuda: "Quintales vendidos × precio — ciclo primera", prefillDesde: "cosechaMaizP", obligatorio: true },
    { id: "venta_cosecha_po",      etiqueta: "Venta de cosecha postrera (C$)",        ayuda: "Quintales vendidos × precio — ciclo postrera", prefillDesde: "cosechaMaizPo" },
    { id: "venta_frijol",          etiqueta: "Venta de frijol (C$)",                  ayuda: "Quintales vendidos × precio", prefillDesde: "cosechaFrijolP" },
    { id: "venta_otros_cultivos",  etiqueta: "Venta de otros cultivos (C$)",          ayuda: "Sorgo, millón, hortalizas, café u otros", prefillDesde: "otroEstacional" },
    { id: "ingreso_jornales",      etiqueta: "Ingresos por jornales externos (C$/mes)", ayuda: "Si el cliente trabaja como jornalero", prefillDesde: "ingresoJornales" },
    { id: "otros_ing_agro",        etiqueta: "Otros ingresos agrícolas (C$/mes)",     ayuda: "Alquiler de maquinaria, servicios de arado, otros", prefillDesde: "otrosIngAgro" },
  ],
  [TIPOS_ACTIVIDAD.GANADERIA]: [
    { id: "venta_leche",        etiqueta: "Ingresos por leche (C$/mes)",              ayuda: "Litros/día × precio × días del mes", prefillDesde: "ventaLeche", obligatorio: true },
    { id: "venta_queso_crema",  etiqueta: "Venta de queso y crema (C$/mes)",          ayuda: "Kg queso × precio + litros crema × precio", prefillDesde: "ventaQuesoCrema" },
    { id: "venta_ganado",       etiqueta: "Venta de ganado / animales (C$/mes)",      ayuda: "Cabezas vendidas × precio (promedio mensual)", prefillDesde: "ventaGanado" },
    { id: "venta_aves_cerdos",  etiqueta: "Venta de aves / cerdos (C$/mes)",          ayuda: "Ingresos por venta de aves de corral o porcinos" },
    { id: "otros_ing_ganadero", etiqueta: "Otros ingresos pecuarios (C$/mes)",        ayuda: "Alquiler de toros, inseminación, otros", prefillDesde: "otrosIngGanadero" },
  ],
  [TIPOS_ACTIVIDAD.MIXTO]: [
    { id: "ventas_negocio_mx", etiqueta: "Ventas del negocio (C$/mes)",   ayuda: "Ingresos del negocio comercial", prefillDesde: "ventasNegocioMx", obligatorio: true },
    { id: "venta_cosecha_mx",  etiqueta: "Ingresos por cosechas (C$/mes promedio)", ayuda: "Promedio mensual de cosechas del año", prefillDesde: "cosechaMaizP" },
    { id: "leche_mx",          etiqueta: "Ingresos por leche / lácteos (C$/mes)", ayuda: "Si también tiene actividad ganadera", prefillDesde: "ingresosLecheMx" },
    { id: "otros_ing_mixto",   etiqueta: "Otros ingresos (C$/mes)", ayuda: "Jornales, remesas, alquileres", prefillDesde: "otrosIngMixto" },
  ],
  [TIPOS_ACTIVIDAD.SERVICIOS]: [
    { id: "ingresos_servicios", etiqueta: "Ingresos por servicios prestados (C$/mes)", ayuda: "Total cobrado por servicios en el mes", prefillDesde: "ingresoServicios", obligatorio: true },
    { id: "contratos_fijos",    etiqueta: "Contratos o servicios fijos (C$/mes)", ayuda: "Clientes con contrato mensual recurrente", prefillDesde: "contratosFijos" },
    { id: "otros_ing_srv",      etiqueta: "Otros ingresos (C$/mes)", ayuda: "Comisiones, bonificaciones, otros", prefillDesde: "otrosIngSrv" },
  ],
  [TIPOS_ACTIVIDAD.MANUFACTURA]: [
    { id: "venta_productos",    etiqueta: "Venta de productos elaborados (C$/mes)", ayuda: "Total de ventas de productos que fabrica", prefillDesde: "ventaProductos", obligatorio: true },
    { id: "pedidos_especiales", etiqueta: "Pedidos especiales (C$/mes)", ayuda: "Trabajos o pedidos fuera de lo habitual", prefillDesde: "pedidosEspeciales" },
    { id: "otros_ing_mfg",      etiqueta: "Otros ingresos (C$/mes)", ayuda: "Alquiler de equipos, subcontratación, otros", prefillDesde: "otrosIngMfg" },
  ],
  [TIPOS_ACTIVIDAD.ASALARIADO]: [
    { id: "salario_neto",     etiqueta: "Salario neto mensual (C$/mes)", ayuda: "Salario después de deducciones (INSS, IR)", prefillDesde: "salarioNeto", obligatorio: true },
    { id: "horas_extra",      etiqueta: "Horas extra / bonificaciones (C$/mes)", ayuda: "Promedio mensual adicional al salario base", prefillDesde: "horasExtra" },
    { id: "negocio_paralelo", etiqueta: "Ingresos por negocio o actividad extra (C$/mes)", ayuda: "Si tiene negocio adicional al empleo", prefillDesde: "negocioParalelo" },
    { id: "otros_ing_asal",   etiqueta: "Otros ingresos (C$/mes)", ayuda: "Remesas, alquileres, pensión u otros", prefillDesde: "otrosIngAsal" },
  ],
  [TIPOS_ACTIVIDAD.AGRORESILIA]: [
    { id: "venta_cosecha_ar",   etiqueta: "Venta de cosecha principal (C$)", ayuda: "Producto principal del proyecto AgroResilia", prefillDesde: "cosechaMaizP", obligatorio: true },
    { id: "venta_secundaria_ar",etiqueta: "Venta de cultivos secundarios (C$)", ayuda: "Otros cultivos del sistema productivo", prefillDesde: "otroEstacional" },
    { id: "beneficio_riego_ar", etiqueta: "Ahorro estimado por tecnología AgroResilia (C$/mes)", ayuda: "Reducción de costos gracias al sistema financiado", prefillDesde: "ahorroTecnologia" },
    { id: "otros_ing_ar",       etiqueta: "Otros ingresos del sistema productivo (C$/mes)", ayuda: "Subproductos, servicios, otros", prefillDesde: "otrosIngAr" },
  ],
  [TIPOS_ACTIVIDAD.OTRO]: [
    { id: "ingreso_principal_otro", etiqueta: "Ingreso principal (C$/mes)", ayuda: "Principal fuente de ingresos del cliente", prefillDesde: "ingresoPrincipal", obligatorio: true },
    { id: "otros_ing_otro",         etiqueta: "Otros ingresos (C$/mes)", ayuda: "Cualquier otro ingreso mensual recurrente", prefillDesde: "otrosIngOtro" },
  ],
};

// ── COSTOS POR ACTIVIDAD ─────────────────────────────────────────────
export const CUENTAS_COSTOS: Record<TipoActividad, CuentaDef[]> = {
  [TIPOS_ACTIVIDAD.COMERCIO]: [
    { id: "compra_mercaderia",  etiqueta: "Compra de mercadería (C$/mes)", ayuda: "Lo que gasta en comprar los productos que vende", prefillDesde: "compraMercaderia", obligatorio: true },
    { id: "transporte_merch",   etiqueta: "Transporte de mercadería (C$/mes)", ayuda: "Flete para traer o llevar mercadería", prefillDesde: "transporteMerch" },
    { id: "empaques_bolsas",    etiqueta: "Empaques y bolsas (C$/mes)", ayuda: "Bolsas, cajas, empaques", prefillDesde: "empaquesComercio" },
    { id: "merma_vencimiento",  etiqueta: "Pérdidas por merma / vencimiento (C$/mes)", ayuda: "Productos dañados o vencidos", prefillDesde: "mermaVencimiento" },
  ],
  [TIPOS_ACTIVIDAD.AGRICULTURA]: [
    { id: "semillas",              etiqueta: "Semillas (C$/mes promedio)", ayuda: "Costo de semillas / ciclo dividido en meses", prefillDesde: "semillasInsumos", obligatorio: true },
    { id: "fertilizantes",         etiqueta: "Fertilizantes y abonos (C$/mes)", ayuda: "Urea, completo, fórmulas, abono orgánico" },
    { id: "herbicidas_pesticidas", etiqueta: "Herbicidas y pesticidas (C$/mes)", ayuda: "Control de plagas y malezas" },
    { id: "mano_obra_agro",        etiqueta: "Mano de obra contratada (C$/mes)", ayuda: "Peones, jornaleros, chapiales", prefillDesde: "manoObraAgro" },
    { id: "alquiler_tierra",       etiqueta: "Alquiler de tierra (C$/mes)", ayuda: "Si alquila las manzanas que cultiva", prefillDesde: "alquilerTierraAg" },
    { id: "flete_cosecha",         etiqueta: "Flete de cosecha (C$/mes)", ayuda: "Transporte al mercado o acopio", prefillDesde: "fletesCosecha" },
  ],
  [TIPOS_ACTIVIDAD.GANADERIA]: [
    { id: "concentrado_alimento", etiqueta: "Concentrado y alimento (C$/mes)", ayuda: "Concentrado, sal, melaza, pasto cultivado", prefillDesde: "alimentacionGanado", obligatorio: true },
    { id: "veterinario_meds",     etiqueta: "Veterinario y medicamentos (C$/mes)", ayuda: "Vacunas, desparasitantes, vitaminas", prefillDesde: "veterinarioMeds" },
    { id: "compra_animales",      etiqueta: "Compra de animales para engorde (C$/mes)", ayuda: "Si compra animales para engordar", prefillDesde: "compraAnimales" },
    { id: "mano_obra_ganad",      etiqueta: "Mano de obra / vaquero (C$/mes)", ayuda: "Pago a trabajadores de la finca", prefillDesde: "manoObraGanad" },
    { id: "alquiler_potrero",     etiqueta: "Alquiler de potrero / tierra (C$/mes)", ayuda: "Si alquila potreros para pastoreo", prefillDesde: "alquilerPotrero" },
  ],
  [TIPOS_ACTIVIDAD.MIXTO]: [
    { id: "compra_merch_mx", etiqueta: "Compra de mercadería (C$/mes)", ayuda: "Inventario del negocio", prefillDesde: "compraMerchMx", obligatorio: true },
    { id: "insumos_agro_mx", etiqueta: "Insumos agrícolas (C$/mes)", ayuda: "Semillas, fertilizantes, herbicidas", prefillDesde: "insumosAgroMx" },
    { id: "mano_obra_mx",    etiqueta: "Mano de obra (C$/mes)", prefillDesde: "manoObraMx" },
    { id: "transporte_mx",   etiqueta: "Transporte (C$/mes)", prefillDesde: "transporteMx" },
  ],
  [TIPOS_ACTIVIDAD.SERVICIOS]: [
    { id: "materiales_srv",     etiqueta: "Materiales e insumos (C$/mes)", ayuda: "Materiales usados para prestar el servicio", prefillDesde: "materialesSrv", obligatorio: true },
    { id: "herramientas_equipo",etiqueta: "Herramientas y equipo (C$/mes)", ayuda: "Desgaste o reposición de herramientas", prefillDesde: "herramientasSrv" },
    { id: "transporte_srv",     etiqueta: "Transporte para el servicio (C$/mes)", ayuda: "Combustible o pasajes para llegar al cliente", prefillDesde: "transporteSrv" },
  ],
  [TIPOS_ACTIVIDAD.MANUFACTURA]: [
    { id: "materia_prima",     etiqueta: "Materia prima (C$/mes)", ayuda: "Materiales que transforma en producto final", prefillDesde: "materiaPrima", obligatorio: true },
    { id: "mano_obra_mfg",     etiqueta: "Mano de obra de producción (C$/mes)", ayuda: "Trabajadores que elaboran el producto", prefillDesde: "manoObraMfg" },
    { id: "energia_produccion",etiqueta: "Energía para producción (C$/mes)", ayuda: "Electricidad o combustible del proceso", prefillDesde: "energiaProduccion" },
    { id: "empaque_mfg",       etiqueta: "Empaques y presentación (C$/mes)", ayuda: "Bolsas, etiquetas, cajas", prefillDesde: "empaqueMfg" },
  ],
  [TIPOS_ACTIVIDAD.ASALARIADO]: [
    { id: "gastos_trabajo_asal", etiqueta: "Gastos relacionados al trabajo (C$/mes)", ayuda: "Uniforme, herramientas propias, cuotas sindicales", prefillDesde: "gastosTrabajo" },
  ],
  [TIPOS_ACTIVIDAD.AGRORESILIA]: [
    { id: "semillas_ar",      etiqueta: "Semillas certificadas (C$/mes)", ayuda: "Semillas del sistema AgroResilia", prefillDesde: "semillasAr", obligatorio: true },
    { id: "fertilizantes_ar", etiqueta: "Fertilizantes / bioinsumos (C$/mes)", prefillDesde: "fertilizantesAr" },
    { id: "energia_riego_ar", etiqueta: "Energía para riego (C$/mes)", ayuda: "Combustible o electricidad del sistema de riego", prefillDesde: "energiaRiegoAr" },
    { id: "mano_obra_ar",     etiqueta: "Mano de obra contratada (C$/mes)", prefillDesde: "manoObraAr" },
    { id: "mantenimiento_ar", etiqueta: "Mantenimiento de tecnología (C$/mes)", ayuda: "Mantenimiento del sistema financiado", prefillDesde: "mantenimientoAr" },
  ],
  [TIPOS_ACTIVIDAD.OTRO]: [
    { id: "costo_principal_otro", etiqueta: "Costo principal de la actividad (C$/mes)", ayuda: "El gasto más importante", prefillDesde: "costoProductivo", obligatorio: true },
    { id: "otros_costos_otro",    etiqueta: "Otros costos (C$/mes)", ayuda: "Otros gastos directos de la actividad", prefillDesde: "otrosCostosOtro" },
  ],
};

// ── GASTOS DE OPERACIÓN (comunes) ───────────────────────────────────
export const CUENTAS_GASTOS_OPERACION: CuentaDef[] = [
  { id: "alquiler_local_op", etiqueta: "Alquiler del local / tierra (C$/mes)", ayuda: "Renta del local o tierra de trabajo", prefillDesde: "alquilerTierra" },
  { id: "servicios_negocio", etiqueta: "Servicios básicos del negocio (C$/mes)", ayuda: "Agua, luz, internet del lugar de trabajo" },
  { id: "comunicaciones",    etiqueta: "Teléfono / comunicaciones (C$/mes)", ayuda: "Plan de datos o teléfono del negocio" },
  { id: "otros_gastos_op",   etiqueta: "Otros gastos del negocio (C$/mes)", ayuda: "Publicidad, permisos, cuotas gremiales" },
];

// ── CONSUMO FAMILIAR (comunes) ──────────────────────────────────────
export const CUENTAS_CONSUMO_FAMILIAR: CuentaDef[] = [
  { id: "alimentacion",        etiqueta: "Alimentación y artículos del hogar (C$/mes)", ayuda: "Comida, jabón, artículos de limpieza", prefillDesde: "alimentacion", obligatorio: true },
  { id: "educacion",           etiqueta: "Educación de los hijos (C$/mes)", ayuda: "Mensualidad, útiles, uniformes", prefillDesde: "educacion" },
  { id: "salud",               etiqueta: "Salud y medicinas (C$/mes)", ayuda: "Consultas, medicamentos, exámenes", prefillDesde: "salud" },
  { id: "transporte_personal", etiqueta: "Transporte personal (C$/mes)", ayuda: "Pasajes o combustible personal", prefillDesde: "transporte" },
  { id: "alquiler_vivienda",   etiqueta: "Alquiler de vivienda (C$/mes)", ayuda: "Solo si paga alquiler donde vive", prefillDesde: "alquilerViv" },
  { id: "otros_consumo",       etiqueta: "Otros gastos familiares (C$/mes)", ayuda: "Ropa, celebraciones, imprevistos" },
];

// ── ACTIVOS POR ACTIVIDAD ───────────────────────────────────────────
export const CUENTAS_ACTIVOS = {
  corriente: {
    base: [
      { id: "efectivo",        etiqueta: "Efectivo disponible (C$)", ayuda: "Dinero en efectivo, banco o billetera digital" },
      { id: "cuentas_cobrar",  etiqueta: "Cuentas por cobrar (C$)", ayuda: "Dinero que le deben sus clientes" },
    ] as CuentaDef[],
    porActividad: {
      [TIPOS_ACTIVIDAD.COMERCIO]:    [{ id: "inventario_merch", etiqueta: "Inventario de mercadería (C$)", ayuda: "Valor de productos disponibles para vender" }],
      [TIPOS_ACTIVIDAD.AGRICULTURA]: [
        { id: "cosecha_almacenada",   etiqueta: "Cosecha almacenada (C$)", ayuda: "Valor de la cosecha aún no vendida" },
        { id: "insumos_disponibles",  etiqueta: "Insumos agrícolas disponibles (C$)", ayuda: "Semillas, fertilizantes ya comprados" },
      ],
      [TIPOS_ACTIVIDAD.GANADERIA]: [
        { id: "animales_venta",  etiqueta: "Animales listos para venta (C$)", ayuda: "Animales a vender en los próximos meses" },
        { id: "inventario_lacteo", etiqueta: "Inventario de queso / crema (C$)", ayuda: "Productos lácteos pendientes de venta" },
      ],
      [TIPOS_ACTIVIDAD.MIXTO]: [
        { id: "inventario_mx", etiqueta: "Inventario de mercadería (C$)" },
        { id: "cosecha_mx",    etiqueta: "Cosecha almacenada (C$)" },
      ],
      [TIPOS_ACTIVIDAD.MANUFACTURA]: [
        { id: "materia_prima_inv",  etiqueta: "Materia prima en existencia (C$)" },
        { id: "producto_terminado", etiqueta: "Producto terminado en existencia (C$)" },
      ],
      [TIPOS_ACTIVIDAD.SERVICIOS]:  [] as CuentaDef[],
      [TIPOS_ACTIVIDAD.ASALARIADO]: [] as CuentaDef[],
      [TIPOS_ACTIVIDAD.AGRORESILIA]: [
        { id: "cosecha_almacenada_ar", etiqueta: "Cosecha almacenada (C$)" },
      ] as CuentaDef[],
      [TIPOS_ACTIVIDAD.OTRO]: [] as CuentaDef[],
    } as Record<TipoActividad, CuentaDef[]>,
  },
  fijo: {
    base: [
      { id: "vehiculos_trabajo",   etiqueta: "Vehículos de trabajo (C$)", ayuda: "Camión, moto, carretón usados para el negocio" },
      { id: "equipos_herramientas",etiqueta: "Equipos y herramientas (C$)", ayuda: "Equipos en buen estado — valor de mercado" },
    ] as CuentaDef[],
    porActividad: {
      [TIPOS_ACTIVIDAD.COMERCIO]: [
        { id: "mobiliario_comercio",  etiqueta: "Mobiliario del negocio (C$)", ayuda: "Mostradores, estantes, vitrinas" },
        { id: "equipo_refrigeracion", etiqueta: "Equipo de refrigeración (C$)", ayuda: "Refrigerador, congelador" },
      ],
      [TIPOS_ACTIVIDAD.AGRICULTURA]: [
        { id: "maquinaria_agro", etiqueta: "Maquinaria agrícola (C$)", ayuda: "Tractor, arado, bomba de mochila" },
        { id: "sistema_riego",   etiqueta: "Sistema de riego (C$)", ayuda: "Riego por goteo, aspersión u otro" },
      ],
      [TIPOS_ACTIVIDAD.GANADERIA]: [
        { id: "ganado_produccion", etiqueta: "Ganado de producción (C$)", ayuda: "Vacas lecheras, toros reproductores" },
        { id: "ganado_engorde",    etiqueta: "Ganado de engorde (C$)", ayuda: "Novillos, terneros en crecimiento" },
        { id: "aves_cerdos",       etiqueta: "Aves y cerdos (C$)", ayuda: "Valor de aves de corral y porcinos" },
        { id: "equipo_ganadero",   etiqueta: "Equipo pecuario (C$)", ayuda: "Ordeñadora, tanque de leche, picadora" },
      ],
      [TIPOS_ACTIVIDAD.AGRORESILIA]: [
        { id: "tecnologia_ar", etiqueta: "Tecnología AgroResilia instalada (C$)", ayuda: "Valor del sistema financiado" },
        { id: "maquinaria_ar", etiqueta: "Maquinaria agrícola (C$)" },
      ],
      [TIPOS_ACTIVIDAD.MANUFACTURA]: [
        { id: "maquinaria_mfg", etiqueta: "Maquinaria de producción (C$)", ayuda: "Máquinas del proceso productivo" },
      ],
      [TIPOS_ACTIVIDAD.MIXTO]:      [] as CuentaDef[],
      [TIPOS_ACTIVIDAD.SERVICIOS]:  [] as CuentaDef[],
      [TIPOS_ACTIVIDAD.ASALARIADO]: [] as CuentaDef[],
      [TIPOS_ACTIVIDAD.OTRO]:       [] as CuentaDef[],
    } as Record<TipoActividad, CuentaDef[]>,
  },
  inmueble: {
    base: [
      { id: "terreno_finca",   etiqueta: "Terreno / finca (C$)", ayuda: "Valor estimado de la tierra" },
      { id: "casa_vivienda",   etiqueta: "Casa / vivienda (C$)", ayuda: "Valor estimado de donde vive la familia" },
      { id: "local_comercial", etiqueta: "Local comercial / bodega (C$)", ayuda: "Valor del local donde opera el negocio" },
    ] as CuentaDef[],
  },
};

// ── PASIVOS (comunes) ───────────────────────────────────────────────
export const CUENTAS_PASIVOS = {
  corriente: [
    { id: "deuda_micredito",    etiqueta: "Deuda vigente con MiCrédito (C$)", ayuda: "Saldo total de créditos activos con MiCrédito" },
    { id: "deuda_otras_imf",    etiqueta: "Deudas con otras instituciones (C$)", ayuda: "Saldo con bancos u otras IMF" },
    { id: "deudas_proveedores", etiqueta: "Deudas con proveedores (C$)", ayuda: "Lo que debe a sus proveedores" },
    { id: "deudas_informales",  etiqueta: "Préstamos informales (C$)", ayuda: "Fiados, préstamos familiares o prestamistas" },
  ] as CuentaDef[],
  largo_plazo: [
    { id: "hipotecas",     etiqueta: "Hipotecas sobre inmuebles (C$)", ayuda: "Saldo de préstamos con garantía hipotecaria" },
    { id: "otras_deudas_lp", etiqueta: "Otras deudas de largo plazo (C$)", ayuda: "Deudas que se pagan en más de un año" },
  ] as CuentaDef[],
};

// ── ETIQUETAS + COLOR DE BANNER POR ACTIVIDAD ───────────────────────
export interface EtiquetaActividad {
  icono: string;
  costos: string;
  banner: string;
  badge?: string;
}

export const ETIQUETAS_ACTIVIDAD: Record<TipoActividad, EtiquetaActividad> = {
  [TIPOS_ACTIVIDAD.COMERCIO]:    { icono: "🛒", costos: "Compras y costos del negocio",     banner: "bg-fieldcredit-teal-pale border-fieldcredit-teal/40" },
  [TIPOS_ACTIVIDAD.AGRICULTURA]: { icono: "🌱", costos: "Costos de producción agrícola",    banner: "bg-fieldcredit-green-pale border-fieldcredit-green/40" },
  [TIPOS_ACTIVIDAD.GANADERIA]:   { icono: "🐄", costos: "Costos de la ganadería",           banner: "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700" },
  [TIPOS_ACTIVIDAD.MIXTO]:       { icono: "🌿🛒", costos: "Costos de producción y ventas",  banner: "bg-fieldcredit-green-pale border-fieldcredit-green/40", badge: "🌿🛒 Actividad mixta — mostrando cuentas combinadas" },
  [TIPOS_ACTIVIDAD.SERVICIOS]:   { icono: "🔧", costos: "Costos de prestación de servicio", banner: "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600" },
  [TIPOS_ACTIVIDAD.MANUFACTURA]: { icono: "🏭", costos: "Costos de producción",             banner: "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600" },
  [TIPOS_ACTIVIDAD.ASALARIADO]:  { icono: "💼", costos: "Gastos relacionados al empleo",    banner: "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700" },
  [TIPOS_ACTIVIDAD.AGRORESILIA]: { icono: "🌾", costos: "Costos del sistema AgroResilia",   banner: "bg-fieldcredit-green-pale border-fieldcredit-green/40", badge: "🌿 Proyecto AgroResilia" },
  [TIPOS_ACTIVIDAD.OTRO]:        { icono: "📦", costos: "Costos de la actividad",           banner: "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600" },
};
