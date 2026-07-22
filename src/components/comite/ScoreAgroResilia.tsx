// Tarjeta AgroResilia Score (ARS) — solo si el producto es AgroResilia.
import type { ScoreARS } from "@/stores/expedientes";

const NIVELES: Record<ScoreARS["nivel"], { label: string; color: string; rango: string }> = {
  verde_preferencial: { label: "Verde preferencial", color: "#5eb837", rango: "85-100" },
  verde_estandar: { label: "Verde estándar", color: "#4a7c2f", rango: "70-84" },
  amarillo: { label: "Amarillo condicionado", color: "#f59e0b", rango: "50-69" },
  rojo: { label: "Rojo — plan previo", color: "#dc2626", rango: "< 50" },
};

export function ScoreAgroResilia({ ars }: { ars: ScoreARS }) {
  const nivel = NIVELES[ars.nivel] || NIVELES.amarillo;
  return (
    <div
      className="mb-4 rounded-2xl border-2 p-5"
      style={{ borderColor: nivel.color, background: `${nivel.color}10` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">🌿</span>
        <div>
          <h3 className="text-sm font-bold" style={{ color: nivel.color }}>
            AgroResilia Score (ARS)
          </h3>
          <p className="text-xs text-slate-500">Calificación climático-crediticia · Rango {nivel.rango}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-3xl font-black" style={{ color: nivel.color }}>{ars.score}</p>
          <p className="text-xs text-slate-500">/ 100</p>
        </div>
      </div>
      <div
        className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-bold text-white"
        style={{ background: nivel.color }}
      >
        {nivel.label}
      </div>
      {ars.variables?.length > 0 && (
        <div className="mb-3 space-y-2">
          {ars.variables.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-36 flex-shrink-0 text-xs text-slate-500">{v.nombre}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-200">
                <div className="h-2 rounded-full transition-all" style={{ width: `${v.puntaje}%`, background: nivel.color }} />
              </div>
              <span className="w-10 text-right text-xs font-bold" style={{ color: nivel.color }}>{v.puntaje}%</span>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/60">
        <p className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-200">Condiciones crediticias según ARS:</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {ars.tasa && <>Tasa: <strong>{ars.tasa}</strong> · </>}
          {ars.condiciones}
        </p>
      </div>
    </div>
  );
}
