// Módulo de Flujo de Efectivo — formulario + gráficos interactivos
import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer, Area, AreaChart, ReferenceArea, ComposedChart, Line,
  PieChart, Pie, Cell,
} from "recharts";
import {
  HelpCircle, ChevronDown, ChevronUp, BarChart3, ListChecks, AlertTriangle,
  CheckCircle2, XCircle, Info, Send,
} from "lucide-react";
import { useExpedientes } from "@/stores/expedientes";
import {
  BLOQUE_META, BLOQUE_BG, COLORES_GRAFICO,
  generarMeses, mesActualISO, type Bloque,
} from "@/data/flujo-catalogos";
import { getRubrosParaActividad } from "@/data/rubrosFlujoPorActividad";
import { useRubrosActividad } from "@/hooks/useRubrosActividad";
import { cn } from "@/lib/utils";

// Formato monetario
const fmtC = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;
const fmtK = (n: number) => `C$${(n / 1000).toFixed(0)}k`;

interface Props {
  expedienteId: string;
  plazoMeses: number;
  tipoActividad?: string;
  montoSolicitado: number;
}

export function FlujoModule({ expedienteId, plazoMeses, tipoActividad, montoSolicitado }: Props) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]?.flujo);
  const inicializarFlujo = useExpedientes((s) => s.inicializarFlujo);
  const [vista, setVista] = useState<"datos" | "graficos">("datos");
  const [bloquesAbiertos, setBloquesAbiertos] = useState<Record<Bloque, boolean>>({
    A: true, B: false, C: false, D: false, E: false,
  });

  // Inicializa el flujo al montar
  useEffect(() => {
    const mesInicio = mesActualISO();
    const cuotaInicial = plazoMeses > 0 ? Math.round((montoSolicitado || 0) / plazoMeses) : 0;
    inicializarFlujo(expedienteId, { plazoMeses, mesInicio, tipoActividad, cuotaEstimada: cuotaInicial });
  }, [expedienteId, plazoMeses, tipoActividad, montoSolicitado, inicializarFlujo]);

  // Autoguardado (feedback visual cada 30s)
  const [savedTick, setSavedTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSavedTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (!flujo) {
    return <p className="text-sm text-slate-500">Inicializando flujo de efectivo…</p>;
  }

  const meses = generarMeses(flujo.mesInicio, flujo.plazoMeses);
  const toggleBloque = (b: Bloque) => setBloquesAbiertos((prev) => ({ ...prev, [b]: !prev[b] }));

  return (
    <div className="space-y-4">
      {/* Selector de vista */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800 lg:hidden">
        <button
          onClick={() => setVista("datos")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium",
            vista === "datos" ? "bg-fieldcredit-green text-white" : "text-slate-600 dark:text-slate-300"
          )}
        >
          <ListChecks size={14} className="mr-1 inline" /> Ingresar datos
        </button>
        <button
          onClick={() => setVista("graficos")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium",
            vista === "graficos" ? "bg-fieldcredit-green text-white" : "text-slate-600 dark:text-slate-300"
          )}
        >
          <BarChart3 size={14} className="mr-1 inline" /> Gráficos
        </button>
      </div>

      {savedTick > 0 && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Guardado automático activo · {savedTick} ciclo{savedTick === 1 ? "" : "s"}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn("space-y-4", vista === "graficos" && "hidden lg:block")}>
          <VistaDatos
            expedienteId={expedienteId}
            meses={meses}
            bloquesAbiertos={bloquesAbiertos}
            toggleBloque={toggleBloque}
          />
        </div>
        <div className={cn("space-y-4", vista === "datos" && "hidden lg:block")}>
          <VistaGraficos expedienteId={expedienteId} meses={meses} />
        </div>
      </div>
    </div>
  );
}

/* =============== VISTA 1 — DATOS =============== */

function VistaDatos({
  expedienteId, meses, bloquesAbiertos, toggleBloque,
}: {
  expedienteId: string;
  meses: string[];
  bloquesAbiertos: Record<Bloque, boolean>;
  toggleBloque: (b: Bloque) => void;
}) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]!.flujo!);
  const { datosMensuales } = useCalculos(expedienteId);
  const rubrosDin = getRubrosParaActividad(flujo.tipoActividad);

  // Subtotales por bloque
  const subtotalBloque = (b: Bloque) =>
    rubrosDin[b].reduce((acc, r) => {
      if (!flujo.rubrosActivos[r.key]) return acc;
      return acc + (flujo.valores[r.key]?.reduce((s, v) => s + v, 0) ?? 0);
    }, 0);

  return (
    <div className="space-y-3">
      {(Object.keys(rubrosDin) as Bloque[]).map((b) => (
        <BloqueForm
          key={b}
          bloque={b}
          expedienteId={expedienteId}
          meses={meses}
          abierto={bloquesAbiertos[b]}
          onToggle={() => toggleBloque(b)}
          subtotal={subtotalBloque(b)}
        />
      ))}

      <BloqueSaldo expedienteId={expedienteId} meses={meses} datosMensuales={datosMensuales} />
    </div>
  );
}

function BloqueForm({
  bloque, expedienteId, meses, abierto, onToggle, subtotal,
}: {
  bloque: Bloque;
  expedienteId: string;
  meses: string[];
  abierto: boolean;
  onToggle: () => void;
  subtotal: number;
}) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]!.flujo!);
  const toggleRubro = useExpedientes((s) => s.toggleRubroFlujo);
  const actualizarValor = useExpedientes((s) => s.actualizarValorMesFlujo);
  const actualizarDesc = useExpedientes((s) => s.actualizarDescRubroFlujo);
  const meta = BLOQUE_META[bloque];
  const bg = BLOQUE_BG[bloque];

  // Alertas
  const totalConsumoFamiliar = bloque === "C" ? subtotal / (flujo.plazoMeses || 1) : 0;
  const consumoBajo = bloque === "C" && subtotal > 0 && totalConsumoFamiliar < 3000;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <button
        onClick={onToggle}
        className={cn("flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold", meta.header)}
        style={bg ? { backgroundColor: bg } : undefined}
      >
        <span className="flex-1">{meta.titulo}</span>
        <span className="mr-2 rounded bg-white/20 px-2 py-0.5 text-xs">{fmtC(subtotal)}</span>
        {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {abierto && (
        <div className="space-y-3 p-4">
          <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
            💡 {meta.tip}
          </p>

          {getRubrosParaActividad(flujo.tipoActividad)[bloque].map((r) => {
            const activo = !!flujo.rubrosActivos[r.key];
            const valores = flujo.valores[r.key] ?? [];
            const totalRubro = valores.reduce((s, v) => s + v, 0);
            const activoSinValores = activo && totalRubro === 0 && (bloque === "B");

            return (
              <div key={r.key} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <div className="mb-2 flex items-center gap-2">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={() => toggleRubro(expedienteId, r.key)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-fieldcredit-green peer-checked:after:translate-x-full dark:bg-slate-600" />
                  </label>
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{r.label}</span>
                  <TooltipInline text={r.ayuda} />
                  {activo && (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Total: {fmtC(totalRubro)}
                    </span>
                  )}
                </div>

                {activo && (
                  <>
                    {(r.key === "otroFijo" || r.key === "otroEstacional") && (
                      <input
                        type="text"
                        placeholder="Describe este rubro..."
                        value={
                          r.key === "otroFijo"
                            ? (flujo.otroFijoDesc ?? "")
                            : (flujo.otroEstacionalDesc ?? "")
                        }
                        onChange={(e) =>
                          actualizarDesc(
                            expedienteId,
                            r.key === "otroFijo" ? "otroFijoDesc" : "otroEstacionalDesc",
                            e.target.value
                          )
                        }
                        className="mb-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
                      />
                    )}
                    <div className="overflow-x-auto">
                      <div className="flex gap-1" style={{ minWidth: `${meses.length * 76}px` }}>
                        {meses.map((m, idx) => (
                          <div key={idx} className="flex w-[72px] shrink-0 flex-col">
                            <label className="text-[10px] text-slate-500">{m}</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={valores[idx] || ""}
                              onChange={(e) =>
                                actualizarValor(expedienteId, r.key, idx, parseFloat(e.target.value) || 0)
                              }
                              className="w-full rounded border border-slate-300 bg-yellow-50 px-1 py-1 text-right text-xs dark:border-slate-600 dark:bg-yellow-900/20 dark:text-slate-100"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    {activoSinValores && (
                      <p className="mt-2 text-xs text-fieldcredit-amber">
                        ⚠️ Este rubro está activo pero todos los meses están en cero. ¿No hay ingreso en el período?
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {consumoBajo && (
            <div className="rounded-md border border-fieldcredit-amber/40 bg-fieldcredit-amber-light p-2 text-xs text-amber-900 dark:bg-fieldcredit-amber/10 dark:text-amber-200">
              ⚠️ El gasto familiar declarado parece bajo para una familia. ¿Es correcto? Un gasto mínimo referencial es C$3,000/mes.
            </div>
          )}

          <div className={cn("rounded-md px-3 py-2 text-sm font-bold", meta.subtotal)}>
            SUBTOTAL {meta.titulo.split(".")[1]?.trim().toUpperCase() || ""} — {fmtC(subtotal)}
          </div>
        </div>
      )}
    </section>
  );
}

function TooltipInline({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle size={14} className="cursor-help text-slate-400" />
      <span className="pointer-events-none absolute right-0 top-5 z-10 hidden w-48 rounded-md bg-slate-900 p-2 text-[10px] text-white shadow-lg group-hover:block group-focus:block">
        {text}
      </span>
    </span>
  );
}

/* -------- Bloque F: saldo -------- */

function BloqueSaldo({
  expedienteId, meses, datosMensuales,
}: {
  expedienteId: string;
  meses: string[];
  datosMensuales: DatoMes[];
}) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]!.flujo!);
  const actualizarCuota = useExpedientes((s) => s.actualizarCuotaFlujo);

  const ingresoProm = promedio(datosMensuales.map((d) => d.ingresos));
  const egresoProm = promedio(datosMensuales.map((d) => d.egresos));
  const capPagoProm = promedio(datosMensuales.map((d) => d.capacidadPago));
  const mesCritico = datosMensuales.reduce(
    (max, d, i) => (d.capacidadPago > max.cap ? { nombre: meses[i], cap: d.capacidadPago } : max),
    { nombre: meses[0] || "—", cap: -Infinity }
  );
  const mesesNeg = datosMensuales.filter((d) => d.saldoNeto < 0).length;

  return (
    <section className="rounded-xl border-2 border-fieldcredit-green bg-white p-4 dark:border-fieldcredit-green dark:bg-slate-800">
      <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">F. Saldo y capacidad de pago</h3>

      <label className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-slate-700 dark:text-slate-300">Cuota estimada MiCrédito (C$/mes):</span>
        <input
          type="number"
          value={flujo.cuotaEstimada || ""}
          onChange={(e) => actualizarCuota(expedienteId, parseFloat(e.target.value) || 0)}
          className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/50">
              <th className="sticky left-0 z-10 bg-slate-100 px-2 py-1 text-left dark:bg-slate-900/50"> </th>
              {meses.map((m) => (
                <th key={m} className="px-2 py-1 text-right font-medium text-slate-700 dark:text-slate-300">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <FilaTabla label="Ingresos" values={datosMensuales.map((d) => fmtC(d.ingresos))} />
            <FilaTabla label="Egresos" values={datosMensuales.map((d) => fmtC(d.egresos))} />
            <FilaTabla label="Saldo" values={datosMensuales.map((d) => (
              <span className={d.saldoNeto < 0 ? "text-fieldcredit-red" : ""}>{fmtC(d.saldoNeto)}</span>
            ))} />
            <FilaTabla label="Cuota" values={datosMensuales.map((d) => fmtC(d.cuota))} />
            <FilaTabla label="Disponible" values={datosMensuales.map((d) => (
              <span className={d.disponible < 0 ? "text-fieldcredit-red" : ""}>{fmtC(d.disponible)}</span>
            ))} />
            <FilaTabla label="Cap. Pago" values={datosMensuales.map((d) => (
              <SemaforoCap cap={d.capacidadPago} />
            ))} />
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <TarjetaResumen titulo="Ingreso promedio" valor={`${fmtC(ingresoProm)}/mes`} />
        <TarjetaResumen titulo="Egreso promedio" valor={`${fmtC(egresoProm)}/mes`} />
        <TarjetaResumen titulo="Cap. pago prom." valor={<SemaforoCap cap={capPagoProm} />} />
        <TarjetaResumen titulo="Mes más crítico" valor={<span>{mesCritico.nombre}<br /><small>Cap: {isFinite(mesCritico.cap) ? mesCritico.cap.toFixed(0) : 0}%</small></span>} />
        <TarjetaResumen
          titulo="Meses con saldo negativo"
          valor={<span className={mesesNeg === 0 ? "text-fieldcredit-green" : "text-fieldcredit-red"}>{mesesNeg} {mesesNeg === 0 ? "🟢" : "🔴"}</span>}
        />
      </div>
    </section>
  );
}

function FilaTabla({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr className="border-t border-slate-200 dark:border-slate-700">
      <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-2 py-1 text-right text-slate-800 dark:text-slate-200">{v}</td>
      ))}
    </tr>
  );
}

function TarjetaResumen({ titulo, valor }: { titulo: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-900/40">
      <div className="text-slate-500 dark:text-slate-400">{titulo}</div>
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{valor}</div>
    </div>
  );
}

function SemaforoCap({ cap }: { cap: number }) {
  const c = isFinite(cap) ? cap : 0;
  const color = c > 70 ? "text-fieldcredit-red" : c > 50 ? "text-fieldcredit-amber" : "text-fieldcredit-green";
  const emoji = c > 70 ? "🔴" : c > 50 ? "🟡" : "🟢";
  return <span className={cn("font-semibold", color)}>{c.toFixed(0)}% {emoji}</span>;
}

/* =============== CÁLCULOS =============== */

interface DatoMes {
  mes: string;
  ingresos: number;
  egresos: number;
  saldoNeto: number;
  disponible: number;
  capacidadPago: number;
  cuota: number;
  gastoHogar: number;
  costoProduccion: number;
  otrasDeudas: number;
  ingresosFijos: number;
  ingresosEstacional: number;
}

function useCalculos(expedienteId: string) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]?.flujo);
  return useMemo(() => {
    if (!flujo) return { datosMensuales: [] as DatoMes[] };
    const meses = generarMeses(flujo.mesInicio, flujo.plazoMeses);
    const rubrosDin = getRubrosParaActividad(flujo.tipoActividad);
    const sumar = (bloque: Bloque, idx: number) =>
      rubrosDin[bloque].reduce((acc, r) => {
        if (!flujo.rubrosActivos[r.key]) return acc;
        return acc + (flujo.valores[r.key]?.[idx] ?? 0);
      }, 0);

    const datos: DatoMes[] = meses.map((m, i) => {
      const ingresosFijos = sumar("A", i);
      const ingresosEstacional = sumar("B", i);
      const ingresos = ingresosFijos + ingresosEstacional;
      const gastoHogar = sumar("C", i);
      const costoProduccion = sumar("D", i);
      const otrasDeudas = sumar("E", i);
      const egresos = gastoHogar + costoProduccion + otrasDeudas;
      const saldoNeto = ingresos - egresos;
      const cuota = flujo.cuotaEstimada;
      const disponible = saldoNeto - cuota;
      const capacidadPago = saldoNeto > 0 ? (cuota / saldoNeto) * 100 : (cuota > 0 ? 999 : 0);
      return {
        mes: m, ingresos, egresos, saldoNeto, disponible, capacidadPago, cuota,
        gastoHogar, costoProduccion, otrasDeudas, ingresosFijos, ingresosEstacional,
      };
    });
    return { datosMensuales: datos };
  }, [flujo]);
}

function promedio(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/* =============== VISTA 2 — GRÁFICOS =============== */

function VistaGraficos({ expedienteId, meses }: { expedienteId: string; meses: string[] }) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]!.flujo!);
  const { datosMensuales } = useCalculos(expedienteId);
  const cuotaMensual = flujo.cuotaEstimada || 0;

  // Composición de ingresos: sumar cada rubro A+B activo
  const composicion = useMemo(() => {
    const items: { name: string; valor: number }[] = [];
    const rubrosDin = getRubrosParaActividad(flujo.tipoActividad);
    (["A", "B"] as Bloque[]).forEach((b) => {
      rubrosDin[b].forEach((r) => {
        if (!flujo.rubrosActivos[r.key]) return;
        const total = flujo.valores[r.key]?.reduce((s, v) => s + v, 0) ?? 0;
        if (total > 0) items.push({ name: r.label, valor: total });
      });
    });
    return items;
  }, [flujo]);

  const totalIngresos = composicion.reduce((s, x) => s + x.valor, 0);
  const chartData = datosMensuales.map((d) => ({ ...d }));

  return (
    <div className="space-y-4">
      <Grafico titulo="Ingresos vs Egresos por mes">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 20, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
            <Tooltip formatter={(v: number) => fmtC(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={cuotaMensual} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Cuota", fill: "#f59e0b", fontSize: 11 }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#5eb837" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos" name="Egresos" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Grafico>

      <Grafico titulo="Saldo neto mensual vs Cuota del crédito">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData.map((d) => ({ ...d, cuota: cuotaMensual }))} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5eb837" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#5eb837" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCuota" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
            <Tooltip formatter={(v: number) => fmtC(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="saldoNeto" name="Saldo neto" stroke="#5eb837" strokeWidth={2.5} fill="url(#gradSaldo)" dot={{ fill: "#5eb837", r: 4 }} activeDot={{ r: 6 }} />
            <Area type="monotone" dataKey="cuota" name="Cuota del crédito" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" fill="url(#gradCuota)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Grafico>

      <Grafico titulo="Capacidad de pago mensual (%)" subtitulo="Meta: mantenerse bajo el 70% todos los meses">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
            <YAxis tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} ticks={[0, 25, 50, 70, 100]} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Cap. de pago"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <ReferenceArea y1={0} y2={50} fill="#dcfce7" fillOpacity={0.4} />
            <ReferenceArea y1={50} y2={70} fill="#fef3c7" fillOpacity={0.5} />
            <ReferenceArea y1={70} y2={100} fill="#fee2e2" fillOpacity={0.5} />
            <ReferenceLine y={50} stroke="#5eb837" strokeDasharray="4 4" label={{ value: "50%", fill: "#5eb837", fontSize: 10 }} />
            <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "70% límite", fill: "#dc2626", fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="capacidadPago"
              name="Cap. de pago"
              stroke="#45ada2"
              strokeWidth={2.5}
              dot={(props: { cx?: number; cy?: number; payload?: DatoMes; index?: number }) => {
                const { cx, cy, payload, index } = props;
                if (cx == null || cy == null || !payload) return <g key={index} />;
                const color = payload.capacidadPago > 70 ? "#dc2626" : payload.capacidadPago > 50 ? "#f59e0b" : "#5eb837";
                return <circle key={index} cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />;
              }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Grafico>

      <Grafico titulo="Composición del ingreso total del período">
        {composicion.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">Sin ingresos declarados aún.</p>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={composicion} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="valor">
                  {composicion.map((_, index) => (
                    <Cell key={index} fill={COLORES_GRAFICO[index % COLORES_GRAFICO.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtC(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[10px] text-slate-500">Total</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmtC(totalIngresos)}</div>
              </div>
            </div>
          </div>
        )}
      </Grafico>

      <Grafico titulo="Estructura de egresos por mes">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
            <Tooltip formatter={(v: number) => fmtC(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="gastoHogar" name="Hogar y familia" fill="#8D6E63" stackId="a" />
            <Bar dataKey="costoProduccion" name="Producción" fill="#37474F" stackId="a" />
            <Bar dataKey="otrasDeudas" name="Otras deudas" fill="#dc2626" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Grafico>

      <PanelAnalisis datosMensuales={datosMensuales} cuotaMensual={cuotaMensual} plazoMeses={flujo.plazoMeses} />

      <CopilotoBar />
    </div>
  );
}

function Grafico({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</h4>
      {subtitulo && <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{subtitulo}</p>}
      {children}
    </section>
  );
}

/* -------- Panel de análisis -------- */

interface Hallazgo { tipo: "verde" | "amber" | "rojo" | "info"; texto: string }

function PanelAnalisis({
  datosMensuales, cuotaMensual, plazoMeses,
}: {
  datosMensuales: DatoMes[];
  cuotaMensual: number;
  plazoMeses: number;
}) {
  const hallazgos: Hallazgo[] = [];
  if (datosMensuales.length > 0) {
    const capPagoPromedio = promedio(datosMensuales.map((m) => m.capacidadPago));
    if (capPagoPromedio < 50) hallazgos.push({ tipo: "verde", texto: `Capacidad de pago promedio: ${capPagoPromedio.toFixed(0)}% — saludable (meta: < 70%)` });
    else if (capPagoPromedio < 70) hallazgos.push({ tipo: "amber", texto: `Capacidad de pago promedio: ${capPagoPromedio.toFixed(0)}% — atención` });
    else hallazgos.push({ tipo: "rojo", texto: `Capacidad de pago promedio: ${capPagoPromedio.toFixed(0)}% — supera el límite` });

    const mesesNegativos = datosMensuales.filter((m) => m.saldoNeto < 0).length;
    if (mesesNegativos === 0) hallazgos.push({ tipo: "verde", texto: "Sin meses con saldo negativo en el período analizado" });
    else hallazgos.push({ tipo: "rojo", texto: `${mesesNegativos} mes(es) con saldo negativo — riesgo de incumplimiento` });

    const mesCritico = datosMensuales.reduce((max, m) => (m.capacidadPago > max.capacidadPago ? m : max));
    hallazgos.push({
      tipo: mesCritico.capacidadPago > 70 ? "rojo" : "amber",
      texto: `Mes más crítico: ${mesCritico.mes} — capacidad de pago ${mesCritico.capacidadPago.toFixed(0)}%`,
    });

    if (datosMensuales.length >= 6) {
      const primeros3 = promedio(datosMensuales.slice(0, 3).map((m) => m.ingresos));
      const ultimos3 = promedio(datosMensuales.slice(-3).map((m) => m.ingresos));
      if (ultimos3 > primeros3 * 1.05) hallazgos.push({ tipo: "verde", texto: "Tendencia de ingresos creciente en el período" });
      else if (ultimos3 < primeros3 * 0.95) hallazgos.push({ tipo: "amber", texto: "Tendencia de ingresos decreciente — revisar con el cliente" });
    }

    const saldoAcumulado = datosMensuales.reduce((sum, m) => sum + Math.max(0, m.disponible), 0);
    const totalCuotas = cuotaMensual * plazoMeses;
    if (totalCuotas > 0) {
      const coberturaFlujo = (saldoAcumulado / totalCuotas) * 100;
      hallazgos.push({
        tipo: coberturaFlujo >= 100 ? "verde" : "rojo",
        texto: `Cobertura total del flujo: ${coberturaFlujo.toFixed(0)}% — el saldo acumulado disponible cubre ${(coberturaFlujo / 100).toFixed(2)} veces el total de cuotas`,
      });
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">📊 Análisis automático del flujo</h4>
      {hallazgos.length === 0 ? (
        <p className="text-xs text-slate-500">Ingresa datos del flujo para ver el análisis automático.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {hallazgos.map((h, i) => (
            <li key={i} className="flex items-start gap-2">
              {h.tipo === "verde" && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-fieldcredit-green" />}
              {h.tipo === "amber" && <AlertTriangle size={16} className="mt-0.5 shrink-0 text-fieldcredit-amber" />}
              {h.tipo === "rojo" && <XCircle size={16} className="mt-0.5 shrink-0 text-fieldcredit-red" />}
              {h.tipo === "info" && <Info size={16} className="mt-0.5 shrink-0 text-fieldcredit-teal" />}
              <span className="text-slate-700 dark:text-slate-300">{h.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------- Copiloto IA (UI preparada, sin API) -------- */

function CopilotoBar() {
  const tip = "El Copiloto IA se activa en la próxima actualización.";
  return (
    <section
      className="rounded-xl bg-fieldcredit-green-dark p-4 text-white opacity-70"
      title={tip}
    >
      <h4 className="mb-2 text-sm font-semibold">🤖 Pregúntale al Copiloto sobre este flujo</h4>
      <div className="mb-3 flex flex-wrap gap-2">
        {["¿El flujo es suficiente?", "¿Cuál es el mes crítico?", "¿Qué riesgo tiene?"].map((s) => (
          <button
            key={s}
            disabled
            title={tip}
            className="cursor-not-allowed rounded-full bg-white/10 px-3 py-1 text-xs"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          disabled
          placeholder="Escribe tu pregunta..."
          className="flex-1 cursor-not-allowed rounded-md bg-white/10 px-3 py-2 text-sm placeholder-white/60"
          title={tip}
        />
        <button disabled title={tip} className="grid h-9 w-9 cursor-not-allowed place-items-center rounded-md bg-white/20">
          <Send size={14} />
        </button>
      </div>
      <p className="mt-2 text-xs text-white/80">💬 Disponible al conectar la IA — Sesión 7</p>
    </section>
  );
}

// Helper para estado del módulo (usado por el detalle del expediente)
export function estadoFlujo(flujo: import("@/stores/expedientes").FlujoEfectivo | undefined): "pendiente" | "progreso" | "completo" {
  if (!flujo) return "pendiente";
  const total = (bloque: Bloque) =>
    RUBROS[bloque].reduce((acc, r) =>
      acc + (flujo.rubrosActivos[r.key] ? (flujo.valores[r.key]?.reduce((s, v) => s + v, 0) ?? 0) : 0), 0);
  const ingresos = total("A") + total("B");
  const consumo = total("C");
  const cuotaOK = (flujo.cuotaEstimada || 0) > 0;
  if (ingresos > 0 && consumo > 0 && cuotaOK) return "completo";
  if (ingresos > 0 || consumo > 0 || cuotaOK) return "progreso";
  return "pendiente";
}
