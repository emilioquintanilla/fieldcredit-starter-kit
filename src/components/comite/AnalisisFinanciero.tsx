// Métricas financieras clave devueltas por el dictamen IA.
import type { DictamenIA } from "@/stores/expedientes";

export function AnalisisFinanciero({ metricas }: { metricas: DictamenIA["metricas"] }) {
  const items: Array<{ k: string; v: number; sufijo: string; alerta?: boolean }> = [
    { k: "Capacidad de pago", v: metricas.capacidadPago, sufijo: "%", alerta: metricas.capacidadPago > 70 },
    { k: "Cobertura del flujo", v: metricas.coberturaFlujo, sufijo: "%", alerta: metricas.coberturaFlujo < 100 },
    { k: "Índice de endeudamiento", v: metricas.indiceEndeudamiento, sufijo: "%", alerta: metricas.indiceEndeudamiento > 60 },
    { k: "Cobertura de garantías", v: metricas.coberturaGarantias, sufijo: "%", alerta: metricas.coberturaGarantias < 100 },
  ];
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 text-base font-bold text-slate-800 dark:text-slate-100">📈 Análisis financiero</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.k} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
            <p className="text-xs text-slate-500">{it.k}</p>
            <p className={`text-lg font-bold ${it.alerta ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-100"}`}>
              {it.v.toFixed(1)}{it.sufijo}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
