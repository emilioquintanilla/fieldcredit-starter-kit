/**
 * Implementación Supabase de FuenteDatosCore.
 * Lee las vistas v_* ya creadas en el SQL del Bloque C.
 * Ruta: src/services/core/fuenteSupabase.ts
 */
import { supabase } from "@/lib/supabase";
import type {
  FuenteDatosCore, FiltrosCartera, CreditoCartera, KpiInstitucional,
  KpiSucursal, KpiAsesor, Cosecha, ConcentracionRubro, EsgInstitucional,
  ExposicionClimatica, ColocacionMensual, AlertaClimatica,
  ProductoCredito, ParametroInstitucional,
} from "./tipos";

async function vista<T>(nombre: string, orden?: string): Promise<T[]> {
  let q = supabase.from(nombre).select("*");
  if (orden) q = q.order(orden);
  const { data, error } = await q;
  if (error) { console.error(`[core:supabase] ${nombre}`, error.message); return []; }
  return (data as T[]) ?? [];
}

async function vistaUna<T>(nombre: string): Promise<T | null> {
  const { data, error } = await supabase.from(nombre).select("*").maybeSingle();
  if (error) { console.error(`[core:supabase] ${nombre}`, error.message); return null; }
  return (data as T) ?? null;
}

export const fuenteSupabase: FuenteDatosCore = {
  obtenerCartera: async (f: FiltrosCartera) => {
    let q = supabase.from("v_cartera").select("*");
    if (f.sucursalId)  q = q.eq("sucursal_id", f.sucursalId);
    if (f.asesorId)    q = q.eq("asesor_id", f.asesorId);
    if (f.esVerde !== undefined) q = q.eq("es_verde", f.esVerde);
    if (f.bucketMora)  q = q.eq("bucket_mora", f.bucketMora);
    if (f.desde)       q = q.gte("fecha_desembolso", f.desde);
    if (f.hasta)       q = q.lte("fecha_desembolso", f.hasta);
    const { data, error } = await q;
    if (error) { console.error("[core:supabase] v_cartera", error.message); return []; }
    return (data as CreditoCartera[]) ?? [];
  },
  obtenerKpiInstitucional: () => vistaUna<KpiInstitucional>("v_kpi_institucional"),
  obtenerKpiSucursales:    () => vista<KpiSucursal>("v_kpi_sucursal", "cartera_bruta"),
  obtenerKpiAsesores: async (sucursalId?: number) => {
    let q = supabase.from("v_kpi_asesor").select("*");
    if (sucursalId) q = q.eq("sucursal_id", sucursalId);
    const { data, error } = await q;
    if (error) { console.error("[core:supabase] v_kpi_asesor", error.message); return []; }
    return (data as KpiAsesor[]) ?? [];
  },
  obtenerCosechas:            () => vista<Cosecha>("v_cosechas", "cosecha_mes"),
  obtenerConcentracionRubro:  () => vista<ConcentracionRubro>("v_concentracion_rubro"),
  obtenerEsg:                 () => vistaUna<EsgInstitucional>("v_esg_institucional"),
  obtenerExposicionClimatica: () => vista<ExposicionClimatica>("v_exposicion_climatica"),
  obtenerColocacionMensual:   () => vista<ColocacionMensual>("v_colocacion_mensual", "mes"),
  obtenerAlertas: () => vista<AlertaClimatica>("alertas_climaticas"),
  obtenerProductos: () => vista<ProductoCredito>("productos_credito", "nombre"),
  obtenerParametros: async () => {
    const { data, error } = await supabase
      .from("parametros_institucionales")
      .select("clave,valor,descripcion,categoria,updated_at")
      .order("categoria").order("clave");
    if (error) { console.error("[core:supabase] parametros", error.message); return []; }
    return (data as ParametroInstitucional[]) ?? [];
  },
};
