/**
 * Banner dinámico común para módulos de Estados financieros.
 *
 * En móvil se muestra compacto (una línea) y el detalle se despliega al tocar,
 * para no gastar tres líneas de pantalla en texto explicativo que el asesor
 * ya leyó la primera vez.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EtiquetaActividad, TipoActividad } from "@/data/cuentasFinancieras";
import { cn } from "@/lib/utils";

interface Props {
  tipoActividad: TipoActividad;
  etiquetas: EtiquetaActividad;
  onCambiarActividad: () => void;
}

export function BannerActividad({ tipoActividad, etiquetas, onCambiarActividad }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 text-sm text-slate-900 transition-all duration-200 dark:text-slate-100",
        etiquetas.banner,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-lg">{etiquetas.icono}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            Cuentas para: {tipoActividad}
          </p>
          {etiquetas.badge && (
            <p className="truncate text-xs font-medium opacity-80">{etiquetas.badge}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-label="Más información"
          data-compact
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10 sm:hidden"
        >
          <ChevronDown
            size={16}
            className={cn("transition-transform duration-200", abierto && "rotate-180")}
          />
        </button>
      </div>

      {/* Detalle: siempre visible en escritorio, colapsable en móvil */}
      <p
        className={cn(
          "mt-2 text-xs opacity-80",
          abierto ? "block" : "hidden sm:block",
        )}
      >
        Las cuentas se adaptan automáticamente a la actividad del cliente. Si el tipo de
        actividad es incorrecto,{" "}
        <button
          type="button"
          onClick={onCambiarActividad}
          className="font-semibold text-fieldcredit-green underline underline-offset-2 transition-colors hover:text-fieldcredit-green-dark"
        >
          corregirlo en la solicitud →
        </button>
      </p>
    </div>
  );
}
