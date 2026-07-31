/**
 * Bloque financiero colapsable compartido por Estado de Resultados y
 * Situación Financiera.
 *
 * En móvil los módulos son largos: 4-6 bloques con 5-10 campos cada uno.
 * Obligar al asesor a hacer scroll por todo para llegar al último bloque es
 * el principal problema de usabilidad en campo. Con el bloque colapsable:
 *  - En móvil arranca cerrado (salvo el primero) y muestra el subtotal en el
 *    encabezado, así el asesor ve el estado de cada sección de un vistazo.
 *  - En escritorio queda siempre abierto: hay espacio de sobra y el
 *    colapso solo agregaría clics.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type TonoBloque = "verde" | "rojo" | "ambar" | "teal";

const HEADERS: Record<TonoBloque, string> = {
  verde: "bg-fieldcredit-green text-white",
  rojo: "bg-fieldcredit-red text-white",
  ambar: "bg-fieldcredit-amber text-white",
  teal: "bg-fieldcredit-teal text-white",
};

interface Props {
  titulo: string;
  icono: string;
  color: TonoBloque;
  /**
   * Color de fondo del encabezado en formato CSS, para bloques que no encajan
   * en la paleta de cuatro tonos (los bloques C/D/F del flujo de efectivo).
   */
  bgPersonalizado?: string;
  /**
   * Permite colapsar también en escritorio. Los estados financieros dejan sus
   * bloques abiertos porque son campos sueltos y caben; el flujo de efectivo lo
   * activa porque cada rubro arrastra una grilla de hasta 24 meses y con todo
   * desplegado la columna se vuelve inmanejable.
   */
  colapsableEnEscritorio?: boolean;
  /** Subtotal que se muestra en el encabezado cuando está cerrado */
  subtotal?: number;
  /** Cantidad de campos con valor / total de campos */
  llenos?: number;
  total?: number;
  /** Forzar abierto por defecto (el primer bloque de cada módulo) */
  defaultAbierto?: boolean;
  /**
   * Modo controlado: si se pasan `abierto` y `onToggle`, el estado de apertura
   * lo maneja el componente padre. El flujo de efectivo lo usa porque necesita
   * conocer qué bloques están abiertos desde afuera.
   */
  abierto?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

const fmtCorto = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `C$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `C$ ${Math.round(n / 1_000)}k`;
  return `C$ ${Math.round(n)}`;
};

export function BloqueFinanciero({
  titulo,
  icono,
  color,
  bgPersonalizado,
  colapsableEnEscritorio = false,
  subtotal,
  llenos,
  total,
  defaultAbierto = false,
  abierto: abiertoProp,
  onToggle,
  children,
}: Props) {
  const esMovil = useIsMobile();
  const [manual, setManual] = useState<boolean | null>(null);

  const permiteColapsar = esMovil || colapsableEnEscritorio;
  const controlado = abiertoProp !== undefined;

  // Si no se puede colapsar, queda siempre abierto. Si está controlado, manda
  // el padre. Si no, respeta la preferencia del asesor y, mientras no toque
  // nada, usa defaultAbierto.
  const abierto = !permiteColapsar
    ? true
    : controlado
      ? abiertoProp
      : (manual ?? defaultAbierto);

  const alternar = () => {
    if (!permiteColapsar) return;
    if (controlado) onToggle?.();
    else setManual(!abierto);
  };

  // Mostrar el resumen en el encabezado solo aporta cuando está cerrado.
  const mostrarResumen = permiteColapsar && !abierto;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold",
          bgPersonalizado ? "text-white" : HEADERS[color],
          permiteColapsar ? "cursor-pointer active:brightness-95" : "cursor-default",
        )}
        style={bgPersonalizado ? { backgroundColor: bgPersonalizado } : undefined}
      >
        <span className="shrink-0 text-base">{icono}</span>
        <span className="min-w-0 flex-1 truncate">{titulo}</span>

        {/* Subtotal visible cuando está cerrado */}
        {mostrarResumen && subtotal !== undefined && (
          <span className="shrink-0 font-mono text-xs tabular-nums opacity-90">
            {fmtCorto(subtotal)}
          </span>
        )}

        {/* Contador de campos llenos */}
        {mostrarResumen && llenos !== undefined && total !== undefined && (
          <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
            {llenos}/{total}
          </span>
        )}

        {permiteColapsar && (
          <ChevronDown
            size={16}
            className={cn("shrink-0 transition-transform duration-200", abierto && "rotate-180")}
          />
        )}
      </button>

      {abierto && <div className="min-w-0 p-3 sm:p-4">{children}</div>}
    </div>
  );
}

/** Fila de subtotal dentro de un bloque. */
export function SubtotalRow({
  label,
  valor,
  tono,
  destacado,
}: {
  label: string;
  valor: number;
  tono: TonoBloque;
  destacado?: boolean;
}) {
  const bg: Record<TonoBloque, string> = {
    verde:
      "bg-fieldcredit-green-pale text-fieldcredit-green-dark dark:bg-green-900/25 dark:text-green-200",
    rojo: "bg-fieldcredit-red-light text-fieldcredit-red dark:bg-red-900/25 dark:text-red-200",
    ambar:
      "bg-fieldcredit-amber-light text-amber-800 dark:bg-amber-900/25 dark:text-amber-200",
    teal: "bg-fieldcredit-teal-pale text-fieldcredit-teal-dark dark:bg-teal-900/25 dark:text-teal-200",
  };

  return (
    <div
      className={cn(
        "mt-2 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm",
        bg[tono],
        destacado && "font-bold",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 font-mono tabular-nums">
        C$ {Math.round(valor).toLocaleString("es-NI")}
      </span>
    </div>
  );
}

/** Caja de métrica del resumen. */
export function ResumenBox({
  label,
  valor,
  sufijo,
  tono,
  destacado,
}: {
  label: string;
  valor: number;
  sufijo?: string;
  tono?: "green" | "amber" | "red";
  destacado?: boolean;
}) {
  const color =
    tono === "red"
      ? "text-fieldcredit-red dark:text-red-300"
      : tono === "amber"
        ? "text-fieldcredit-amber dark:text-amber-300"
        : tono === "green"
          ? "text-fieldcredit-green dark:text-green-300"
          : valor >= 0
            ? "text-fieldcredit-green dark:text-green-300"
            : "text-fieldcredit-red dark:text-red-300";

  return (
    <div
      className={cn(
        "rounded-xl border border-border p-3 transition-colors",
        destacado && "border-fieldcredit-green/40 bg-fieldcredit-green-pale/40 dark:bg-green-900/10",
      )}
    >
      <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</div>
      <div
        className={cn(
          "mt-1 font-mono text-base tabular-nums sm:text-lg",
          color,
          destacado && "font-extrabold",
        )}
      >
        {sufijo === "%"
          ? `${valor.toFixed(1)}%`
          : `C$ ${Math.round(valor).toLocaleString("es-NI")}`}
      </div>
    </div>
  );
}

/** Lista de alertas del módulo. */
export function ListaAlertas({
  alertas,
}: {
  alertas: { tipo: "roja" | "ambar"; msg: string }[];
}) {
  if (alertas.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5 text-xs">
      {alertas.map((a, i) => (
        <li
          key={i}
          className={cn(
            "flex items-start gap-1.5 rounded-xl px-2.5 py-2",
            a.tipo === "roja"
              ? "bg-fieldcredit-red-light text-fieldcredit-red dark:bg-red-900/25 dark:text-red-200"
              : "bg-fieldcredit-amber-light text-amber-800 dark:bg-amber-900/25 dark:text-amber-200",
          )}
        >
          <span className="shrink-0">{a.tipo === "roja" ? "🔴" : "⚠️"}</span>
          <span className="min-w-0">{a.msg}</span>
        </li>
      ))}
    </ul>
  );
}
