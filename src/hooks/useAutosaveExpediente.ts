// Autosave por módulo: observa cada slice del expediente y lo persiste en
// Supabase con debounce. Actualiza el badge "Guardado" del NavBar.
import { useEffect, useRef } from "react";
import {
  guardarFlujo,
  guardarEstadoResultados,
  guardarSituacionFinanciera,
  guardarGeolocalizacion,
  guardarFiador,
  guardarGarantias,
  guardarComite,
} from "@/services/expedientesService";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import type { ExpedienteBorrador } from "@/stores/expedientes";

const DEBOUNCE_MS = 900;

type Saver = (id: number, d: Record<string, unknown>) => Promise<void>;

function useAutosaveSlice<T>(
  supabaseId: number | undefined,
  slice: T | undefined,
  saver: Saver,
  etiqueta: string,
) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeraVez = useRef(true);
  useEffect(() => {
    if (!supabaseId || slice === undefined) return;
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      try {
        await saver(supabaseId, slice as unknown as Record<string, unknown>);
        useExpedientesRemote.setState({ ultimoGuardado: Date.now() });
      } catch (e) {
        console.error(`[autosave:${etiqueta}]`, e);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [supabaseId, slice, saver, etiqueta]);
}

export function useAutosaveExpediente(exp: ExpedienteBorrador | undefined) {
  const supabaseId = exp?.supabaseId;
  useAutosaveSlice(supabaseId, exp?.flujo, guardarFlujo, "flujo");
  useAutosaveSlice(supabaseId, exp?.estadoResultados, guardarEstadoResultados, "edr");
  useAutosaveSlice(supabaseId, exp?.situacionFinanciera, guardarSituacionFinanciera, "sf");
  useAutosaveSlice(supabaseId, exp?.geolocalizacion, guardarGeolocalizacion, "geo");
  useAutosaveSlice(supabaseId, exp?.fiador, guardarFiador, "fiador");
  useAutosaveSlice(supabaseId, exp?.garantias, guardarGarantias, "garantias");
  useAutosaveSlice(supabaseId, exp?.comite, guardarComite, "comite");
}
