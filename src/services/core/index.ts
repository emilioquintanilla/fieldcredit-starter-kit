/**
 * Punto de entrada de la capa de datos.
 * Cambia VITE_FUENTE_DATOS en .env para alternar entre fuentes:
 *   "supabase"  → lee vistas SQL de Supabase (activo hoy)
 *   "api_core"  → consume la API REST del core financiero de MiCrédito
 *
 * Ningún componente importa directamente de fuenteSupabase o fuenteApiCore.
 *
 * Ruta: src/services/core/index.ts
 */
import type { FuenteDatosCore } from "./tipos";

// Importación dinámica para no cargar el adaptador inactivo
const fuente = import.meta.env.VITE_FUENTE_DATOS ?? "supabase";

let _instancia: FuenteDatosCore | null = null;

export async function getFuenteCore(): Promise<FuenteDatosCore> {
  if (_instancia) return _instancia;
  if (fuente === "api_core") {
    const { fuenteApiCore } = await import("./fuenteApiCore");
    _instancia = fuenteApiCore;
  } else {
    const { fuenteSupabase } = await import("./fuenteSupabase");
    _instancia = fuenteSupabase;
  }
  return _instancia;
}

export type { FuenteDatosCore, FiltrosCartera, KpiInstitucional, KpiSucursal,
  KpiAsesor, Cosecha, ConcentracionRubro, EsgInstitucional,
  ExposicionClimatica, ColocacionMensual, CreditoCartera } from "./tipos";
