// Botones de decisión del comité (aprobar / condicionar / rechazar) con textarea.
import { useState } from "react";
import { useExpedientes, type DecisionComite as TDecision } from "@/stores/expedientes";
import { cn } from "@/lib/utils";

type Accion = TDecision["decision"];

const OPCIONES: Array<{ id: Accion; label: string; bg: string }> = [
  { id: "aprobado", label: "Aprobar", bg: "bg-green-500" },
  { id: "condicionado", label: "Con condición", bg: "bg-amber-500" },
  { id: "rechazado", label: "Rechazar", bg: "bg-red-500" },
];

export function DecisionComite({ expedienteId }: { expedienteId: string }) {
  const registrar = useExpedientes((s) => s.registrarDecisionComite);
  const existente = useExpedientes((s) => s.expedientes[expedienteId]?.comite?.decision);
  const [decision, setDecision] = useState<Accion | null>(existente?.decision ?? null);
  const [observacion, setObservacion] = useState(existente?.observacion ?? "");

  const guardar = () => {
    if (!decision) return;
    registrar(expedienteId, {
      decision,
      observacion: observacion.trim() || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  const yaGuardado = !!existente;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-slate-100">⚖️ Decisión del comité</h3>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {OPCIONES.map((op) => (
          <button
            key={op.id}
            onClick={() => setDecision(op.id)}
            className={cn(
              "rounded-xl py-3 text-sm font-bold text-white transition-all",
              op.bg,
              decision === op.id ? "scale-105 ring-4 ring-slate-300 ring-offset-2 dark:ring-slate-600" : "opacity-70 hover:opacity-100",
            )}
          >
            {op.label}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        placeholder="Observaciones del comité (opcional)..."
        value={observacion}
        onChange={(e) => setObservacion(e.target.value)}
        className="mb-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
      />
      <button
        onClick={guardar}
        disabled={!decision}
        className="w-full rounded-xl bg-fieldcredit-green py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
      >
        {yaGuardado ? `✅ Decisión registrada (${existente?.decision})` : "Registrar decisión del comité"}
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">
        La decisión queda registrada con fecha y hora. El desembolso se procesa en el Core de MiCrédito.
      </p>
    </div>
  );
}
