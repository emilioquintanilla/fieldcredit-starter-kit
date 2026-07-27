// Pre-llenado de cuentas financieras desde los valores mensuales del flujo de efectivo.
// prefillDesde puede ser un string (una key) o un array de strings (múltiples fuentes que se suman).
import type { CuentaDef } from "@/data/cuentasFinancieras";

export interface ValorCuenta {
  valor: number;
  autoLlenado: boolean;
  editado: boolean;
}

/**
 * Obtiene el promedio mensual de una key del flujo.
 * Si la key no existe devuelve 0.
 */
function promedioKey(
  flujoValores: Record<string, number[]>,
  key: string,
  plazoMeses: number,
): number {
  const arr = flujoValores[key];
  if (!arr || arr.length === 0) return 0;
  const suma = arr.reduce((a, b) => a + (b || 0), 0);
  return suma <= 0 ? 0 : Math.round(suma / plazoMeses);
}

export function preLlenarDesdeflujo(
  flujoValores: Record<string, number[]> | undefined,
  cuentas: CuentaDef[],
  plazoMeses: number,
): Record<string, ValorCuenta> {
  const resultado: Record<string, ValorCuenta> = {};
  if (!flujoValores || plazoMeses <= 0) return resultado;

  cuentas.forEach((cuenta) => {
    const src = cuenta.prefillDesde;
    if (!src) return;

    // Soporte para una o varias fuentes
    const keys = Array.isArray(src) ? src : [src];
    const total = keys.reduce((acc, k) => acc + promedioKey(flujoValores, k, plazoMeses), 0);

    if (total > 0) {
      resultado[cuenta.id] = { valor: total, autoLlenado: true, editado: false };
    }
  });

  return resultado;
}
