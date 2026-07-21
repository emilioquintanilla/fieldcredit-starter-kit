// Listado completo de expedientes del asesor
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { expedientes, type EstadoExpediente } from "@/data/mock";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expedientes/")({
  head: () => ({ meta: [{ title: "Expedientes — FieldCredit" }] }),
  component: ExpedientesPage,
});

const money = (n: number) => `C$ ${n.toLocaleString("es-NI")}`;
const initials = (n: string) =>
  n.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

type Filtro = "todos" | EstadoExpediente;
const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "borrador", label: "Borrador" },
  { key: "en_revision", label: "En revisión" },
  { key: "en_comite", label: "En comité" },
  { key: "aprobado", label: "Aprobado" },
  { key: "rechazado", label: "Rechazado" },
];

function ExpedientesPage() {
  const usuario = useApp((s) => s.usuario);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const lista = useMemo(() => {
    // Los asesores solo ven los suyos; roles superiores ven todos
    const base =
      usuario?.rol === "asesor"
        ? expedientes.filter((e) => e.asesor_id === usuario.id)
        : expedientes;
    const s = q.trim().toLowerCase();
    return base.filter((e) => {
      const okQ =
        !s || e.cliente.toLowerCase().includes(s) || e.cedula.toLowerCase().includes(s);
      const okF = filtro === "todos" || e.estado === filtro;
      return okQ && okF;
    });
  }, [usuario, q, filtro]);

  return (
    <AppLayout>
      <PageHeader
        title="Expedientes"
        subtitle={`${lista.length} solicitud(es)`}
        actions={
          <Link
            to="/expedientes/nuevo"
            className="inline-flex items-center gap-1.5 rounded-md bg-fieldcredit-green px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fieldcredit-green-dark"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo expediente</span>
          </Link>
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
          <li key={e.id}>
            <Link
              to="/expedientes/$id"
              params={{ id: String(e.id) }}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fieldcredit-green-pale text-sm font-bold text-fieldcredit-green-dark dark:bg-slate-700 dark:text-slate-100">
                {initials(e.cliente)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {e.cliente}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {e.codigo} · {money(e.monto)}
                </div>
                <div className="mt-1">
                  <StatusBadge status={e.estado} />
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-slate-400" />
            </Link>
          </li>
        ))}
        {lista.length === 0 && (
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
              <tr
                key={e.id}
                className="transition-colors hover:bg-fieldcredit-green-pale dark:hover:bg-slate-700"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-fieldcredit-green-pale text-xs font-bold text-fieldcredit-green-dark dark:bg-slate-700 dark:text-slate-100">
                      {initials(e.cliente)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{e.cliente}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{e.cedula}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{e.codigo}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                  {money(e.monto)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.estado} />
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{e.created_at}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to="/expedientes/$id"
                    params={{ id: String(e.id) }}
                    className="inline-flex items-center text-fieldcredit-green hover:text-fieldcredit-green-dark"
                  >
                    <ChevronRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
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
