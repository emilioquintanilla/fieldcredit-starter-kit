// ─────────────────────────────────────────────────────────────────────────────
// Panel Institucional — vista para dirección, junta y fondeadores.
// Ruta del archivo: src/routes/institucional.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  cargarPanelInstitucional, fmtC$, fmtC$corto, fmtMes, fmtNum, fmtPct,
  type ColocacionMensual, type ConcentracionRubro, type Cosecha,
  type EsgInstitucional, type ExposicionClimatica, type KpiInstitucional,
  type KpiSucursal, type ParametroInstitucional, type RegistroBitacora,
} from "@/services/institucional";

export const Route = createFileRoute("/institucional")({
  head: () => ({
    meta: [
      { title: "Panel Institucional — FieldCredit" },
      { name: "description", content: "Indicadores de impacto, cartera y gobernanza de MiCrédito." },
    ],
  }),
  component: PanelInstitucional,
});

const VERDE = "#5eb837";
const VERDE_OSC = "#3d7a21";
const TEAL = "#45ada2";
const AMBAR = "#f59e0b";
const ROJO = "#dc2626";
const GRIS = "#898989";

type Pestana = "impacto" | "cartera" | "clima" | "gobernanza";

const PESTANAS: Array<{ id: Pestana; label: string; icono: string }> = [
  { id: "impacto", label: "Impacto y ESG", icono: "🌿" },
  { id: "cartera", label: "Cartera y riesgo", icono: "📊" },
  { id: "clima", label: "Riesgo climático", icono: "🌦️" },
  { id: "gobernanza", label: "Gobernanza", icono: "🛡️" },
];

interface Datos {
  kpi: KpiInstitucional | null;
  esg: EsgInstitucional | null;
  sucursales: KpiSucursal[];
  cosechas: Cosecha[];
  rubros: ConcentracionRubro[];
  clima: ExposicionClimatica[];
  colocacion: ColocacionMensual[];
  parametros: ParametroInstitucional[];
  bitacora: RegistroBitacora[];
}

function PanelInstitucional() {
  const [d, setD] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<Pestana>("impacto");

  useEffect(() => {
    let vivo = true;
    void cargarPanelInstitucional().then((r) => {
      if (vivo) {
        setD(r);
        setCargando(false);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Panel Institucional"
        subtitle="MiCrédito · AgroResilia · Indicadores de impacto, cartera y gobernanza"
      />

      <AvisoDemo />

      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setTab(p.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === p.id
                ? "border-fieldcredit-green text-fieldcredit-green"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="mr-1.5">{p.icono}</span>
            {p.label}
          </button>
        ))}
      </nav>

      {cargando && <Cargando />}

      {!cargando && d && (
        <div className="mt-6">
          {tab === "impacto" && <TabImpacto d={d} />}
          {tab === "cartera" && <TabCartera d={d} />}
          {tab === "clima" && <TabClima d={d} />}
          {tab === "gobernanza" && <TabGobernanza d={d} />}
        </div>
      )}
    </AppLayout>
  );
}

// ── Piezas compartidas ──────────────────────────────────────────────────────
function AvisoDemo() {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-900/20">
      <span className="text-sm">ℹ️</span>
      <p className="text-xs text-amber-900 dark:text-amber-200">
        <strong>Datos de demostración.</strong> La cartera mostrada es sintética y sirve para
        validar la arquitectura del tablero. Las cifras reales se incorporan al conectar la API
        del core financiero.
      </p>
    </div>
  );
}

function Cargando() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

function Kpi({
  label, valor, nota, acento = "green",
}: {
  label: string; valor: string; nota?: string;
  acento?: "green" | "teal" | "amber" | "red" | "slate";
}) {
  const color = {
    green: "text-fieldcredit-green",
    teal: "text-fieldcredit-teal",
    amber: "text-fieldcredit-amber",
    red: "text-fieldcredit-red",
    slate: "text-slate-800 dark:text-slate-100",
  }[acento];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-slate-400">{nota}</p>}
    </div>
  );
}

function Panel({ titulo, children, nota }: { titulo: string; children: React.ReactNode; nota?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{titulo}</h3>
      {nota && <p className="mb-2 mt-0.5 text-xs text-slate-400">{nota}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

const tooltipEstilo = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" },
};

// ── Pestaña 1 · Impacto y ESG ───────────────────────────────────────────────
function TabImpacto({ d }: { d: Datos }) {
  const e = d.esg;
  if (!e) return <p className="text-sm text-slate-500">Sin datos de impacto.</p>;

  const lineas = [
    { nombre: "Agua", valor: Number(e.cartera_agua ?? 0), color: TEAL },
    { nombre: "Producción protegida", valor: Number(e.cartera_produccion_protegida ?? 0), color: VERDE },
    { nombre: "Fincas resilientes", valor: Number(e.cartera_fincas_resilientes ?? 0), color: VERDE_OSC },
    { nombre: "Energía solar", valor: Number(e.cartera_energia_solar ?? 0), color: AMBAR },
  ].filter((l) => l.valor > 0);

  const ars = [
    { nombre: "Verde preferencial", valor: e.ars_verde_preferencial, color: VERDE },
    { nombre: "Verde estándar", valor: e.ars_verde_estandar, color: VERDE_OSC },
    { nombre: "Amarillo", valor: e.ars_amarillo, color: AMBAR },
    { nombre: "Rojo", valor: e.ars_rojo, color: ROJO },
  ].filter((a) => a.valor > 0);

  const ods = [
    { n: 1, t: "Fin de la pobreza" },
    { n: 2, t: "Hambre cero" },
    { n: 5, t: "Igualdad de género" },
    { n: 6, t: "Agua limpia" },
    { n: 7, t: "Energía asequible" },
    { n: 8, t: "Trabajo decente" },
    { n: 13, t: "Acción por el clima" },
    { n: 15, t: "Vida de ecosistemas" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cartera verde" valor={fmtC$corto(e.cartera_verde)}
             nota={`${fmtPct(e.pct_cartera_verde)} de la cartera total`} />
        <Kpi label="Productores alcanzados" valor={fmtNum(e.productores_verdes)}
             nota="con crédito climático-adaptado" acento="teal" />
        <Kpi label="Participación de mujeres" valor={fmtPct(e.pct_mujeres_verde)}
             nota={`${fmtNum(e.productoras_mujeres)} productoras`} acento="teal" />
        <Kpi label="Manzanas bajo prácticas adaptadas" valor={fmtNum(e.manzanas_bajo_practicas)}
             nota="superficie financiada" />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cobertura de microseguro" valor={fmtPct(e.pct_cobertura_microseguro)}
             nota={`${fmtNum(e.creditos_con_microseguro)} créditos protegidos`} acento="teal" />
        <Kpi label="Bonos verdes otorgados" valor={fmtNum(e.bonos_verdes_otorgados)}
             nota="incentivo por desempeño" />
        <Kpi label="Capacitados en Escuela AgroResilia" valor={fmtNum(e.productores_capacitados)}
             nota="talleres comunitarios" />
        <Kpi label="Alcance rural" valor={fmtPct(e.pct_rural_verde)}
             nota="de la cartera verde" acento="slate" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Distribución por línea de crédito" nota="Saldo vigente por línea AgroResilia">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={lineas} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={90}
                   paddingAngle={2}>
                {lineas.map((l, i) => <Cell key={i} fill={l.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtC$(v)} {...tooltipEstilo} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel titulo="Distribución del AgroResilia Score (ARS)"
               nota="Calificación climático-crediticia al momento del otorgamiento">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ars} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v} créditos`} {...tooltipEstilo} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                {ars.map((a, i) => <Cell key={i} fill={a.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel titulo="Objetivos de Desarrollo Sostenible"
             nota="ODS a los que contribuyen las líneas del producto">
        <div className="flex flex-wrap gap-2">
          {ods.map((o) => (
            <div key={o.n}
                 className="flex items-center gap-2 rounded-lg border border-fieldcredit-green-light bg-fieldcredit-green-pale px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50">
              <span className="grid h-7 w-7 place-items-center rounded bg-fieldcredit-green text-xs font-bold text-white">
                {o.n}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{o.t}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ── Pestaña 2 · Cartera y riesgo ────────────────────────────────────────────
function TabCartera({ d }: { d: Datos }) {
  const k = d.kpi;
  if (!k) return <p className="text-sm text-slate-500">Sin datos de cartera.</p>;

  const par30 = Number(k.par30 ?? 0);
  const colocacion = d.colocacion.map((c) => ({
    mes: fmtMes(c.mes),
    Total: Number(c.monto_colocado),
    Verde: Number(c.monto_verde ?? 0),
  }));
  const cosechas = d.cosechas.map((c) => ({
    mes: fmtMes(c.cosecha_mes),
    PAR30: Number(c.par30 ?? 0),
  }));

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cartera bruta" valor={fmtC$corto(k.cartera_bruta)}
             nota={`${fmtNum(k.creditos_activos)} créditos activos`} />
        <Kpi label="Clientes activos" valor={fmtNum(k.clientes_activos)}
             nota={`Saldo promedio ${fmtC$corto(k.saldo_promedio)}`} acento="teal" />
        <Kpi label="PAR 30" valor={fmtPct(k.par30)} nota="cartera en riesgo > 30 días"
             acento={par30 > 8 ? "red" : par30 > 5 ? "amber" : "green"} />
        <Kpi label="PAR 90" valor={fmtPct(k.par90)} nota="cartera en riesgo > 90 días"
             acento={Number(k.par90 ?? 0) > 2 ? "red" : "slate"} />
      </section>

      <Panel titulo="Calidad de cartera: verde vs. tradicional"
             nota="Hipótesis a validar durante el piloto. No constituye evidencia concluyente.">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-fieldcredit-green-pale p-4 dark:bg-slate-700/50">
            <p className="text-xs text-slate-600 dark:text-slate-300">PAR 30 · cartera verde</p>
            <p className="mt-1 text-3xl font-bold text-fieldcredit-green">{fmtPct(k.par30_verde)}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-300">PAR 30 · cartera tradicional</p>
            <p className="mt-1 text-3xl font-bold text-slate-600 dark:text-slate-300">
              {fmtPct(k.par30_tradicional)}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Colocación mensual" nota="Monto desembolsado, total y componente verde">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={colocacion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
              <Tooltip formatter={(v: number) => fmtC$(v)} {...tooltipEstilo} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Total" fill={GRIS} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Verde" fill={VERDE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel titulo="Análisis de cosechas" nota="PAR 30 según el mes de desembolso del crédito">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={cosechas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${Number(v).toFixed(2)}%`} {...tooltipEstilo} />
              <Line type="monotone" dataKey="PAR30" stroke={AMBAR} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Concentración por rubro" nota="Riesgo sectorial de la cartera">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2">Rubro</th>
                  <th className="py-2 text-right">Cartera</th>
                  <th className="py-2 text-right">%</th>
                  <th className="py-2 text-right">PAR 30</th>
                </tr>
              </thead>
              <tbody>
                {d.rubros.map((r) => (
                  <tr key={r.rubro} className="border-b border-slate-100 dark:border-slate-700/60">
                    <td className="py-2 font-medium text-slate-700 dark:text-slate-200">{r.rubro ?? "—"}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-300">{fmtC$corto(r.cartera)}</td>
                    <td className="py-2 text-right text-slate-500">{fmtPct(r.pct_cartera, 1)}</td>
                    <td className={`py-2 text-right font-semibold ${
                      Number(r.par30 ?? 0) > 8 ? "text-fieldcredit-red" : "text-slate-600 dark:text-slate-300"
                    }`}>
                      {fmtPct(r.par30)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel titulo="Desempeño por sucursal" nota="Cartera, mora y penetración de producto verde">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2">Sucursal</th>
                  <th className="py-2 text-right">Cartera</th>
                  <th className="py-2 text-right">PAR 30</th>
                  <th className="py-2 text-right">% verde</th>
                </tr>
              </thead>
              <tbody>
                {d.sucursales.map((s) => (
                  <tr key={s.sucursal_id} className="border-b border-slate-100 dark:border-slate-700/60">
                    <td className="py-2 font-medium text-slate-700 dark:text-slate-200">{s.sucursal_nombre}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-300">{fmtC$corto(s.cartera_bruta)}</td>
                    <td className={`py-2 text-right font-semibold ${
                      Number(s.par30 ?? 0) > 8 ? "text-fieldcredit-red"
                        : Number(s.par30 ?? 0) > 5 ? "text-fieldcredit-amber"
                        : "text-fieldcredit-green"
                    }`}>
                      {fmtPct(s.par30)}
                    </td>
                    <td className="py-2 text-right text-slate-500">{fmtPct(s.pct_cartera_verde, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ── Pestaña 3 · Riesgo climático ────────────────────────────────────────────
function TabClima({ d }: { d: Datos }) {
  const colorSev = {
    critica: ROJO, alta: ROJO, media: AMBAR, baja: TEAL,
  } as const;

  const totalExpuesto = d.clima.reduce((s, a) => s + Number(a.saldo_expuesto), 0);
  const totalAsegurado = d.clima.reduce((s, a) => s + Number(a.saldo_asegurado), 0);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Alertas activas" valor={fmtNum(d.clima.length)} nota="zonas bajo vigilancia" acento="amber" />
        <Kpi label="Saldo expuesto" valor={fmtC$corto(totalExpuesto)} nota="cartera en zonas con alerta" acento="amber" />
        <Kpi label="Saldo con microseguro" valor={fmtC$corto(totalAsegurado)} nota="cobertura paramétrica" acento="teal" />
        <Kpi label="Cobertura sobre lo expuesto"
             valor={totalExpuesto > 0 ? fmtPct((totalAsegurado / totalExpuesto) * 100) : "—"}
             nota="proporción protegida" acento="green" />
      </section>

      <div className="space-y-3">
        {d.clima.length === 0 && (
          <p className="text-sm text-slate-500">No hay alertas climáticas activas.</p>
        )}
        {d.clima.map((a) => (
          <div key={a.alerta_id}
               className="rounded-xl border-l-4 border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
               style={{ borderLeftColor: colorSev[a.severidad] }}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold uppercase text-white"
                        style={{ background: colorSev[a.severidad] }}>
                    {a.severidad}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{a.titulo}</h4>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {a.municipio ? `${a.municipio}, ` : ""}{a.departamento} · {a.tipo.replace("_", " ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {fmtC$corto(a.saldo_expuesto)}
                </p>
                <p className="text-xs text-slate-500">{fmtNum(a.creditos_expuestos)} créditos expuestos</p>
              </div>
            </div>
            {a.recomendacion && (
              <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                <strong>Acción sugerida:</strong> {a.recomendacion}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              {fmtNum(a.creditos_con_microseguro)} de {fmtNum(a.creditos_expuestos)} créditos cuentan con
              microseguro paramétrico ({fmtC$corto(a.saldo_asegurado)} protegidos).
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pestaña 4 · Gobernanza ──────────────────────────────────────────────────
function TabGobernanza({ d }: { d: Datos }) {
  const porCategoria = d.parametros.reduce<Record<string, ParametroInstitucional[]>>((acc, p) => {
    const c = p.categoria ?? "general";
    (acc[c] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Panel titulo="Parámetros institucionales"
             nota="Configuración maestra del sistema. Cambiar una política no requiere modificar código.">
        <div className="space-y-4">
          {Object.entries(porCategoria).map(([cat, params]) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fieldcredit-teal">
                {cat.replace("_", " ")}
              </p>
              <div className="space-y-1">
                {params.map((p) => (
                  <div key={p.clave}
                       className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-200">{p.clave}</p>
                      {p.descripcion && (
                        <p className="mt-0.5 text-xs text-slate-400">{p.descripcion}</p>
                      )}
                    </div>
                    <code className="shrink-0 rounded bg-fieldcredit-green-pale px-2 py-1 text-xs font-semibold text-fieldcredit-green-dark dark:bg-slate-700 dark:text-fieldcredit-green">
                      {typeof p.valor === "object" ? JSON.stringify(p.valor) : String(p.valor)}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel titulo="Bitácora de auditoría"
             nota="Registro inmutable de operaciones. Requisito de trazabilidad para supervisión.">
        {d.bitacora.length === 0 ? (
          <p className="text-xs text-slate-500">
            Sin registros todavía. La bitácora se alimenta automáticamente conforme se opera el sistema.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Usuario</th>
                  <th className="py-2">Acción</th>
                  <th className="py-2">Entidad</th>
                </tr>
              </thead>
              <tbody>
                {d.bitacora.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700/60">
                    <td className="py-2 text-slate-500">
                      {new Date(b.created_at).toLocaleString("es-NI")}
                    </td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">
                      {b.usuario_nombre ?? "—"}
                      {b.usuario_rol && (
                        <span className="ml-1 text-slate-400">({b.usuario_rol})</span>
                      )}
                    </td>
                    <td className="py-2 font-medium text-slate-700 dark:text-slate-200">{b.accion}</td>
                    <td className="py-2 text-slate-500">
                      {b.entidad}{b.entidad_id ? ` #${b.entidad_id}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
