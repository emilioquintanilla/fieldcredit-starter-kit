// Indicador del estado del autoguardado: "Guardando…" / "Guardado" con fecha y hora.
import { Check, CloudOff, Loader2 } from "lucide-react";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import { cn } from "@/lib/utils";

const fmt = (ts: number) =>
  new Date(ts).toLocaleString("es-NI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtHora = (ts: number) =>
  new Date(ts).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" });

interface Props {
  variante?: "completo" | "compacto";
  className?: string;
}

export function EstadoAutoguardado({ variante = "completo", className }: Props) {
  const guardando = useExpedientesRemote((s) => s.guardandoSolicitud);
  const ultimo = useExpedientesRemote((s) => s.ultimoGuardado);
  const error = useExpedientesRemote((s) => s.errorGuardado);

  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold";

  if (guardando) {
    return (
      <span
        className={cn(base, "bg-fieldcredit-teal-pale text-fieldcredit-teal-dark dark:bg-teal-900/40 dark:text-teal-200", className)}
        aria-live="polite"
      >
        <Loader2 size={12} className="animate-spin" /> Guardando…
      </span>
    );
  }

  if (error) {
    return (
      <span
        className={cn(base, "bg-rose-50 text-fieldcredit-red dark:bg-rose-900/30 dark:text-rose-200", className)}
        title={error}
        aria-live="polite"
      >
        <CloudOff size={12} /> Sin guardar
      </span>
    );
  }

  if (!ultimo) {
    return (
      <span className={cn(base, "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300", className)}>
        Sin cambios guardados
      </span>
    );
  }

  return (
    <span
      className={cn(base, "bg-fieldcredit-green-pale text-fieldcredit-green-dark dark:bg-green-900/40 dark:text-green-200", className)}
      title={`Último guardado: ${fmt(ultimo)}`}
      aria-live="polite"
    >
      <Check size={12} /> Guardado {variante === "completo" ? fmt(ultimo) : fmtHora(ultimo)}
    </span>
  );
}
