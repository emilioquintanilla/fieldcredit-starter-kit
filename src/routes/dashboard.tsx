// Dashboard principal del asesor (lee expedientes desde Supabase).
import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/stores/app";
import { useExpedientesRemote } from "@/stores/expedientesRemote";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FieldCredit" }] }),
  component: DashboardPage,
});

const money = (n: number | null) => `C$ ${(n ?? 0).toLocaleString("es-NI")}`;
const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

function DashboardPage() {
  const usuario = useApp((s) => s.usuario);
  const expedientes = useExpedientesRemote((s) => s.expedientes);
  const cargando = useExpedientesRemote((s) => s.cargando);
  const cargar = useExpedientesRemote((s) => s.cargar);

  useEffect(() => {
    if (!usuario) return;
    void cargar(
      usuario.rol === "asesor"
        ? { asesorId: usuario.id }
        : { sucursalId: usuario.sucursal_id },
    );
  }, [usuario, cargar]);

  const mios = useMemo(
    () => (usuario?.rol === "asesor" ? expedientes.filter((e) => e.asesor_id === usuario.id) : expedientes),
    [expedientes, usuario],
  );
  const activos = mios.length;
  const pendientes = mios.filter((e) => e.estado === "borrador" || e.estado === "en_revision").length;
  const enComite = mios.filter((e) => e.estado === "en_comite").length;
  const aprobados = mios.filter((e) => e.estado === "aprobado").length;
  const recientes = [...mios]
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 5);
  const hoy = new Date().toLocaleDateString("es-NI", { weekday: "long", day: "numeric", month: "long" });

  return (
    <AppLayout>
      <PageHeader
        title={`${saludo()}, ${usuario?.nombre.split(" ")[0]} 👋`}
        subtitle={`Sucursal ${usuario?.sucursalNombre ?? ""} · ${hoy}`}
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard title="Mis expedientes activos" value={activos} icon="📋" color="green" />
        <MetricCard title="Pendientes de completar" value={pendientes} icon="⏳" color="amber" />
        <MetricCard title="En comité" value={enComite} icon="🔍" color="teal" />
        <MetricCard title="Aprobados este mes" value={aprobados} icon="✅" color="green-dark" />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Expedientes recientes
          </h2>
          <Link to="/expedientes" className="text-sm font-medium text-fieldcredit-green hover:underline">
            Ver todos →
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {cargando && recientes.length === 0 && (
              <li className="p-4 text-sm text-slate-500 dark:text-slate-400">Cargando expedientes…</li>
            )}
            {!cargando && recientes.length === 0 && (
              <li className="p-4 text-sm text-slate-500 dark:text-slate-400">
                Aún no tienes expedientes.
              </li>
            )}
            {recientes.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-fieldcredit-green-pale dark:hover:bg-slate-700 sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {e.cliente ?? "Sin nombre"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {e.codigo} · {new Date(e.created_at).toLocaleDateString("es-NI")}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {money(e.monto_solicitado)}
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={e.estado} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 md:hidden">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Acceso rápido
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {[
            { to: "/expedientes/nuevo", label: "📋 Nuevo expediente" },
            { to: "/clientes", label: "🔍 Buscar cliente" },
            { to: "/comite", label: "📍 Mi ubicación actual" },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left text-sm font-medium text-slate-800 transition-colors hover:border-fieldcredit-green hover:bg-fieldcredit-green-pale dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
