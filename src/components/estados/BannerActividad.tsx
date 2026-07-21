// Banner dinámico común para módulos de Estados financieros.
import type { EtiquetaActividad, TipoActividad } from "@/data/cuentasFinancieras";
import { cn } from "@/lib/utils";

interface Props {
  tipoActividad: TipoActividad;
  etiquetas: EtiquetaActividad;
  onCambiarActividad: () => void;
}

export function BannerActividad({ tipoActividad, etiquetas, onCambiarActividad }: Props) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-1 rounded-xl border p-3 text-sm dark:text-slate-100",
        etiquetas.banner,
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        <span className="text-lg">{etiquetas.icono}</span>
        <span>Mostrando cuentas para: {tipoActividad}</span>
      </div>
      {etiquetas.badge && (
        <div className="text-xs font-medium">{etiquetas.badge}</div>
      )}
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Las cuentas se adaptan automáticamente a la actividad del cliente. Si el tipo de actividad
        es incorrecto,{" "}
        <button
          type="button"
          onClick={onCambiarActividad}
          className="font-semibold text-fieldcredit-green underline underline-offset-2 hover:text-fieldcredit-green-dark"
        >
          corregirlo en la solicitud →
        </button>
      </p>
    </div>
  );
}
