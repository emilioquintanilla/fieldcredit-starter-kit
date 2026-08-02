// Dashboard principal — vista adaptada por rol.
// Fase 2 UX: PageTransition, SkeletonMetricCard, colores semánticos, radius modernos.
// Íconos: emojis → Lucide React (unificación design system)
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  FolderOpen, Clock, Scale, CheckCircle2,
  AlertOctagon, AlertTriangle,
  FilePlus, Users, Leaf, Settings,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/ui/page-transition";
import { SkeletonMetricCard, SkeletonExpedienteRow } from "@/components/ui/skeleton";
import { useApp, useRolActivo } from "@/stores/app";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import { PanelAlertaTemprana } from "@/components/ia/PanelAlertaTemprana";
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

// Accesos rápidos móviles — definidos como array para filtrar por rol
const ACCESOS_RAPIDOS = [
  { to: "/expedientes/nuevo", Icon: FilePlus,  texto: "Nuevo expediente",    roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/clientes",          Icon: Users,      texto: "Buscar cliente",      roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/comite",            Icon: Scale,      texto: "Cola de comité",      roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/institucional",     Icon: Leaf,       texto: "Panel institucional", roles: ["gerente","admin"] },
  { to: "/admin",             Icon: Settings,   texto: "Administración",      roles: ["admin"] },
] as const;

function DashboardPage() {
  const usuario = useApp((s) => s.usuario);
  const rol = useRolActivo();
  const esAsesor = rol === "asesor";

  const expedientes = useExpedientesRemote((s) => s.expedientes);
  const cargando = useExpedientesRemote((s) => s.cargando);
  const cargar = useExpedientesRemote((s) => s.cargar);

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
      setColocacion(col.slice(-8));
      setCargandoKpi(false);
    });
  }, [esAsesor]);

  const mios = useMemo(
    () => (rol === "asesor" ? expedientes.filter((e) => e.asesor_id === usuario?.id) : expedientes),
    [expedientes, usuario, rol],
  );
  const activos    = mios.length;
  const pendientes = mios.filter((e) => e.estado === "borrador" || e.estado === "en_revision").length;
  const enComite   = mios.filter((e) => e.estado === "en_comite").length;
  const aprobados  = mios.filter((e) => e.estado === "aprobado").length;
  const recientes  = [...mios]
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
      <PageTransition>
        <PageHeader
          title={`${saludo()}, ${usuario?.nombre.split(" ")[0]}`}
          subtitle={`${usuario?.sucursalNombre ?? ""} · ${hoy}`}
        />

        {/* ── Alertas climáticas urgentes ── */}
        {alertasActivas.length > 0 && (
          <div className="mt-4 space-y-2">
            {alertasActivas.map((a) => (
              <div
                key={a.alerta_id}
                className="flex items-start gap-3 rounded-2xl border-l-4 bg-amber-50 px-4 py-3 dark:bg-amber-900/10"
                style={{ borderLeftColor: COLOR_SEV[a.severidad] }}
              >
                {a.severidad === "critica" ? (
                  <AlertOctagon size={18} className="mt-0.5 shrink-0 text-fieldcredit-red" aria-hidden />
                ) : (
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-fieldcredit-amber" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.municipio ? `${a.municipio}, ` : ""}{a.departamento}
                  </p>
                </div>
                {!esAsesor && (
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-foreground">{fmtC$corto(a.saldo_expuesto)}</p>
                    <p className="text-xs text-muted-foreground">{a.creditos_expuestos} créditos</p>
                  </div>
                )}
                <Link to="/institucional" className="shrink-0 text-xs font-medium text-fieldcredit-teal hover:underline">
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ── KPIs de expedientes (con skeletons) ── */}
        <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cargando ? (
            <>
              <SkeletonMetricCard />
              <SkeletonMetricCard />
              <SkeletonMetricCard />
              <SkeletonMetricCard />
            </>
          ) : (
            <>
              <MetricCard title={esAsesor ? "Mis expedientes" : "Expedientes activos"} value={activos}    Icon={FolderOpen}   color="green"      />
              <MetricCard title="Pendientes"                                             value={pendientes} Icon={Clock}        color="amber"      />
              <MetricCard title="En comité"                                              value={enComite}   Icon={Scale}        color="teal"       />
              <MetricCard title="Aprobados"                                              value={aprobados}  Icon={CheckCircle2} color="green-dark" />
            </>
          )}
        </section>

        {/* ── KPIs de cartera (coordinador, gerente, admin) ── */}
        {!esAsesor && (
          <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {cargandoKpi ? (
              <>
                <SkeletonMetricCard />
                <SkeletonMetricCard />
                <SkeletonMetricCard />
                <SkeletonMetricCard />
              </>
            ) : kpi ? (
              <>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Cartera bruta</p>
                  <p className="mt-1 text-2xl font-bold text-fieldcredit-green">{fmtC$corto(kpi.cartera_bruta)}</p>
                  <p className="text-xs text-muted-foreground">{kpi.creditos_activos?.toLocaleString()} créditos</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Cartera verde</p>
                  <p className="mt-1 text-2xl font-bold text-fieldcredit-green">{fmtPct(kpi.pct_cartera_verde, 0)}</p>
                  <p className="text-xs text-muted-foreground">{fmtC$corto(kpi.cartera_verde)}</p>
                </div>
                <div className={`rounded-2xl border p-4 shadow-sm ${
                  Number(kpi.par30 ?? 0) > 8
                    ? "border-red-200 bg-fieldcredit-red-light dark:border-red-900/30 dark:bg-red-900/10"
                    : Number(kpi.par30 ?? 0) > 5
                    ? "border-amber-200 bg-fieldcredit-amber-light dark:border-amber-900/30 dark:bg-amber-900/10"
                    : "border-border bg-card"
                }`}>
                  <p className="text-xs text-muted-foreground">PAR 30</p>
                  <p className={`mt-1 text-2xl font-bold ${
                    Number(kpi.par30 ?? 0) > 8 ? "text-fieldcredit-red"
                    : Number(kpi.par30 ?? 0) > 5 ? "text-fieldcredit-amber"
                    : "text-fieldcredit-green"
                  }`}>{fmtPct(kpi.par30)}</p>
                  <p className="text-xs text-muted-foreground">PAR90: {fmtPct(kpi.par90)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Clientes activos</p>
                  <p className="mt-1 text-2xl font-bold text-fieldcredit-teal">{kpi.clientes_activos?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Saldo prom. {fmtC$corto(kpi.saldo_promedio)}</p>
                </div>
              </>
            ) : null}
          </section>
        )}

        {/* ── Gráfico de colocación ── */}
        {(rol === "gerente" || rol === "admin") && datosGrafico.length > 0 && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-sm font-bold text-foreground">
              Colocación mensual <span className="font-normal text-muted-foreground">(miles C$)</span>
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="var(--chart-axis)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--chart-axis)" />
                <Tooltip formatter={(v: number) => `C$ ${v}K`} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Bar dataKey="Total" fill="#898989" radius={[6,6,0,0]} />
                <Bar dataKey="Verde" fill="#5eb837" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* ── Expedientes recientes (con skeletons) ── */}
        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              {esAsesor ? "Mis expedientes recientes" : "Expedientes recientes"}
            </h2>
            <Link to="/expedientes" className="text-sm font-medium text-fieldcredit-green hover:underline">
              Ver todos →
            </Link>
          </div>

          {cargando && recientes.length === 0 ? (
            <div className="space-y-2">
              <SkeletonExpedienteRow />
              <SkeletonExpedienteRow />
              <SkeletonExpedienteRow />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {!cargando && recientes.length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground">No hay expedientes aún.</li>
                )}
                {recientes.map((e) => (
                  <li key={e.id}>
                    <Link
                      to="/expedientes/$id"
                      params={{ id: String(e.id) }}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-accent sm:p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {e.cliente ?? "Sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.codigo} · {new Date(e.created_at).toLocaleDateString("es-NI")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-foreground">{money(e.monto_solicitado)}</p>
                        <div className="mt-1"><StatusBadge status={e.estado} /></div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Alerta temprana de mora ── */}
        {!esAsesor && (
          <section className="mt-4">
            <PanelAlertaTemprana limite={5} soloSucursal={rol === "coordinador"} />
          </section>
        )}

        {/* ── Acceso rápido (móvil) ── */}
        <section className="mt-4 md:hidden">
          <h2 className="mb-3 text-base font-semibold text-foreground">Acceso rápido</h2>
          <div className="grid grid-cols-2 gap-2">
            {ACCESOS_RAPIDOS
              .filter((a) => (a.roles as readonly string[]).includes(rol))
              .map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center text-sm font-medium text-foreground transition-all duration-200 hover:border-fieldcredit-green hover:bg-fieldcredit-green-pale hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                >
                  <a.Icon size={24} strokeWidth={1.8} className="text-fieldcredit-green" aria-hidden />
                  <span className="text-xs">{a.texto}</span>
                </Link>
              ))}
          </div>
        </section>
      </PageTransition>
    </AppLayout>
  );
}
