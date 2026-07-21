// Hook que devuelve las cuentas financieras para la actividad económica dada.
import {
  CUENTAS_INGRESOS,
  CUENTAS_COSTOS,
  CUENTAS_GASTOS_OPERACION,
  CUENTAS_CONSUMO_FAMILIAR,
  CUENTAS_ACTIVOS,
  CUENTAS_PASIVOS,
  ETIQUETAS_ACTIVIDAD,
  TIPOS_ACTIVIDAD,
  type CuentaDef,
  type EtiquetaActividad,
  type TipoActividad,
} from "@/data/cuentasFinancieras";
import { resolverTipoActividad } from "@/data/rubrosFlujoPorActividad";

export interface UseCuentasResult {
  tipoActividad: TipoActividad;
  ingresos: CuentaDef[];
  costos: CuentaDef[];
  gastosOperacion: CuentaDef[];
  consumoFamiliar: CuentaDef[];
  activosCorriente: CuentaDef[];
  activosFijos: CuentaDef[];
  activosInmuebles: CuentaDef[];
  pasivosCorriente: CuentaDef[];
  pasivosLargoPlazo: CuentaDef[];
  etiquetas: EtiquetaActividad;
  esAsalariado: boolean;
  esAgroResilia: boolean;
  esMixto: boolean;
}

export function useCuentasActividad(tipoActividad?: string): UseCuentasResult {
  const tipo = resolverTipoActividad(tipoActividad);
  return {
    tipoActividad: tipo,
    ingresos: CUENTAS_INGRESOS[tipo],
    costos: CUENTAS_COSTOS[tipo],
    gastosOperacion: CUENTAS_GASTOS_OPERACION,
    consumoFamiliar: CUENTAS_CONSUMO_FAMILIAR,
    activosCorriente: [
      ...CUENTAS_ACTIVOS.corriente.base,
      ...(CUENTAS_ACTIVOS.corriente.porActividad[tipo] || []),
    ],
    activosFijos: [
      ...CUENTAS_ACTIVOS.fijo.base,
      ...(CUENTAS_ACTIVOS.fijo.porActividad[tipo] || []),
    ],
    activosInmuebles: CUENTAS_ACTIVOS.inmueble.base,
    pasivosCorriente: CUENTAS_PASIVOS.corriente,
    pasivosLargoPlazo: CUENTAS_PASIVOS.largo_plazo,
    etiquetas: ETIQUETAS_ACTIVIDAD[tipo],
    esAsalariado: tipo === TIPOS_ACTIVIDAD.ASALARIADO,
    esAgroResilia: tipo === TIPOS_ACTIVIDAD.AGRORESILIA,
    esMixto: tipo === TIPOS_ACTIVIDAD.MIXTO,
  };
}
