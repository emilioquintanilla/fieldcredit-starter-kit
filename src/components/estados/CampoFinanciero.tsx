/**
 * Campo financiero reutilizable con badge Auto / Editado y ayuda contextual.
 *
 * Mejoras de campo (Fase 2 UX):
 *  - Separador de miles en vivo: el asesor escribe 150000 y ve "150,000".
 *  - inputMode="decimal" en vez de type="number": evita las flechitas del
 *    spinner y, sobre todo, que la rueda del mouse o un scroll accidental
 *    cambie el valor sin que el asesor se dé cuenta.
 *  - Selección automática al enfocar: tocar el campo y escribir reemplaza,
 *    no concatena. Clave cuando el valor viene pre-llenado del flujo.
 *  - Objetivo táctil de 44px en móvil.
 */
import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import type { CuentaDef } from "@/data/cuentasFinancieras";
import type { ValorCuenta } from "@/utils/prefillEstados";
import { cn } from "@/lib/utils";

interface Props {
  cuenta: CuentaDef;
  registro?: ValorCuenta;
  onChange: (id: string, valor: number) => void;
}

/** 150000 → "150,000" ; 0 → "" */
const formatear = (n: number) => (n ? n.toLocaleString("en-US") : "");

/** "150,000" → 150000 ; "abc" → 0 */
const parsear = (s: string) => {
  const limpio = s.replace(/[^\d.]/g, "");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
};

export function CampoFinanciero({ cuenta, registro, onChange }: Props) {
  const autoLlenado = !!registro?.autoLlenado;
  const editado = !!registro?.editado;
  const valor = registro?.valor ?? 0;

  const [texto, setTexto] = useState(() => formatear(valor));
  const [enfocado, setEnfocado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza el texto cuando el valor cambia desde afuera (pre-llenado del
  // flujo) — pero no mientras el asesor está escribiendo, para no pisarle.
  useEffect(() => {
    if (!enfocado) setTexto(formatear(valor));
  }, [valor, enfocado]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bruto = e.target.value;
    const n = parsear(bruto);
    setTexto(bruto === "" ? "" : formatear(n));
    onChange(cuenta.id, n);
  };

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <label
          htmlFor={`campo-${cuenta.id}`}
          className="text-xs font-medium text-foreground"
        >
          {cuenta.etiqueta}
          {cuenta.obligatorio && <span className="ml-1 text-fieldcredit-red">*</span>}
        </label>
        {autoLlenado && !editado && (
          <span className="rounded-full bg-fieldcredit-teal-pale px-2 py-0.5 text-[10px] font-semibold text-fieldcredit-teal-dark dark:bg-teal-900/40 dark:text-teal-200">
            Auto ✓
          </span>
        )}
        {editado && (
          <span className="rounded-full bg-fieldcredit-amber-light px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Editado ✏
          </span>
        )}
        {cuenta.ayuda && (
          <button
            type="button"
            title={cuenta.ayuda}
            aria-label={`Ayuda: ${cuenta.ayuda}`}
            data-compact
            className="inline-grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HelpCircle size={13} />
          </button>
        )}
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          C$
        </span>
        <input
          id={`campo-${cuenta.id}`}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={texto}
          onChange={handleChange}
          onFocus={(e) => {
            setEnfocado(true);
            // Seleccionar todo permite sobrescribir de un tirón el valor
            // pre-llenado, en vez de tener que borrar dígito por dígito.
            requestAnimationFrame(() => e.target.select());
          }}
          onBlur={() => {
            setEnfocado(false);
            setTexto(formatear(valor));
          }}
          placeholder="0"
          className={cn(
            "h-11 w-full rounded-xl border bg-transparent py-2 pl-10 pr-3 text-right font-mono text-sm tabular-nums",
            "transition-all duration-200 placeholder:text-muted-foreground/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fieldcredit-teal/50 focus-visible:ring-offset-2 focus-visible:border-fieldcredit-teal",
            "sm:h-10",
            editado
              ? "border-fieldcredit-amber/50 bg-fieldcredit-amber-light/30 dark:bg-amber-900/10"
              : autoLlenado
                ? "border-fieldcredit-teal/40 bg-fieldcredit-teal-pale/40 dark:bg-teal-900/10"
                : "border-input",
          )}
        />
      </div>
    </div>
  );
}
