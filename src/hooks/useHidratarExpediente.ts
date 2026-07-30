// Sincronización cross-device del expediente.
// Al abrir el detalle SIEMPRE se consulta Supabase (fuente de verdad) y se
// fusiona el resultado en el store local. Los datos locales nunca bloquean
// una carga fresca.
import { useEffect, useRef, useState } from "react";
import {
  obtenerExpediente,
  obtenerSolicitud,
  obtenerFlujo,
  obtenerEstadoResultados,
  obtenerSituacionFinanciera,
  obtenerGeolocalizacion,
  obtenerFiador,
  obtenerGarantias,
  obtenerComite,
} from "@/services/expedientesService";
import { useExpedientes, type ExpedienteBorrador, type SolicitudData } from "@/stores/expedientes";

/**
 * Carga el expediente `idParam` desde Supabase y lo fusiona en el store local.
 * `idParam` puede ser el id numérico de Supabase (caso normal, viene del listado)
 * o un código local heredado (`SOL-2026-1234`) que ya tenga `supabaseId`.
 */
export function useCargarExpediente(idParam: string) {
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const yaCorrio = useRef<string | null>(null);

  useEffect(() => {
    if (yaCorrio.current === idParam) return;
    yaCorrio.current = idParam;

    const store = useExpedientes.getState();
    const local = store.expedientes[idParam];
    const numerico = Number(idParam);
    const supabaseId =
      local?.supabaseId ?? (Number.isFinite(numerico) && numerico > 0 ? numerico : undefined);

    if (!supabaseId) {
      setCargando(false);
      setNoEncontrado(!local);
      return;
    }

    let cancelado = false;
    setCargando(!local);

    (async () => {
      try {
        const [cabecera, solicitud, flujo, edr, sf, geo, fiador, garantias, comite] =
          await Promise.all([
            obtenerExpediente(supabaseId),
            obtenerSolicitud(supabaseId),
            obtenerFlujo(supabaseId),
            obtenerEstadoResultados(supabaseId),
            obtenerSituacionFinanciera(supabaseId),
            obtenerGeolocalizacion(supabaseId),
            obtenerFiador(supabaseId),
            obtenerGarantias(supabaseId),
            obtenerComite(supabaseId),
          ]);

        if (cancelado) return;

        if (!cabecera && !local) {
          setNoEncontrado(true);
          setCargando(false);
          return;
        }

        const s = useExpedientes.getState();
        if (!s.expedientes[idParam]) s.crearExpediente(idParam);
        s.setSupabaseId(idParam, supabaseId);

        // Solicitud: lo remoto es lo último guardado por cualquier dispositivo.
        const dataRemota: SolicitudData = {
          ...((solicitud as SolicitudData | null) ?? {}),
        };
        if (cabecera?.codigo) dataRemota.numero_solicitud = cabecera.codigo;
        if (Object.keys(dataRemota).length > 0) s.hidratarSolicitud(idParam, dataRemota);

        const patch: Parameters<typeof s.hidratarModulos>[1] = {};
        if (flujo) patch.flujo = flujo as unknown as ExpedienteBorrador["flujo"];
        if (edr) patch.estadoResultados = edr as unknown as ExpedienteBorrador["estadoResultados"];
        if (sf) patch.situacionFinanciera = sf as unknown as ExpedienteBorrador["situacionFinanciera"];
        if (geo) patch.geolocalizacion = geo as unknown as ExpedienteBorrador["geolocalizacion"];
        if (fiador) patch.fiador = fiador as unknown as ExpedienteBorrador["fiador"];
        if (garantias) patch.garantias = garantias as unknown as ExpedienteBorrador["garantias"];
        if (comite) patch.comite = comite as unknown as ExpedienteBorrador["comite"];
        if (Object.keys(patch).length > 0) s.hidratarModulos(idParam, patch);
      } catch (e) {
        console.error("[cargar expediente]", e);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [idParam]);

  return { cargando, noEncontrado };
}

// Compatibilidad con llamadas previas.
export function useHidratarExpediente(exp: ExpedienteBorrador | undefined) {
  useCargarExpediente(exp?.id ?? "");
}
