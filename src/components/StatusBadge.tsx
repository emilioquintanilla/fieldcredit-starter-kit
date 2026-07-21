// Badge de estado del expediente con colores según semáforo
import type { EstadoExpediente } from "@/data/mock";
import { cn } from "@/lib/utils";

const MAP: Record<EstadoExpediente, { label: string; cls: string; pulse?: boolean }> = {
  borrador: { label: "Borrador", cls: "bg-fieldcredit-gray-pale text-fieldcredit-gray-dark dark:bg-slate-700 dark:text-slate-200" },
  en_revision: { label: "En revisión", cls: "bg-fieldcredit-amber-light text-fieldcredit-amber dark:bg-amber-900/40 dark:text-amber-300" },
  en_comite: { label: "En comité", cls: "bg-fieldcredit-teal-light text-fieldcredit-teal-dark dark:bg-teal-900/40 dark:text-teal-200", pulse: true },
  aprobado: { label: "Aprobado", cls: "bg-fieldcredit-green-light text-fieldcredit-green-dark dark:bg-green-900/40 dark:text-green-200" },
  rechazado: { label: "Rechazado", cls: "bg-fieldcredit-red-light text-fieldcredit-red dark:bg-red-900/40 dark:text-red-300" },
  condicionado: { label: "Condicionado", cls: "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100" },
};

export function StatusBadge({ status }: { status: EstadoExpediente }) {
  const s = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        s.cls,
        s.pulse && "animate-pulse",
      )}
    >
      {s.label}
    </span>
  );
}
