/**
 * Barra de resumen pegajosa para móvil.
 *
 * Mientras el asesor captura decenas de campos, el dato que realmente importa
 * (excedente neto, patrimonio) queda muy abajo en la pantalla. Esta barra lo
 * mantiene visible arriba, actualizándose en vivo, para que el asesor detecte
 * de inmediato si el expediente se está yendo a números rojos.
 *
 * Solo se muestra en móvil: en escritorio el resumen completo ya cabe en
 * pantalla junto al formulario.
 */
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Etiqueta del indicador principal (ej. "Excedente neto") */
  label: string;
  /** Valor del indicador principal */
  valor: number;
  /** Indicador secundario opcional (ej. capacidad de pago) */
  secundario?: { label: string; valor: number; sufijo?: string; alerta?: boolean };
  /** Cantidad de alertas activas del módulo */
  alertas?: number;
}

const fmt = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;

export function ResumenPegajoso({ label, valor, secundario, alertas = 0 }: Props) {
  const positivo = valor >= 0;

  return (
    <div className="sticky top-14 z-20 -mx-3 mb-3 border-b border-border bg-background/85 px-3 py-2 backdrop-blur-overlay sm:hidden">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full",
            positivo
              ? "bg-fieldcredit-green-pale text-fieldcredit-green dark:bg-green-900/30 dark:text-green-300"
              : "bg-fieldcredit-red-light text-fieldcredit-red dark:bg-red-900/30 dark:text-red-300",
          )}
        >
          {positivo ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "truncate font-mono text-base font-bold tabular-nums",
              positivo
                ? "text-fieldcredit-green dark:text-green-300"
                : "text-fieldcredit-red dark:text-red-300",
            )}
          >
            {fmt(valor)}
          </p>
        </div>

        {secundario && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {secundario.label}
            </p>
            <p
              className={cn(
                "font-mono text-sm font-bold tabular-nums",
                secundario.alerta
                  ? "text-fieldcredit-red dark:text-red-300"
                  : "text-foreground",
              )}
            >
              {secundario.sufijo === "%"
                ? `${secundario.valor.toFixed(0)}%`
                : fmt(secundario.valor)}
            </p>
          </div>
        )}

        {alertas > 0 && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fieldcredit-red-light text-[11px] font-bold text-fieldcredit-red dark:bg-red-900/30 dark:text-red-300">
            {alertas}
          </span>
        )}
      </div>
    </div>
  );
}
