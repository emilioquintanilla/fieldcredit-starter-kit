/**
 * InputMonetario — campo de dinero con separador de miles en vivo.
 *
 * Existe por tres razones concretas de captura en campo:
 *
 *  1. `type="number"` permite que la rueda del mouse (o un scroll accidental
 *     con el campo enfocado) cambie el valor sin que nadie lo note. Acá se usa
 *     `type="text"` + `inputMode="decimal"`: teclado numérico en móvil, cero
 *     riesgo de cambio fantasma.
 *  2. Escribir 150000 sin separadores en un teléfono es donde más se equivoca
 *     el asesor, y el error no se detecta hasta el dictamen. Acá ve 150,000
 *     mientras teclea.
 *  3. Al enfocar se selecciona todo: sobrescribir un valor ya cargado es
 *     escribir encima, no borrar dígito por dígito.
 */
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  valor: number;
  onChange: (valor: number) => void;
  /** Prefijo mostrado dentro del campo. Por defecto "C$". */
  prefijo?: string | null;
  placeholder?: string;
  className?: string;
  /** Resalta el campo como editable/pendiente (fondo ámbar suave). */
  destacado?: boolean;
  "aria-label"?: string;
  id?: string;
}

const formatear = (n: number) => (n ? n.toLocaleString("en-US") : "");

const parsear = (s: string) => {
  const limpio = s.replace(/[^\d.]/g, "");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
};

export function InputMonetario({
  valor,
  onChange,
  prefijo = "C$",
  placeholder = "0",
  className,
  destacado,
  id,
  ...rest
}: Props) {
  const [texto, setTexto] = useState(() => formatear(valor));
  const [enfocado, setEnfocado] = useState(false);

  // Sincroniza cuando el valor cambia desde afuera (hidratación desde la nube,
  // "rellenar todos los meses", etc.) sin pisar lo que el asesor está tecleando.
  useEffect(() => {
    if (!enfocado) setTexto(formatear(valor));
  }, [valor, enfocado]);

  return (
    <div className="relative">
      {prefijo && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
          {prefijo}
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={texto}
        onChange={(e) => {
          const bruto = e.target.value;
          const n = parsear(bruto);
          setTexto(bruto === "" ? "" : formatear(n));
          onChange(n);
        }}
        onFocus={(e) => {
          setEnfocado(true);
          requestAnimationFrame(() => e.target.select());
        }}
        onBlur={() => {
          setEnfocado(false);
          setTexto(formatear(valor));
        }}
        placeholder={placeholder}
        className={cn(
          "h-11 w-full rounded-xl border text-right font-mono text-sm tabular-nums transition-all duration-200",
          "placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fieldcredit-teal/50 focus-visible:ring-offset-1 focus-visible:border-fieldcredit-teal",
          prefijo ? "py-2 pl-9 pr-2.5" : "px-2.5 py-2",
          destacado
            ? "border-fieldcredit-amber/40 bg-fieldcredit-amber-light/40 dark:bg-amber-900/15"
            : "border-input bg-transparent",
          "sm:h-10",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
