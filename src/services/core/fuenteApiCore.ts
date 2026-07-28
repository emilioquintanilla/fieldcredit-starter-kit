/**
 * Adaptador stub para la API del core financiero de MiCrédito.
 *
 * Cuando el equipo de TI entregue el contrato REST, este archivo es el único
 * que cambia. Ningún componente ni hook necesita modificarse.
 *
 * Activar: VITE_FUENTE_DATOS=api_core en .env
 *
 * Ruta: src/services/core/fuenteApiCore.ts
 */
import type { FuenteDatosCore, FiltrosCartera } from "./tipos";

const BASE = import.meta.env.VITE_CORE_API_URL ?? "";
const KEY  = import.meta.env.VITE_CORE_API_KEY  ?? "";

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { "x-api-key": KEY, "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`Core API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const fuenteApiCore: FuenteDatosCore = {
  // ── Cartera ──────────────────────────────────────────────────────────────
  // GET /v1/cartera?sucursal_id=&asesor_id=&es_verde=&bucket_mora=&desde=&hasta=
  obtenerCartera: (f: FiltrosCartera) =>
    get("/v1/cartera", {
      ...(f.sucursalId  ? { sucursal_id:  String(f.sucursalId)  } : {}),
      ...(f.asesorId    ? { asesor_id:    String(f.asesorId)    } : {}),
      ...(f.esVerde     !== undefined ? { es_verde: String(f.esVerde) } : {}),
      ...(f.bucketMora  ? { bucket_mora:  f.bucketMora } : {}),
      ...(f.desde       ? { desde:        f.desde      } : {}),
      ...(f.hasta       ? { hasta:        f.hasta      } : {}),
    }),

  // GET /v1/kpi/institucional
  obtenerKpiInstitucional: () => get("/v1/kpi/institucional"),

  // GET /v1/kpi/sucursales
  obtenerKpiSucursales: () => get("/v1/kpi/sucursales"),

  // GET /v1/kpi/asesores?sucursal_id=
  obtenerKpiAsesores: (sucursalId?: number) =>
    get("/v1/kpi/asesores", sucursalId ? { sucursal_id: String(sucursalId) } : {}),

  // GET /v1/cosechas
  obtenerCosechas: () => get("/v1/cosechas"),

  // GET /v1/concentracion-rubro
  obtenerConcentracionRubro: () => get("/v1/concentracion-rubro"),

  // GET /v1/esg
  obtenerEsg: () => get("/v1/esg"),

  // GET /v1/exposicion-climatica
  obtenerExposicionClimatica: () => get("/v1/exposicion-climatica"),

  // GET /v1/colocacion-mensual
  obtenerColocacionMensual: () => get("/v1/colocacion-mensual"),

  // ── Catálogos ─────────────────────────────────────────────────────────────
  // GET /v1/alertas-climaticas
  obtenerAlertas: () => get("/v1/alertas-climaticas"),

  // GET /v1/productos
  obtenerProductos: () => get("/v1/productos"),

  // GET /v1/parametros
  obtenerParametros: () => get("/v1/parametros"),
};

/*
 * CONTRATO ESPERADO DE LA API DEL CORE
 * ──────────────────────────────────────────────────────────────────────────
 * Autenticación : header  x-api-key: <token>
 * Base URL      : VITE_CORE_API_URL  (ej. https://core.micredito.com.ni/api)
 * Formato       : application/json
 * Paginación    : ?page=1&page_size=100 (para /v1/cartera con muchos registros)
 *
 * Shapes esperados por endpoint:
 *
 * GET /v1/cartera
 *   → CreditoCartera[] (ver tipos.ts)
 *   Campos mínimos: id, codigo, cliente, cedula, asesor_id, sucursal_id,
 *     producto_id, monto_desembolsado, saldo_capital, tasa_anual,
 *     plazo_meses, fecha_desembolso, fecha_vencimiento, estado,
 *     rubro, departamento, municipio, lat, lng, dias_atraso, bucket_mora,
 *     es_verde, genero, es_joven, es_rural, microseguro, ars_nivel
 *
 * GET /v1/kpi/institucional
 *   → KpiInstitucional (ver tipos.ts)
 *   Campos: creditos_activos, clientes_activos, cartera_bruta, par30,
 *     par60, par90, pct_cartera_verde, cartera_verde, par30_verde,
 *     par30_tradicional, tasa_promedio, saldo_promedio
 *
 * GET /v1/kpi/sucursales
 *   → KpiSucursal[]
 *
 * GET /v1/kpi/asesores?sucursal_id=
 *   → KpiAsesor[]
 *
 * GET /v1/cosechas
 *   → Cosecha[]  (mes, creditos, monto_colocado, saldo_vigente, par30)
 *
 * GET /v1/concentracion-rubro
 *   → ConcentracionRubro[]  (rubro, cartera, pct_cartera, par30)
 *
 * GET /v1/esg
 *   → EsgInstitucional  (ver tipos.ts)
 *
 * GET /v1/exposicion-climatica
 *   → ExposicionClimatica[]
 *
 * GET /v1/colocacion-mensual
 *   → ColocacionMensual[]
 *
 * GET /v1/alertas-climaticas
 *   → AlertaClimatica[]
 *
 * GET /v1/productos
 *   → ProductoCredito[]
 *
 * GET /v1/parametros
 *   → ParametroInstitucional[]
 * ──────────────────────────────────────────────────────────────────────────
 */
