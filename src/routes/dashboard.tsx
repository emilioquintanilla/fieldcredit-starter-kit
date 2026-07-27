// Dashboard principal — vista adaptada por rol.
// Asesor: sus expedientes + alertas climáticas de su zona.
// Coordinador/Gerente/Admin: KPIs de cartera + alertas + expedientes recientes.
// Ruta del archivo: src/routes/dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { useApp, useRolActivo } from "@/stores/app";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import {
  obtenerKpiInstitucional, obtenerExposicionClimatica, obtenerColocacion,
  fmtC$corto, fmtPct,
  type KpiInstitucional, type ExposicionClimatica, type ColocacionMensual,
} from "@/services/institucional";

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

const COLOR_SEV: Record<string, string> = {
  critica: "#dc2626", alta: "#dc2626", media: "#f59e0b", baja: "#45ada2",
};

function DashboardPage() {
  const usuario = useApp((s) => s.usuario);
  const rol = useRolActivo();
  const esAsesor = rol === "asesor";

  // Expedientes (todos los roles los usan)
  const expedientes = useExpedientesRemote((s) => s.expedientes);
  const cargando = useExpedientesRemote((s) => s.cargando);
  const cargar = useExpedientesRemote((s) => s.cargar);

  // KPI de cartera (coordinador, gerente, admin)
  const [kpi, setKpi] = useState<KpiInstitucional | null>(null);
  const [clima, setClima] = useState<ExposicionClimatica[]>([]);
  const [colocacion, setColocacion] = useState<ColocacionMensual[]>([]);
  const [cargandoKpi, setCargandoKpi] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    void cargar(
      rol === "asesor"
        ? { asesorId: usuario.id }
        : { sucursalId: usuario.sucursal_id },
    );
  }, [usuario, rol, cargar]);

  useEffect(() => {
    if (esAsesor) {
      // El asesor solo necesita las alertas climáticas
      void obtenerExposicionClimatica().then(setClima);
      return;
    }
    setCargandoKpi(true);
    void Promise.all([
      obtenerKpiInstitucional(),
      obtenerExposicionClimatica(),
      obtenerColocacion(),
    ]).then(([k, c, col]) => {
      setKpi(k);
      setClima(c);
      setColocacion(col.slice(-8)); // últimos 8 meses
      setCargandoKpi(false);
    });
  }, [esAsesor]);

  const mios = useMemo(
    () => (rol === "asesor" ? expedientes.filter((e) => e.asesor_id === usuario?.id) : expedientes),
    [expedientes, usuario, rol],
  );
  const activos = mios.length;
  const pendientes = mios.filter((e) => e.estado === "borrador" || e.estado === "en_revision").length;
  const enComite = mios.filter((e) => e.estado === "en_comite").length;
  const aprobados = mios.filter((e) => e.estado === "aprobado").length;
  const recientes = [...mios]
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 5);

  const hoy = new Date().toLocaleDateString("es-NI", { weekday: "long", day: "numeric", month: "long" });
  const alertasActivas = clima.filter((a) => ["alta", "critica"].includes(a.severidad));

  const datosGrafico = colocacion.map((c) => ({
    mes: new Date(c.mes + "T00:00:00").toLocaleDateString("es-NI", { month: "short" }),
    Total: Math.round(Number(c.monto_colocado) / 1000),
    Verde: Math.round(Number(c.monto_verde ?? 0) / 1000),
  }));

  return (
    <AppLayout>
      <PageHeader
        title={`${saludo()}, ${usuario?.nombre.split(" ")[0]} 👋`}
        subtitle={`${usuario?.sucursalNombre ?? ""} · ${hoy}`}
      />

      {/* ── Alerta climática urgente (todos los roles) ── */}
      {alertasActivas.length > 0 && (
        <div className="mt-4 space-y-2">
          {alertasActivas.map((a) => (
            <div key={a.alerta_id}
              className="flex items-start gap-3 rounded-lg border-l-4 bg-amber-50 px-4 py-3 dark:bg-amber-900/10"
              style={{ borderLeftColor: COLOR_SEV[a.severidad] }}>
              <span className="text-lg">{a.severidad === "critica" ? "🚨" : "⚠️"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{a.titulo}</p>
                <p className="text-xs text-slate-500">{a.municipio ? `${a.municipio}, ` : ""}{a.departamento}</p>
              </div>
              {!esAsesor && (
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {fmtC$corto(a.saldo_expuesto)}
                  </p>
                  <p className="text-xs text-slate-400">{a.creditos_expuestos} créditos</p>
                </div>
              )}
              <Link to="/institucional" className="shrink-0 text-xs font-medium text-fieldcredit-teal hover:underline">
                Ver →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── KPIs de expedientes (siempre visibles) ── */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard title={esAsesor ? "Mis expedientes" : "Expedientes activos"} value={activos} icon="📋" color="green" />
        <MetricCard title="Pendientes" value={pendientes} icon="⏳" color="amber" />
        <MetricCard title="En comité" value={enComite} icon="⚖️" color="teal" />
        <MetricCard title="Aprobados" value={aprobados} icon="✅" color="green-dark" />
      </section>

      {/* ── KPIs de cartera (coordinador, gerente, admin) ── */}
      {!esAsesor && (
        <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cargandoKpi ? (
            <>
              {[1,2,3,4].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </>
          ) : kpi ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Cartera bruta</p>
                <p className="mt-1 text-2xl font-bold text-fieldcredit-green">{fmtC$corto(kpi.cartera_bruta)}</p>
                <p className="text-xs text-slate-400">{kpi.creditos_activos?.toLocaleString()} créditos</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Cartera verde</p>
                <p className="mt-1 text-2xl font-bold text-fieldcredit-green">{fmtPct(kpi.pct_cartera_verde, 0)}</p>
                <p className="text-xs text-slate-400">{fmtC$corto(kpi.cartera_verde)}</p>
              </div>
              <div className={`rounded-xl border p-4 shadow-sm ${
                Number(kpi.par30 ?? 0) > 8
                  ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10"
                  : Number(kpi.par30 ?? 0) > 5
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              }`}>
                <p className="text-xs text-slate-500">PAR 30</p>
                <p className={`mt-1 text-2xl font-bold ${
                  Number(kpi.par30 ?? 0) > 8 ? "text-red-600"
                  : Number(kpi.par30 ?? 0) > 5 ? "text-amber-600"
                  : "text-fieldcredit-green"
                }`}>{fmtPct(kpi.par30)}</p>
                <p className="text-xs text-slate-400">PAR90: {fmtPct(kpi.par90)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Clientes activos</p>
                <p className="mt-1 text-2xl font-bold text-fieldcredit-teal">{kpi.clientes_activos?.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Saldo prom. {fmtC$corto(kpi.saldo_promedio)}</p>
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* ── Gráfico de colocación (gerente, admin) ── */}
      {(rol === "gerente" || rol === "admin") && datosGrafico.length > 0 && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            Colocación mensual <span className="font-normal text-slate-400">(miles C$)</span>
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `C$ ${v}K`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="Total" fill="#898989" radius={[4,4,0,0]} />
              <Bar dataKey="Verde" fill="#5eb837" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── Expedientes recientes ── */}
      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {esAsesor ? "Mis expedientes recientes" : "Expedientes recientes"}
          </h2>
          <Link to="/expedientes" className="text-sm font-medium text-fieldcredit-green hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {cargando && recientes.length === 0 && (
              <li className="p-4 text-sm text-slate-500">Cargando…</li>
            )}
            {!cargando && recientes.length === 0 && (
              <li className="p-4 text-sm text-slate-500">No hay expedientes aún.</li>
            )}
            {recientes.map((e) => (
              <li key={e.id}>
                <Link
                  to="/expedientes/$id"
                  params={{ id: String(e.id) }}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-fieldcredit-green-pale dark:hover:bg-slate-700 sm:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {e.cliente ?? "Sin nombre"}
                    </p>
                    <p className="text-xs text-slate-500">{e.codigo} · {new Date(e.created_at).toLocaleDateString("es-NI")}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{money(e.monto_solicitado)}</p>
                    <div className="mt-1"><StatusBadge status={e.estado} /></div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Acceso rápido (móvil) ── */}
      <section className="mt-4 md:hidden">
        <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Acceso rápido</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { to: "/expedientes/nuevo", label: "📋", texto: "Nuevo expediente", roles: ["asesor","coordinador","gerente","admin"] },
            { to: "/clientes", label: "👥", texto: "Buscar cliente", roles: ["asesor","coordinador","gerente","admin"] },
            { to: "/comite", label: "⚖️", texto: "Cola de comité", roles: ["asesor","coordinador","gerente","admin"] },
            { to: "/institucional", label: "🌿", texto: "Panel institucional", roles: ["gerente","admin"] },
            { to: "/admin", label: "⚙️", texto: "Administración", roles: ["admin"] },
          ]
            .filter((a) => (a.roles as string[]).includes(rol))
            .map((a) => (
              <Link key={a.to} to={a.to}
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-medium text-slate-800 transition-colors hover:border-fieldcredit-green hover:bg-fieldcredit-green-pale dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <span className="text-2xl">{a.label}</span>
                <span className="text-xs">{a.texto}</span>
              </Link>
            ))}
        </div>
      </section>
    </AppLayout>
  );
}
