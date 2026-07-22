// Lista de banderas de cumplimiento agrupadas por semáforo.
import type { Bandera } from "@/stores/expedientes";

const CFG: Record<Bandera["tipo"], { bg: string; dot: string; borde: string }> = {
  verde: { bg: "bg-green-50 dark:bg-green-900/20", dot: "bg-green-500", borde: "border-green-200 dark:border-green-800" },
  amarillo: { bg: "bg-amber-50 dark:bg-amber-900/20", dot: "bg-amber-500", borde: "border-amber-200 dark:border-amber-800" },
  rojo: { bg: "bg-red-50 dark:bg-red-900/20", dot: "bg-red-500", borde: "border-red-200 dark:border-red-800" },
};

export function BanderasCumplimiento({ banderas }: { banderas: Bandera[] }) {
  const conteo = {
    verde: banderas.filter((b) => b.tipo === "verde").length,
    amarillo: banderas.filter((b) => b.tipo === "amarillo").length,
    rojo: banderas.filter((b) => b.tipo === "rojo").length,
  };
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-1 text-base font-bold text-slate-800 dark:text-slate-100">📋 Banderas de cumplimiento</h3>
      <p className="mb-3 text-xs text-slate-500">vs. manual de políticas CONAMI y política interna</p>
      <div className="mb-4 flex gap-2">
        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">● {conteo.verde} OK</span>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">● {conteo.amarillo} Atención</span>
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">● {conteo.rojo} Riesgo</span>
      </div>
      <div className="space-y-2">
        {banderas.map((b, i) => {
          const c = CFG[b.tipo];
          return (
            <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${c.bg} ${c.borde}`}>
              <div className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${c.dot}`} />
              <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">{b.texto}</p>
            </div>
          );
        })}
        {banderas.length === 0 && (
          <p className="text-xs text-slate-500">La IA no reportó banderas explícitas.</p>
        )}
      </div>
    </div>
  );
}
