/**
 * Panel de alertas de coherencia — se muestra en la pestaña Flujo del expediente
 * y en el pre-comité. Alerta al asesor sobre datos inverosímiles ANTES del comité.
 *
 * Ruta: src/components/ia/AlertasCoherencia.tsx
 */
import { useMemo, useState } from "react";
import { AlertTriangle, Info, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useExpedientes } from "@/stores/expedientes";
import {
  verificarCoherencia,
  resumenAlertas,
  type AlertaCoherencia,
} from "@/services/ia/verificadorCoherencia";

interface Props {
  expedienteId: string;
  modoCompacto?: boolean; // true = solo muestra el contador, expandible
}

const ICONO = {
  critica:     <XCircle size={14} className="shrink-0 text-red-500" />,
  advertencia: <AlertTriangle size={14} className="shrink-0 text-amber-500" />,
  info:        <Info size={14} className="shrink-0 text-blue-400" />,
};
const BG = {
  critica:     "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/10",
  advertencia: "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10",
  info:        "border-blue-200 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-900/10",
};
const TEXTO = {
  critica:     "text-red-700 dark:text-red-300",
  advertencia: "text-amber-700 dark:text-amber-300",
  info:        "text-blue-700 dark:text-blue-300",
};

export function AlertasCoherencia({ expedienteId, modoCompacto = false }: Props) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const [expandido, setExpandido] = useState(!modoCompacto);

  const alertas = useMemo(() => verificarCoherencia(exp), [exp]);
  const resumen = useMemo(() => resumenAlertas(alertas), [alertas]);

  if (alertas.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800/40 dark:bg-green-900/10">
        <span className="text-sm">✅</span>
        <p className="text-xs text-green-700 dark:text-green-300 font-medium">
          Sin inconsistencias detectadas en los datos declarados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-white dark:border-amber-800/40 dark:bg-slate-800">
      {/* Header */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-amber-50/50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <AlertTriangle size={16} className="shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Verificación de coherencia
          </p>
          <p className="text-xs text-slate-500">
            {resumen.criticas > 0 && <span className="text-red-600 font-semibold">{resumen.criticas} crítica{resumen.criticas > 1 ? "s" : ""}  </span>}
            {resumen.advertencias > 0 && <span className="text-amber-600">{resumen.advertencias} advertencia{resumen.advertencias > 1 ? "s" : ""}  </span>}
            {resumen.infos > 0 && <span className="text-blue-500">{resumen.infos} informativa{resumen.infos > 1 ? "s" : ""}</span>}
          </p>
        </div>
        {expandido ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {/* Alertas */}
      {expandido && (
        <div className="border-t border-amber-100 p-3 space-y-2 dark:border-slate-700">
          {alertas.map((a) => (
            <TarjetaAlerta key={a.id} alerta={a} />
          ))}
          <p className="pt-1 text-[10px] text-slate-400">
            ⚠️ Estas alertas son orientativas. Basadas en rendimientos referenciales de INTA/MAG 2023.
            El asesor debe confirmar o corregir antes de enviar al comité.
          </p>
        </div>
      )}
    </div>
  );
}

function TarjetaAlerta({ alerta }: { alerta: AlertaCoherencia }) {
  return (
    <div className={`rounded-lg border p-3 ${BG[alerta.severidad]}`}>
      <div className="flex items-start gap-2">
        {ICONO[alerta.severidad]}
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold ${TEXTO[alerta.severidad]}`}>
            {alerta.campo}
          </p>
          <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-200">
            {alerta.mensaje}
          </p>
          {alerta.valorDeclarado && (
            <p className="mt-1 text-[10px] text-slate-500">
              <span className="font-medium">Declarado:</span> {alerta.valorDeclarado}
            </p>
          )}
          {alerta.referenciaUso && (
            <p className="text-[10px] text-slate-500">
              <span className="font-medium">Referencia:</span> {alerta.referenciaUso}
            </p>
          )}
          {alerta.sugerencia && (
            <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300 italic">
              💡 {alerta.sugerencia}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
