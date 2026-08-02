// src/components/comite/RecomendacionIA.tsx
// Recomendación del Copiloto IA con disclaimer.
// Ícono: ⚖️ emoji → Lucide Scale (unificación design system)
import { Scale } from "lucide-react";
import type { RecomendacionIA as Reco } from "@/stores/expedientes";

export function RecomendacionIA({ recomendacion }: { recomendacion: Reco }) {
  return (
    <div className="mb-4 rounded-2xl bg-fieldcredit-green-dark p-5 text-white">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-fieldcredit-teal-light">
        Recomendación del Copiloto IA
      </p>
      <p className="mb-4 text-sm leading-relaxed">{recomendacion.texto || "Sin recomendación textual."}</p>
      {recomendacion.condiciones?.length > 0 && (
        <div className="mb-4 rounded-xl bg-white/10 p-3">
          <p className="mb-2 text-xs font-bold">Condiciones sugeridas:</p>
          <ul className="space-y-1">
            {recomendacion.condiciones.map((c, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="text-fieldcredit-teal-light">›</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl border border-amber-400/40 bg-amber-500/20 p-3">
        <p className="flex items-start gap-2 text-xs text-amber-100">
          <Scale size={14} strokeWidth={1.8} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
          <span>
            <strong>La IA no aprueba ni desembolsa.</strong> Esta es una recomendación de análisis. La
            decisión final la toma el oficial de crédito del comité, en apego a la normativa CONAMI.
          </span>
        </p>
      </div>
    </div>
  );
}
