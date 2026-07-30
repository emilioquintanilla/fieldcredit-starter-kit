// Decisión del comité con SwipeToConfirm — reemplaza el botón estático.
// El asesor selecciona la decisión y DESLIZA para confirmar.
import { useState } from "react";
import { toast } from "sonner";
import { useExpedientes, type DecisionComite as TDecision } from "@/stores/expedientes";
import { SwipeToConfirm } from "@/components/ui/swipe-to-confirm";
import { AnimatedCheck } from "@/components/ui/animated-check";
import { cn } from "@/lib/utils";

type Accion = TDecision["decision"];

const OPCIONES: Array<{
  id: Accion;
  label: string;
  emoji: string;
  bg: string;
  bgSelected: string;
  swipeVariant: "success" | "warning" | "danger";
  swipeLabel: string;
  confirmedLabel: string;
}> = [
  {
    id: "aprobado",
    label: "Aprobar",
    emoji: "✅",
    bg: "bg-fieldcredit-green-pale text-fieldcredit-green-dark border-fieldcredit-green-light dark:bg-green-900/20 dark:text-green-200 dark:border-green-800/40",
    bgSelected: "bg-fieldcredit-green text-white border-fieldcredit-green ring-4 ring-fieldcredit-green/20 dark:ring-green-400/30",
    swipeVariant: "success",
    swipeLabel: "Deslice para aprobar crédito",
    confirmedLabel: "Crédito aprobado",
  },
  {
    id: "condicionado",
    label: "Con condición",
    emoji: "⚠️",
    bg: "bg-fieldcredit-amber-light text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/40",
    bgSelected: "bg-fieldcredit-amber text-white border-fieldcredit-amber ring-4 ring-fieldcredit-amber/20 dark:ring-amber-400/30",
    swipeVariant: "warning",
    swipeLabel: "Deslice para condicionar",
    confirmedLabel: "Crédito condicionado",
  },
  {
    id: "rechazado",
    label: "Rechazar",
    emoji: "❌",
    bg: "bg-fieldcredit-red-light text-fieldcredit-red border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800/40",
    bgSelected: "bg-fieldcredit-red text-white border-fieldcredit-red ring-4 ring-fieldcredit-red/20 dark:ring-red-400/30",
    swipeVariant: "danger",
    swipeLabel: "Deslice para rechazar crédito",
    confirmedLabel: "Crédito rechazado",
  },
];

export function DecisionComite({ expedienteId }: { expedienteId: string }) {
  const registrar = useExpedientes((s) => s.registrarDecisionComite);
  const existente = useExpedientes((s) => s.expedientes[expedienteId]?.comite?.decision);
  const [decision, setDecision] = useState<Accion | null>(existente?.decision ?? null);
  const [observacion, setObservacion] = useState(existente?.observacion ?? "");
  const [confirmado, setConfirmado] = useState(!!existente);

  const opcionSeleccionada = OPCIONES.find((o) => o.id === decision);

  const guardar = async () => {
    if (!decision) return;
    registrar(expedienteId, {
      decision,
      observacion: observacion.trim() || undefined,
      timestamp: new Date().toISOString(),
    });
    setConfirmado(true);
    toast.success(opcionSeleccionada?.confirmedLabel ?? "Decisión registrada");
  };

  // ── Estado confirmado ─────────────────────────────────────────
  if (confirmado && existente) {
    const opFinal = OPCIONES.find((o) => o.id === existente.decision);
    return (
      <div className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-foreground">⚖️ Decisión del comité</h3>
        <div className="flex flex-col items-center gap-3 py-4">
          <AnimatedCheck
            size={48}
            color={existente.decision === "aprobado" ? "green" : existente.decision === "condicionado" ? "amber" : "green"}
            label={opFinal?.confirmedLabel ?? `Decisión: ${existente.decision}`}
          />
          {existente.observacion && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              "{existente.observacion}"
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Registrada el {new Date(existente.timestamp).toLocaleString("es-NI")}
          </p>
        </div>
        <button
          onClick={() => { setConfirmado(false); setDecision(existente.decision); }}
          className="mt-2 w-full rounded-xl border border-border py-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          Modificar decisión
        </button>
      </div>
    );
  }

  // ── Estado de selección ───────────────────────────────────────
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-base font-bold text-foreground">⚖️ Decisión del comité</h3>

      {/* Botones de selección con estilo tonal */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {OPCIONES.map((op) => (
          <button
            key={op.id}
            onClick={() => setDecision(op.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 text-sm font-bold transition-all duration-200",
              decision === op.id ? op.bgSelected : op.bg,
              decision !== op.id && "hover:scale-[1.02]",
            )}
          >
            <span className="text-xl">{op.emoji}</span>
            <span>{op.label}</span>
          </button>
        ))}
      </div>

      {/* Textarea de observaciones */}
      <textarea
        rows={2}
        placeholder="Observaciones del comité (opcional)..."
        value={observacion}
        onChange={(e) => setObservacion(e.target.value)}
        className="mb-4 w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fieldcredit-teal/50 focus-visible:ring-offset-2"
      />

      {/* SwipeToConfirm — solo aparece cuando hay una decisión seleccionada */}
      {decision && opcionSeleccionada ? (
        <SwipeToConfirm
          label={opcionSeleccionada.swipeLabel}
          variant={opcionSeleccionada.swipeVariant}
          onConfirm={guardar}
          confirmedLabel={opcionSeleccionada.confirmedLabel}
        />
      ) : (
        <div className="flex h-14 items-center justify-center rounded-full bg-muted/50 text-sm text-muted-foreground">
          Seleccioná una decisión arriba para continuar
        </div>
      )}

      <p className="mt-3 text-center text-xs text-muted-foreground">
        La decisión queda registrada con fecha y hora. El desembolso se procesa en el Core de MiCrédito.
      </p>
    </div>
  );
}
