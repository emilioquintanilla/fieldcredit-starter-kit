// Indicador de progreso del borrador: secciones completadas / total.
import { calcularProgresoSolicitud, nombreSeccion } from "@/lib/progresoSolicitud";
import type { SolicitudData } from "@/stores/expedientes";
import { cn } from "@/lib/utils";

interface Props {
  data: SolicitudData | undefined | null;
  variante?: "compacto" | "detallado";
  className?: string;
}

export function ProgresoSolicitud({ data, variante = "compacto", className }: Props) {
  const { completadas, pendientes, total, porcentaje } = calcularProgresoSolicitud(data);
  const listo = porcentaje === 100;

  if (variante === "compacto") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          listo
            ? "bg-fieldcredit-green-pale text-fieldcredit-green-dark dark:bg-green-900/40 dark:text-green-200"
            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          className,
        )}
        title={
          listo
            ? "Todas las secciones completas"
            : `Faltan: ${pendientes.map(nombreSeccion).join(", ")}`
        }
      >
        <span
          aria-hidden
          className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-600"
        >
          <span
            className={cn("block h-full rounded-full", listo ? "bg-fieldcredit-green" : "bg-fieldcredit-teal")}
            style={{ width: `${porcentaje}%` }}
          />
        </span>
        {completadas.length}/{total}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800",
        className,
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
        <span>Progreso de la solicitud</span>
        <span>
          {completadas.length} de {total} secciones ({porcentaje}%)
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            listo ? "bg-fieldcredit-green" : "bg-fieldcredit-teal",
          )}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      {pendientes.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Pendientes: {pendientes.map(nombreSeccion).join(", ")}
        </p>
      )}
    </div>
  );
}
