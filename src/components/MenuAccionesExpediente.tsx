// Menú de acciones (archivar / eliminar) reutilizable para listados de expedientes
// que consumen el store local `useExpedientes` (clientes, comité).
import { Archive, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useExpedientes } from "@/stores/expedientes";
import { useApp } from "@/stores/app";

interface Props {
  expedienteId: string;
  codigoVisible?: string;
  abierto: boolean;
  onToggle: () => void;
  onCerrar: () => void;
}

export function MenuAccionesExpediente({
  expedienteId,
  codigoVisible,
  abierto,
  onToggle,
  onCerrar,
}: Props) {
  const rol = useApp((s) => s.usuario?.rol);
  const archivar = useExpedientes((s) => s.archivarExpediente);
  const eliminar = useExpedientes((s) => s.eliminarExpediente);

  const handleArchivar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`¿Archivar el expediente ${codigoVisible ?? expedienteId}?\nSe podrá recuperar desde el historial.`)) return;
    await archivar(expedienteId);
    onCerrar();
    toast.success("Expediente archivado");
  };

  const handleEliminar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        `¿Eliminar definitivamente el expediente ${codigoVisible ?? expedienteId}?\nEsta acción NO se puede deshacer.`,
      )
    )
      return;
    await eliminar(expedienteId);
    onCerrar();
    toast.success("Expediente eliminado");
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Opciones"
      >
        <MoreVertical size={18} />
      </button>
      {abierto && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCerrar();
            }}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Cerrar menú"
          />
          <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={handleArchivar}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20"
            >
              <Archive size={14} /> Archivar expediente
            </button>
            {rol === "admin" && (
              <button
                onClick={handleEliminar}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} /> Eliminar definitivamente
              </button>
            )}
            {codigoVisible && (
              <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400 dark:border-slate-700">
                {codigoVisible}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
