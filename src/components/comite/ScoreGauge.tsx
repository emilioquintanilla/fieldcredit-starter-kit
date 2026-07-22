// Gauge semicircular con el score 0-100.
import type { DictamenIA } from "@/stores/expedientes";

const COLOR: Record<DictamenIA["semaforo"], string> = {
  verde: "#5eb837",
  amarillo: "#f59e0b",
  rojo: "#dc2626",
};

const LABEL: Record<DictamenIA["semaforo"], { emoji: string; texto: string; badge: string }> = {
  verde: { emoji: "🟢", texto: "Perfil saludable", badge: "bg-green-100 text-green-800" },
  amarillo: { emoji: "🟡", texto: "Requiere condición", badge: "bg-amber-100 text-amber-800" },
  rojo: { emoji: "🔴", texto: "Riesgo elevado", badge: "bg-red-100 text-red-800" },
};

export function ScoreGauge({ score, semaforo }: { score: number; semaforo: DictamenIA["semaforo"] }) {
  const color = COLOR[semaforo];
  const l = LABEL[semaforo];
  const circ = Math.PI * 64;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <svg viewBox="0 0 160 96" className="mx-auto w-full max-w-48">
        <path d="M16 80 A64 64 0 0 1 144 80" fill="none" stroke="#e2e8f0" strokeWidth="13" strokeLinecap="round" />
        <path
          d="M16 80 A64 64 0 0 1 144 80"
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />
        <text x="80" y="72" textAnchor="middle" fontSize="32" fontWeight="800" fill="currentColor">
          {score}
        </text>
        <text x="80" y="88" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">
          SCORE / 100
        </text>
      </svg>
      <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${l.badge}`}>
        <span>{l.emoji}</span>
        <span>{l.texto}</span>
      </div>
    </div>
  );
}
