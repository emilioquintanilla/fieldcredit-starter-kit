/**
 * useSincronizarEstados — Motor de sincronización reactiva entre flujo y estados financieros.
 *
 * PROBLEMA QUE RESUELVE:
 * Antes, el pre-llenado solo corría UNA VEZ al abrir el módulo de Resultados,
 * y nunca corría para la Situación Financiera. El asesor llenaba el flujo completo
 * y debía re-ingresar manualmente cada valor en los dos estados restantes.
 *
 * SOLUCIÓN:
 * Este hook observa los valores del flujo de efectivo. Cada vez que cambian,
 * recalcula los promedios de todas las cuentas con prefillDesde y actualiza
 * automáticamente el Estado de Resultados Y la Situación Financiera,
 * RESPETANDO los campos que el asesor editó manualmente (editado: true).
 *
 * CONTRATO:
 * - No sobreescribe valores con editado: true.
 * - Sí actualiza valores con autoLlenado: true y editado: false (el asesor no los tocó).
 * - Se monta una sola vez en ExpedienteDetalle y corre en background.
 * - Tiene debounce de 800ms para no correr en cada tecla del flujo.
 *
 * Ruta: src/hooks/useSincronizarEstados.ts
 */
import { useEffect, useRef } from "react";
import { useExpedientes } from "@/stores/expedientes";
import { preLlenarDesdeflujo } from "@/utils/prefillEstados";
import {
  CUENTAS_INGRESOS, CUENTAS_COSTOS, CUENTAS_GASTOS_OPERACION,
  CUENTAS_CONSUMO_FAMILIAR, CUENTAS_ACTIVOS, CUENTAS_PASIVOS,
  type CuentaDef,
} from "@/data/cuentasFinancieras";
import { resolverTipoActividad } from "@/data/rubrosFlujoPorActividad";

const DEBOUNCE_MS = 800;

export function useSincronizarEstados(expedienteId: string) {
  const hidratar = useExpedientes((s) => s.hidratarEstadoDesdeflujo);

  // Escuchamos solo lo que necesitamos del store para no re-renderizar todo
  const flujoValores = useExpedientes(
    (s) => s.expedientes[expedienteId]?.flujo?.valores,
  );
  const flujoActivos = useExpedientes(
    (s) => s.expedientes[expedienteId]?.flujo?.rubrosActivos,
  );
  const plazoMeses = useExpedientes(
    (s) => s.expedientes[expedienteId]?.flujo?.plazoMeses ?? 0,
  );
  const tipoActividadRaw = useExpedientes((s) => {
    const exp = s.expedientes[expedienteId];
    return exp?.data.producto === "agroresilia"
      ? "AgroResilia"
      : (exp?.data.tipo_actividad ?? "");
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Limpiar timer anterior para debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!flujoValores || plazoMeses <= 0) return;

      const tipo = resolverTipoActividad(tipoActividadRaw);

      // ── Cuentas del Estado de Resultados ──────────────────────────────────
      const cuentasResultados: CuentaDef[] = [
        ...CUENTAS_INGRESOS[tipo],
        ...CUENTAS_COSTOS[tipo],
        ...CUENTAS_GASTOS_OPERACION,
        ...CUENTAS_CONSUMO_FAMILIAR,
      ];

      const valoresResultados = preLlenarDesdeflujo(
        flujoValores,
        cuentasResultados,
        plazoMeses,
      );

      if (Object.keys(valoresResultados).length > 0) {
        hidratar(expedienteId, "resultados", tipoActividadRaw, valoresResultados);
      }

      // ── Cuentas de Situación Financiera ───────────────────────────────────
      // La Situación Financiera refleja el PATRIMONIO (balances), no flujos.
      // Sin embargo, algunas cuentas se pueden estimar desde el flujo:
      // - Deudas con MiCrédito → cuotas actuales en bloque E
      // - Deudas con otras IMF → otrasIMF en bloque E
      // El resto (activos, inmuebles) requiere declaración directa del cliente.
      const cuentasSituacion: CuentaDef[] = [
        // Activos corriente con prefill
        ...CUENTAS_ACTIVOS.corriente.base,
        ...(CUENTAS_ACTIVOS.corriente.porActividad[tipo] ?? []),
        // Activos fijos — sin prefill (el asesor los declara)
        ...CUENTAS_ACTIVOS.fijo.base,
        ...(CUENTAS_ACTIVOS.fijo.porActividad[tipo] ?? []),
        // Inmuebles — sin prefill
        ...CUENTAS_ACTIVOS.inmueble.base,
        // Pasivos — se mapean desde deudas declaradas en el flujo
        ...CUENTAS_PASIVOS.corriente,
        ...CUENTAS_PASIVOS.largo_plazo,
      ];

      // Añadir mapeo directo de deudas del flujo → pasivos del balance
      // (estos no tienen prefillDesde en cuentasFinancieras porque son montos
      //  de saldo, no flujos mensuales, pero los estimamos del bloque E)
      const pasivosEstimados: Record<string, { valor: number; autoLlenado: boolean; editado: boolean }> = {};

      const micredito = flujoValores["micredito"];
      if (micredito && micredito.length > 0) {
        // Cuota mensual × plazo = estimación del saldo (aprox)
        const cuotaPromMicredito = micredito.reduce((a, b) => a + (b || 0), 0) / micredito.length;
        if (cuotaPromMicredito > 0) {
          pasivosEstimados["deuda_micredito"] = {
            valor: Math.round(cuotaPromMicredito * plazoMeses),
            autoLlenado: true,
            editado: false,
          };
        }
      }

      const otrasIMF = flujoValores["otrasIMF"];
      if (otrasIMF && otrasIMF.length > 0) {
        const cuotaProm = otrasIMF.reduce((a, b) => a + (b || 0), 0) / otrasIMF.length;
        if (cuotaProm > 0) {
          pasivosEstimados["deuda_otras_imf"] = {
            valor: Math.round(cuotaProm * 12), // estimamos deuda como 12 cuotas
            autoLlenado: true,
            editado: false,
          };
        }
      }

      const valoresSituacion = preLlenarDesdeflujo(
        flujoValores,
        cuentasSituacion,
        plazoMeses,
      );

      // Combinar con los pasivos estimados (sin sobreescribir editados)
      const combinado = { ...valoresSituacion, ...pasivosEstimados };

      if (Object.keys(combinado).length > 0) {
        hidratar(expedienteId, "situacion", tipoActividadRaw, combinado);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // Corre cada vez que cambian los valores o los rubros activos del flujo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flujoValores, flujoActivos, plazoMeses, tipoActividadRaw]);
}
