// Guarda automáticamente la SolicitudData en Supabase con debounce,
// además de un autoguardado periódico y un guardado al ocultar/cerrar la
// pestaña, para que nunca se pierdan cambios al recargar la página.
// Actualiza el badge "Guardado" (useExpedientesRemote.ultimoGuardado) al terminar.
import { useEffect, useRef } from "react";
import { guardarSolicitud, actualizarExpedienteHeader } from "@/services/expedientesService";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import type { SolicitudData } from "@/stores/expedientes";

const DEBOUNCE_MS = 800;
const INTERVALO_MS = 15_000; // autoguardado periódico

export function useAutosaveSolicitud(
  supabaseId: number | undefined,
  data: SolicitudData | undefined,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeraVez = useRef(true);
  const enVuelo = useRef(false);
  // Snapshot siempre fresco para el guardado periódico / al cerrar pestaña.
  const ultimoRef = useRef<{ id?: number; data?: SolicitudData }>({});
  ultimoRef.current = { id: supabaseId, data };
  const pendiente = useRef(false);

  const guardarRef = useRef(async () => {});
  guardarRef.current = async () => {
    const { id, data: d } = ultimoRef.current;
    if (!id || !d || enVuelo.current) return;
    enVuelo.current = true;
    useExpedientesRemote.setState({ guardandoSolicitud: true });
    try {
      await guardarSolicitud(id, d as Record<string, unknown>);
      const nombre = [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
        .filter(Boolean)
        .join(" ")
        .trim();
      await actualizarExpedienteHeader(id, {
        cliente: nombre || null,
        cedula: d.cedula ?? null,
        tipo_producto: d.producto ?? null,
        monto_solicitado: d.monto ?? null,
        plazo_meses: d.plazo ?? null,
        actividad: d.tipo_actividad ?? null,
      });
      pendiente.current = false;
      useExpedientesRemote.setState({ ultimoGuardado: Date.now(), errorGuardado: null });
    } catch (e) {
      console.error("[autosave]", e);
      useExpedientesRemote.setState({
        errorGuardado: e instanceof Error ? e.message : "No se pudo guardar en la nube",
      });
    } finally {
      enVuelo.current = false;
      useExpedientesRemote.setState({ guardandoSolicitud: false });
    }
  };

  // Guardado con debounce ante cada cambio
  useEffect(() => {
    if (!supabaseId || !data) return;
    // Evita disparar el primer render inmediatamente después de hidratar.
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    pendiente.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void guardarRef.current(), DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [supabaseId, data]);

  // Autoguardado periódico + guardado al ocultar o cerrar la pestaña
  useEffect(() => {
    if (!supabaseId) return;

    const intervalo = setInterval(() => {
      if (pendiente.current) void guardarRef.current();
    }, INTERVALO_MS);

    const alSalir = () => {
      if (pendiente.current) void guardarRef.current();
    };
    const alOcultar = () => {
      if (document.visibilityState === "hidden") alSalir();
    };

    window.addEventListener("beforeunload", alSalir);
    window.addEventListener("pagehide", alSalir);
    document.addEventListener("visibilitychange", alOcultar);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener("beforeunload", alSalir);
      window.removeEventListener("pagehide", alSalir);
      document.removeEventListener("visibilitychange", alOcultar);
      // Guarda lo pendiente al desmontar (navegación interna).
      if (pendiente.current) void guardarRef.current();
    };
  }, [supabaseId]);
}
