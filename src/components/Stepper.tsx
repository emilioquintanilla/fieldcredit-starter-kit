// Stepper horizontal (desktop) / vertical colapsable (móvil) para el formulario
import { Check, AlertCircle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Paso {
  num: number;
  nombre: string;
  completado: boolean;
  conError?: boolean;
}

interface Props {
  pasos: Paso[];
  activo: number;
  onIr: (num: number) => void;
  progreso: number; // 0-100
}

export function Stepper({ pasos, activo, onIr, progreso }: Props) {
  const [expandido, setExpandido] = useState(false);
  const pasoActivo = pasos.find((p) => p.num === activo);

  return (
    <div className="mb-4">
      {/* Barra de progreso general */}
      <div className="mb-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <span>Progreso de la solicitud</span>
        <span className="font-semibold">{progreso}%</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-fieldcredit-green transition-all"
          style={{ width: `${progreso}%` }}
        />
      </div>

      {/* Móvil: colapsable */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <span className="flex items-center gap-2">
            <BadgeNum paso={pasoActivo!} activo />
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {pasoActivo?.nombre}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={cn("transition-transform text-slate-500", expandido && "rotate-180")}
          />
        </button>
        {expandido && (
          <ul className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
            {pasos.map((p) => (
              <li key={p.num}>
                <button
                  type="button"
                  onClick={() => { onIr(p.num); setExpandido(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-fieldcredit-green-pale dark:hover:bg-slate-700",
                    p.num === activo && "bg-fieldcredit-green-pale dark:bg-slate-700",
                  )}
                >
                  <BadgeNum paso={p} activo={p.num === activo} />
                  <span className="text-slate-800 dark:text-slate-200">
                    {p.num}. {p.nombre}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop: horizontal */}
      <ol className="hidden md:flex md:items-center md:gap-1">
        {pasos.map((p, i) => (
          <li key={p.num} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onIr(p.num)}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <BadgeNum paso={p} activo={p.num === activo} />
              <span
                className={cn(
                  "truncate text-xs font-medium",
                  p.num === activo
                    ? "text-fieldcredit-teal-dark dark:text-fieldcredit-teal"
                    : p.completado
                      ? "text-fieldcredit-green-dark dark:text-fieldcredit-green"
                      : "text-slate-500 dark:text-slate-400",
                )}
              >
                {p.nombre}
              </span>
            </button>
            {i < pasos.length - 1 && (
              <div className="mx-1 h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function BadgeNum({ paso, activo }: { paso: Paso; activo?: boolean }) {
  if (paso.conError) {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fieldcredit-red text-white">
        <AlertCircle size={14} />
      </span>
    );
  }
  if (paso.completado) {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fieldcredit-green text-white">
        <Check size={14} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
        activo
          ? "bg-fieldcredit-teal text-white"
          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
      )}
    >
      {paso.num}
    </span>
  );
}
