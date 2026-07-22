// Indicador visual de guardado en la NavBar. Reactivo al store remoto.
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Check } from "lucide-react";
import { useExpedientesRemote } from "@/stores/expedientesRemote";

export function IndicadorGuardado() {
  const guardandoId = useExpedientesRemote((s) => s.guardandoId);
  const error = useExpedientesRemote((s) => s.error);
  const ultimoGuardado = useExpedientesRemote((s) => s.ultimoGuardado);
  const [mostrarOk, setMostrarOk] = useState(false);

  useEffect(() => {
    if (!ultimoGuardado) return;
    setMostrarOk(true);
    const t = setTimeout(() => setMostrarOk(false), 2500);
    return () => clearTimeout(t);
  }, [ultimoGuardado]);

  if (error) {
    return (
      <span
        title={error}
        className="hidden items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 sm:inline-flex dark:bg-red-900/30 dark:text-red-300"
      >
        <AlertTriangle size={12} /> Error al guardar
      </span>
    );
  }

  if (guardandoId !== null) {
    return (
      <span className="hidden items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 sm:inline-flex dark:bg-amber-900/30 dark:text-amber-300">
        <Loader2 size={12} className="animate-spin" /> Guardando…
      </span>
    );
  }

  if (mostrarOk) {
    return (
      <span className="hidden items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 sm:inline-flex dark:bg-green-900/30 dark:text-green-300">
        <Check size={12} /> Guardado
      </span>
    );
  }

  return null;
}
