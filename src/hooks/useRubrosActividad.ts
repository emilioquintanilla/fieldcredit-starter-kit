// Hook para obtener los rubros del flujo de efectivo según el tipo de actividad económica.
import {
  RUBROS_INGRESOS_FIJOS,
  RUBROS_INGRESOS_ESTACIONALES,
  RUBROS_COSTOS_PRODUCCION,
  ETIQUETAS_FLUJO,
  TIPOS_ACTIVIDAD,
  resolverTipoActividad,
  type TipoActividad,
  type EtiquetaFlujo,
} from "@/data/rubrosFlujoPorActividad";
import type { RubroDef } from "@/data/flujo-catalogos";

export interface UseRubrosActividadResult {
  tipoActividad: TipoActividad;
  ingresosFijos: RubroDef[];
  ingresosEstacionales: RubroDef[];
  costosProduccion: RubroDef[];
  etiquetas: EtiquetaFlujo;
  esAsalariado: boolean;
  esAgroResilia: boolean;
  esGanadero: boolean;
}

export function useRubrosActividad(tipoActividad?: string): UseRubrosActividadResult {
  const t = resolverTipoActividad(tipoActividad);
  return {
    tipoActividad: t,
    ingresosFijos:        RUBROS_INGRESOS_FIJOS[t],
    ingresosEstacionales: RUBROS_INGRESOS_ESTACIONALES[t],
    costosProduccion:     RUBROS_COSTOS_PRODUCCION[t],
    etiquetas:            ETIQUETAS_FLUJO[t],
    esAsalariado:         t === TIPOS_ACTIVIDAD.ASALARIADO,
    esAgroResilia:        t === TIPOS_ACTIVIDAD.AGRORESILIA,
    esGanadero:           t === TIPOS_ACTIVIDAD.GANADERIA,
  };
}
