// Campo financiero reutilizable con badge Auto / Editado y tooltip de ayuda.
import { HelpCircle } from "lucide-react";
import type { CuentaDef } from "@/data/cuentasFinancieras";
import type { ValorCuenta } from "@/utils/prefillEstados";
import { cn } from "@/lib/utils";

interface Props {
  cuenta: CuentaDef;
  registro?: ValorCuenta;
  onChange: (id: string, valor: number) => void;
}

export function CampoFinanciero({ cuenta, registro, onChange }: Props) {
  const autoLlenado = !!registro?.autoLlenado;
  const editado = !!registro?.editado;
  const valor = registro?.valor ?? 0;

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-2">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {cuenta.etiqueta}
          {cuenta.obligatorio && <span className="ml-1 text-rose-500">*</span>}
        </label>
        {autoLlenado && !editado && (
          <span className="rounded-full bg-fieldcredit-teal-pale px-2 py-0.5 text-[10px] font-semibold text-fieldcredit-teal-dark dark:bg-fieldcredit-teal-dark/30 dark:text-fieldcredit-teal-light">
            Auto ✓
          </span>
        )}
        {editado && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Editado ✏
          </span>
        )}
        {cuenta.ayuda && (
          <span className="group relative inline-flex" title={cuenta.ayuda}>
            <HelpCircle size={12} className="text-slate-400" />
          </span>
        )}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
          C$
        </span>
        <input
          type="number"
          min={0}
          value={valor || ""}
          onChange={(e) => onChange(cuenta.id, Number(e.target.value) || 0)}
          placeholder="0"
          className={cn(
            "w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-right font-mono text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fieldcredit-teal",
            "dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
          )}
        />
      </div>
    </div>
  );
}
