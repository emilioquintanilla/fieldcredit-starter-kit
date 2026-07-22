// Guarda automáticamente la SolicitudData en Supabase con debounce.
// Actualiza el badge "Guardado" (useExpedientesRemote.ultimoGuardado) al terminar.
import { useEffect, useRef } from "react";
import { guardarSolicitud, actualizarExpedienteHeader } from "@/services/expedientesService";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import type { SolicitudData } from "@/stores/expedientes";

const DEBOUNCE_MS = 800;

export function useAutosaveSolicitud(
  supabaseId: number | undefined,
  data: SolicitudData | undefined,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeraVez = useRef(true);
  const enVuelo = useRef(false);

  useEffect(() => {
    if (!supabaseId || !data) return;
    // Evita disparar el primer render inmediatamente después de hidratar.
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (enVuelo.current) return;
      enVuelo.current = true;
      try {
        await guardarSolicitud(supabaseId, data as Record<string, unknown>);
        // Sincroniza el header del expediente con los datos de identidad/crédito
        const nombre = [
          data.primer_nombre,
          data.segundo_nombre,
          data.primer_apellido,
          data.segundo_apellido,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        await actualizarExpedienteHeader(supabaseId, {
          cliente: nombre || null,
          cedula: data.cedula ?? null,
          tipo_producto: data.producto ?? null,
          monto_solicitado: data.monto ?? null,
          plazo_meses: data.plazo ?? null,
          actividad: data.tipo_actividad ?? null,
        });
        useExpedientesRemote.setState({ ultimoGuardado: Date.now() });
      } catch (e) {
        console.error("[autosave]", e);
      } finally {
        enVuelo.current = false;
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [supabaseId, data]);
}
