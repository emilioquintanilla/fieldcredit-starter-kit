// Hidrata los módulos del expediente desde Supabase al abrir el detalle,
// una sola vez por expediente y solo cuando no hay datos locales.
import { useEffect, useRef } from "react";
import {
  obtenerFlujo,
  obtenerEstadoResultados,
  obtenerSituacionFinanciera,
  obtenerGeolocalizacion,
  obtenerFiador,
  obtenerGarantias,
  obtenerComite,
} from "@/services/expedientesService";
import { useExpedientes, type ExpedienteBorrador } from "@/stores/expedientes";

export function useHidratarExpediente(exp: ExpedienteBorrador | undefined) {
  const hidratarModulos = useExpedientes((s) => s.hidratarModulos);
  const hecho = useRef<Set<number>>(new Set());

  useEffect(() => {
    const supabaseId = exp?.supabaseId;
    if (!supabaseId || !exp) return;
    if (hecho.current.has(supabaseId)) return;
    hecho.current.add(supabaseId);

    (async () => {
      try {
        const [flujo, edr, sf, geo, fiador, garantias, comite] = await Promise.all([
          exp.flujo ? null : obtenerFlujo(supabaseId),
          exp.estadoResultados ? null : obtenerEstadoResultados(supabaseId),
          exp.situacionFinanciera ? null : obtenerSituacionFinanciera(supabaseId),
          exp.geolocalizacion ? null : obtenerGeolocalizacion(supabaseId),
          exp.fiador ? null : obtenerFiador(supabaseId),
          exp.garantias ? null : obtenerGarantias(supabaseId),
          exp.comite ? null : obtenerComite(supabaseId),
        ]);

        const patch: Parameters<typeof hidratarModulos>[1] = {};
        if (flujo) patch.flujo = flujo as unknown as ExpedienteBorrador["flujo"];
        if (edr) patch.estadoResultados = edr as unknown as ExpedienteBorrador["estadoResultados"];
        if (sf) patch.situacionFinanciera = sf as unknown as ExpedienteBorrador["situacionFinanciera"];
        if (geo) patch.geolocalizacion = geo as unknown as ExpedienteBorrador["geolocalizacion"];
        if (fiador) patch.fiador = fiador as unknown as ExpedienteBorrador["fiador"];
        if (garantias) patch.garantias = garantias as unknown as ExpedienteBorrador["garantias"];
        if (comite) patch.comite = comite as unknown as ExpedienteBorrador["comite"];
        if (Object.keys(patch).length > 0) hidratarModulos(exp.id, patch);
      } catch (e) {
        console.error("[hidratar expediente]", e);
      }
    })();
  }, [exp, hidratarModulos]);
}
