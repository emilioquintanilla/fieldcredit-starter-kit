// Listado de expedientes del asesor (leído desde Supabase, con acciones
// de archivar y eliminar). Fase 1 de la migración a Cloud.
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronRight, MoreVertical, Plus, Search, Archive, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgresoSolicitud } from "@/components/ProgresoSolicitud";
import { EstadoAutoguardado } from "@/components/EstadoAutoguardado";
import { useApp } from "@/stores/app";
import { useExpedientesSync } from "@/hooks/useExpedientesSync";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import { obtenerSolicitudesDe, type ExpedienteDB } from "@/services/expedientesService";
import type { SolicitudData } from "@/stores/expedientes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expedientes/")({
  head: () => ({ meta: [{ title: "Expedientes — FieldCredit" }] }),
  component: ExpedientesPage,
});

type Filtro = "todos" | ExpedienteDB["estado"];
const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "borrador", label: "Borrador" },
  { key: "en_revision", label: "En revisión" },
  { key: "en_comite", label: "En comité" },
  { key: "aprobado", label: "Aprobado" },
  { key: "rechazado", label: "Rechazado" },
];

const money = (n: number | null) => `C$ ${(n ?? 0).toLocaleString("es-NI")}`;
const initials = (n: string) =>
  n.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

function ExpedientesPage() {
  const usuario = useApp((s) => s.usuario);
  const expedientes = useExpedientesRemote((s) => s.expedientes);
  const cargando = useExpedientesRemote((s) => s.cargando);
  const archivar = useExpedientesRemote((s) => s.archivar);
  const eliminar = useExpedientesRemote((s) => s.eliminar);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [menuAbierto, setMenuAbierto] = useState<number | null>(null);
  const [solicitudes, setSolicitudes] = useState<Record<number, SolicitudData>>({});

  useExpedientesSync();

  // Carga las solicitudes de los borradores para calcular su progreso.
  const idsBorrador = useMemo(
    () => expedientes.filter((e) => e.estado === "borrador").map((e) => e.id),
    [expedientes],
  );
  const claveBorradores = idsBorrador.join(",");
  useEffect(() => {
    if (!claveBorradores) {
      setSolicitudes({});
      return;
    }
    let activo = true;
    void obtenerSolicitudesDe(claveBorradores.split(",").map(Number)).then((mapa) => {
      if (activo) setSolicitudes(mapa as Record<number, SolicitudData>);
    });
    return () => {
      activo = false;
    };
  }, [claveBorradores]);


  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return expedientes.filter((e) => {
      const okQ =
        !s ||
        (e.cliente ?? "").toLowerCase().includes(s) ||
        (e.cedula ?? "").toLowerCase().includes(s);
      const okF = filtro === "todos" || e.estado === filtro;
      return okQ && okF;
    });
  }, [expedientes, q, filtro]);

  const handleArchivar = async (exp: ExpedienteDB) => {
    if (!window.confirm(`¿Archivar el expediente ${exp.codigo}?\nSe podrá recuperar desde el historial.`)) return;
    await archivar(exp.id);
    setMenuAbierto(null);
    toast.success("Expediente archivado");
  };

  const handleEliminar = async (exp: ExpedienteDB) => {
    if (!window.confirm(
      `¿Eliminar definitivamente el expediente ${exp.codigo}?\nEsta acción NO se puede deshacer.`,
    )) return;
    await eliminar(exp.id);
    setMenuAbierto(null);
    toast.success("Expediente eliminado");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Expedientes"
        subtitle={cargando ? "Cargando…" : `${lista.length} solicitud(es)`}
        actions={
          <>
            <EstadoAutoguardado variante="compacto" className="hidden sm:inline-flex" />
          <Link
            to="/expedientes/nuevo"
            className="inline-flex items-center gap-1.5 rounded-md bg-fieldcredit-green px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fieldcredit-green-dark"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo expediente</span>
          </Link>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o cédula..."
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-fieldcredit-green focus:outline-none focus:ring-2 focus:ring-fieldcredit-green/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filtro === f.key
                  ? "bg-fieldcredit-green text-white"
                  : "bg-white text-slate-600 hover:bg-fieldcredit-green-pale dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Móvil: cards apiladas */}
      <ul className="space-y-2 md:hidden">
        {lista.map((e) => (
          <li key={e.id} className="relative">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
              <Link
                to="/expedientes/$id"
                params={{ id: String(e.id) }}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fieldcredit-green-pale text-sm font-bold text-fieldcredit-green-dark dark:bg-slate-700 dark:text-slate-100">
                  {initials(e.cliente ?? "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {e.cliente ?? "Sin nombre"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {e.codigo} · {money(e.monto_solicitado)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={e.estado} />
                    {e.estado === "borrador" && <ProgresoSolicitud data={solicitudes[e.id]} />}
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-400" />
              </Link>
              {e.estado === "borrador" && (
                <Link
                  to="/expedientes/nuevo"
                  search={{ id: String(e.id) }}
                  className="shrink-0 rounded-md border border-fieldcredit-green px-2 py-1 text-[11px] font-semibold text-fieldcredit-green-dark dark:text-fieldcredit-green"
                >
                  Continuar
                </Link>
              )}

              <MenuAcciones
                exp={e}
                rol={usuario?.rol}
                abierto={menuAbierto === e.id}
                onToggle={() => setMenuAbierto((v) => (v === e.id ? null : e.id))}
                onArchivar={() => handleArchivar(e)}
                onEliminar={() => handleEliminar(e)}
              />
            </div>
          </li>
        ))}
        {lista.length === 0 && !cargando && (
          <li className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            No se encontraron expedientes.
          </li>
        )}
      </ul>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Solicitud</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {lista.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-fieldcredit-green-pale dark:hover:bg-slate-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-fieldcredit-green-pale text-xs font-bold text-fieldcredit-green-dark dark:bg-slate-700 dark:text-slate-100">
                      {initials(e.cliente ?? "?")}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{e.cliente ?? "Sin nombre"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{e.cedula ?? "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{e.codigo}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{money(e.monto_solicitado)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={e.estado} />
                    {e.estado === "borrador" && <ProgresoSolicitud data={solicitudes[e.id]} />}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {new Date(e.created_at).toLocaleDateString("es-NI")}
                </td>
                <td className="relative px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    {e.estado === "borrador" && (
                      <Link
                        to="/expedientes/nuevo"
                        search={{ id: String(e.id) }}
                        className="rounded-md border border-fieldcredit-green px-2 py-1 text-xs font-semibold text-fieldcredit-green-dark dark:text-fieldcredit-green"
                      >
                        Continuar
                      </Link>
                    )}

                    <Link
                      to="/expedientes/$id"
                      params={{ id: String(e.id) }}
                      className="inline-flex items-center text-fieldcredit-green hover:text-fieldcredit-green-dark"
                    >
                      <ChevronRight size={18} />
                    </Link>
                    <MenuAcciones
                      exp={e}
                      rol={usuario?.rol}
                      abierto={menuAbierto === e.id}
                      onToggle={() => setMenuAbierto((v) => (v === e.id ? null : e.id))}
                      onArchivar={() => handleArchivar(e)}
                      onEliminar={() => handleEliminar(e)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {lista.length === 0 && !cargando && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron expedientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

function MenuAcciones({
  exp,
  rol,
  abierto,
  onToggle,
  onArchivar,
  onEliminar,
}: {
  exp: ExpedienteDB;
  rol: string | undefined;
  abierto: boolean;
  onToggle: () => void;
  onArchivar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Opciones"
      >
        <MoreVertical size={18} />
      </button>
      {abierto && (
        <>
          <button
            onClick={onToggle}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Cerrar menú"
          />
          <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={(e) => { e.stopPropagation(); onArchivar(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20"
            >
              <Archive size={14} /> Archivar expediente
            </button>
            {rol === "admin" && (
              <button
                onClick={(e) => { e.stopPropagation(); onEliminar(); }}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} /> Eliminar definitivamente
              </button>
            )}
            <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400 dark:border-slate-700">
              {exp.codigo}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
