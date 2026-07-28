/**
 * Tipos compartidos entre fuenteSupabase y fuenteApiCore.
 * Ruta: src/services/core/tipos.ts
 */

export interface CreditoCartera {
  id: number; codigo: string; cliente: string; cedula?: string;
  asesor_id?: number; asesor_nombre?: string;
  sucursal_id?: number; sucursal_nombre?: string; region?: string;
  producto_id?: number; producto_codigo?: string; producto_nombre?: string;
  es_verde: boolean; linea_verde?: string;
  monto_desembolsado: number; saldo_capital: number;
  tasa_anual?: number; plazo_meses: number;
  fecha_desembolso: string; fecha_vencimiento?: string;
  estado: string; rubro?: string; actividad?: string;
  departamento?: string; municipio?: string; lat?: number; lng?: number; manzanas?: number;
  score_otorgamiento?: number; ars_otorgamiento?: number; ars_nivel?: string;
  genero?: string; edad_otorgamiento?: number;
  es_joven: boolean; es_rural: boolean;
  microseguro: boolean; bono_verde: boolean; capacitado_escuela: boolean;
  dias_atraso: number; bucket_mora: string; cuotas_vencidas: number;
  cosecha_mes?: string;
}

export interface KpiInstitucional {
  creditos_activos: number; clientes_activos: number;
  cartera_bruta: number; saldo_promedio: number;
  par30?: number; par60?: number; par90?: number;
  pct_cartera_verde?: number; cartera_verde?: number;
  par30_verde?: number; par30_tradicional?: number; tasa_promedio?: number;
}

export interface KpiSucursal {
  sucursal_id: number; sucursal_nombre: string; region?: string;
  creditos_activos: number; clientes_activos: number; cartera_bruta: number;
  par30?: number; par90?: number; creditos_en_mora: number;
  pct_cartera_verde?: number; asesores: number;
}

export interface KpiAsesor {
  asesor_id: number; asesor_nombre: string;
  sucursal_id: number; sucursal_nombre: string;
  creditos_administrados: number; cartera_administrada: number;
  par30?: number; clientes_en_mora: number;
  clientes_atraso_temprano: number; score_promedio_otorgado?: number;
}

export interface Cosecha {
  cosecha_mes: string; creditos: number;
  monto_colocado: number; saldo_vigente: number;
  pct_creditos_par30?: number; par30?: number; pct_verdes?: number;
}

export interface ConcentracionRubro {
  rubro?: string; creditos: number; cartera: number;
  pct_cartera?: number; par30?: number; manzanas_totales?: number;
}

export interface EsgInstitucional {
  cartera_verde?: number; pct_cartera_verde?: number;
  productores_verdes: number; productoras_mujeres: number;
  pct_mujeres_verde?: number; productores_jovenes: number;
  pct_rural_verde?: number; manzanas_bajo_practicas?: number;
  creditos_con_microseguro: number; pct_cobertura_microseguro?: number;
  bonos_verdes_otorgados: number; productores_capacitados: number;
  cartera_agua?: number; cartera_produccion_protegida?: number;
  cartera_fincas_resilientes?: number; cartera_energia_solar?: number;
  ars_verde_preferencial: number; ars_verde_estandar: number;
  ars_amarillo: number; ars_rojo: number;
}

export interface ExposicionClimatica {
  alerta_id: number; departamento: string; municipio?: string;
  tipo: string; severidad: "baja" | "media" | "alta" | "critica";
  titulo: string; fecha_inicio: string; fecha_fin?: string;
  recomendacion?: string;
  creditos_expuestos: number; saldo_expuesto: number;
  creditos_con_microseguro: number; saldo_asegurado: number;
}

export interface ColocacionMensual {
  mes: string; operaciones: number;
  monto_colocado: number; monto_verde?: number; ticket_promedio: number;
}

export interface AlertaClimatica {
  id: number; departamento: string; municipio?: string;
  tipo: string; severidad: string; titulo: string;
  descripcion?: string; fuente?: string; recomendacion?: string;
  fecha_inicio: string; fecha_fin?: string; activa: boolean;
}

export interface ProductoCredito {
  id: number; codigo: string; nombre: string; descripcion?: string;
  es_verde: boolean; linea_verde?: string;
  monto_min?: number; monto_max?: number;
  plazo_min_meses?: number; plazo_max_meses?: number;
  tasa_anual?: number; requiere_fiador_desde?: number; activo: boolean;
}

export interface ParametroInstitucional {
  clave: string; valor: unknown; descripcion?: string; categoria?: string;
  updated_at: string;
}

export interface FiltrosCartera {
  sucursalId?: number; asesorId?: number; esVerde?: boolean;
  bucketMora?: string; desde?: string; hasta?: string;
}

export interface FuenteDatosCore {
  obtenerCartera: (filtros: FiltrosCartera) => Promise<CreditoCartera[]>;
  obtenerKpiInstitucional: () => Promise<KpiInstitucional | null>;
  obtenerKpiSucursales: () => Promise<KpiSucursal[]>;
  obtenerKpiAsesores: (sucursalId?: number) => Promise<KpiAsesor[]>;
  obtenerCosechas: () => Promise<Cosecha[]>;
  obtenerConcentracionRubro: () => Promise<ConcentracionRubro[]>;
  obtenerEsg: () => Promise<EsgInstitucional | null>;
  obtenerExposicionClimatica: () => Promise<ExposicionClimatica[]>;
  obtenerColocacionMensual: () => Promise<ColocacionMensual[]>;
  obtenerAlertas: () => Promise<AlertaClimatica[]>;
  obtenerProductos: () => Promise<ProductoCredito[]>;
  obtenerParametros: () => Promise<ParametroInstitucional[]>;
}
