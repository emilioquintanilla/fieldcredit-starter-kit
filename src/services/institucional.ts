// ─────────────────────────────────────────────────────────────────────────────
// Capa de datos del Panel Institucional.
//
// Hoy lee las vistas de Supabase. Cuando exista la API del core financiero,
// solo se reemplaza el cuerpo de estas funciones: la firma y los tipos no
// cambian, así que ningún componente se ve afectado.
// Ruta del archivo: src/services/institucional.ts
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabase";

// ── Tipos (espejo exacto de las vistas) ─────────────────────────────────────
export interface KpiInstitucional {
  creditos_activos: number;
  clientes_activos: number;
  cartera_bruta: number;
  saldo_promedio: number;
  par30: number | null;
  par60: number | null;
  par90: number | null;
  pct_cartera_verde: number | null;
  cartera_verde: number | null;
  par30_verde: number | null;
  par30_tradicional: number | null;
  tasa_promedio: number | null;
}

export interface EsgInstitucional {
  cartera_verde: number | null;
  pct_cartera_verde: number | null;
  productores_verdes: number;
  productoras_mujeres: number;
  pct_mujeres_verde: number | null;
  productores_jovenes: number;
  pct_rural_verde: number | null;
  manzanas_bajo_practicas: number | null;
  creditos_con_microseguro: number;
  pct_cobertura_microseguro: number | null;
  bonos_verdes_otorgados: number;
  productores_capacitados: number;
  cartera_agua: number | null;
  cartera_produccion_protegida: number | null;
  cartera_fincas_resilientes: number | null;
  cartera_energia_solar: number | null;
  ars_verde_preferencial: number;
  ars_verde_estandar: number;
  ars_amarillo: number;
  ars_rojo: number;
}

export interface KpiSucursal {
  sucursal_id: number;
  sucursal_nombre: string;
  region: string | null;
  creditos_activos: number;
  clientes_activos: number;
  cartera_bruta: number;
  par30: number | null;
  par90: number | null;
  creditos_en_mora: number;
  pct_cartera_verde: number | null;
  asesores: number;
}

export interface Cosecha {
  cosecha_mes: string;
  creditos: number;
  monto_colocado: number;
  saldo_vigente: number;
  pct_creditos_par30: number | null;
  par30: number | null;
  pct_verdes: number | null;
}

export interface ConcentracionRubro {
  rubro: string | null;
  creditos: number;
  cartera: number;
  pct_cartera: number | null;
  par30: number | null;
  manzanas_totales: number | null;
}

export interface ExposicionClimatica {
  alerta_id: number;
  departamento: string;
  municipio: string | null;
  tipo: string;
  severidad: "baja" | "media" | "alta" | "critica";
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  recomendacion: string | null;
  creditos_expuestos: number;
  saldo_expuesto: number;
  creditos_con_microseguro: number;
  saldo_asegurado: number;
}

export interface ColocacionMensual {
  mes: string;
  operaciones: number;
  monto_colocado: number;
  monto_verde: number | null;
  ticket_promedio: number;
}

export interface ParametroInstitucional {
  clave: string;
  valor: unknown;
  descripcion: string | null;
  categoria: string | null;
  updated_at: string;
}

export interface RegistroBitacora {
  id: number;
  usuario_id: number | null;
  usuario_nombre: string | null;
  usuario_rol: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  descripcion: string | null;
  ip: string | null;
  valor_nuevo: string | null;
  created_at: string;
}

// ── Lecturas ────────────────────────────────────────────────────────────────
async function leerUno<T>(vista: string): Promise<T | null> {
  const { data, error } = await supabase.from(vista).select("*").maybeSingle();
  if (error) {
    console.error(`[institucional] ${vista}`, error.message);
    return null;
  }
  return (data as T) ?? null;
}

async function leerVarios<T>(vista: string, orden?: { col: string; asc?: boolean }): Promise<T[]> {
  let q = supabase.from(vista).select("*");
  if (orden) q = q.order(orden.col, { ascending: orden.asc ?? true });
  const { data, error } = await q;
  if (error) {
    console.error(`[institucional] ${vista}`, error.message);
    return [];
  }
  return (data as T[]) ?? [];
}

export const obtenerKpiInstitucional = () => leerUno<KpiInstitucional>("v_kpi_institucional");
export const obtenerEsg = () => leerUno<EsgInstitucional>("v_esg_institucional");
export const obtenerSucursales = () =>
  leerVarios<KpiSucursal>("v_kpi_sucursal", { col: "cartera_bruta", asc: false });
export const obtenerCosechas = () => leerVarios<Cosecha>("v_cosechas", { col: "cosecha_mes" });
export const obtenerRubros = () =>
  leerVarios<ConcentracionRubro>("v_concentracion_rubro", { col: "cartera", asc: false });
export const obtenerExposicionClimatica = () =>
  leerVarios<ExposicionClimatica>("v_exposicion_climatica");
export const obtenerColocacion = () =>
  leerVarios<ColocacionMensual>("v_colocacion_mensual", { col: "mes" });

export async function obtenerParametros(): Promise<ParametroInstitucional[]> {
  const { data, error } = await supabase
    .from("parametros_institucionales")
    .select("clave, valor, descripcion, categoria, updated_at")
    .order("categoria")
    .order("clave");
  if (error) {
    console.error("[institucional] parametros", error.message);
    return [];
  }
  return (data as ParametroInstitucional[]) ?? [];
}

export async function obtenerBitacora(limite = 25): Promise<RegistroBitacora[]> {
  const { data, error } = await supabase
    .from("bitacora_auditoria")
    .select(
      "id, usuario_id, usuario_nombre, usuario_rol, accion, entidad, entidad_id, descripcion, ip, valor_nuevo, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) {
    console.error("[institucional] bitacora", error.message);
    return [];
  }
  return (data as RegistroBitacora[]) ?? [];
}

/** Carga todo el panel en paralelo. Una sola llamada desde la ruta. */
export async function cargarPanelInstitucional() {
  const [kpi, esg, sucursales, cosechas, rubros, clima, colocacion, parametros, bitacora] =
    await Promise.all([
      obtenerKpiInstitucional(),
      obtenerEsg(),
      obtenerSucursales(),
      obtenerCosechas(),
      obtenerRubros(),
      obtenerExposicionClimatica(),
      obtenerColocacion(),
      obtenerParametros(),
      obtenerBitacora(),
    ]);
  return { kpi, esg, sucursales, cosechas, rubros, clima, colocacion, parametros, bitacora };
}

// ── Formateadores ───────────────────────────────────────────────────────────
export const fmtC$ = (n: number | null | undefined) =>
  n == null ? "—" : `C$ ${Math.round(n).toLocaleString("es-NI")}`;

export const fmtC$corto = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `C$ ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `C$ ${Math.round(n / 1_000)}K`;
  return `C$ ${Math.round(n)}`;
};

export const fmtPct = (n: number | null | undefined, dec = 1) =>
  n == null ? "—" : `${Number(n).toFixed(dec)}%`;

export const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString("es-NI");

export const fmtMes = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-NI", { month: "short", year: "2-digit" });
};
