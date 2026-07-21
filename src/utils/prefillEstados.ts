// Pre-llenado de cuentas financieras desde los valores mensuales del flujo de efectivo.
import type { CuentaDef } from "@/data/cuentasFinancieras";

export interface ValorCuenta {
  valor: number;
  autoLlenado: boolean;
  editado: boolean;
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
    const arr = flujoValores[src];
    if (!arr || arr.length === 0) return;
    const suma = arr.reduce((a, b) => a + (b || 0), 0);
    if (suma <= 0) return;
    const promedio = Math.round(suma / plazoMeses);
    if (promedio > 0) {
      resultado[cuenta.id] = { valor: promedio, autoLlenado: true, editado: false };
    }
  });

  return resultado;
}
