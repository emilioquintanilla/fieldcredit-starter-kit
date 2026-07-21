// Estado de Resultados con cuentas dinámicas por actividad económica.
import { useEffect, useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useExpedientes, type ValorCuenta } from "@/stores/expedientes";
import { useCuentasActividad } from "@/hooks/useCuentasActividad";
import { preLlenarDesdeflujo } from "@/utils/prefillEstados";
import { CampoFinanciero } from "./CampoFinanciero";
import { BannerActividad } from "./BannerActividad";
import { cn } from "@/lib/utils";

interface Props {
  expedienteId: string;
  tipoActividad?: string;
  cuotaEstimada: number;
  onSwitchToSolicitud: () => void;
}

const fmt = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;

export function EstadoResultadosModule({ expedienteId, tipoActividad, cuotaEstimada, onSwitchToSolicitud }: Props) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const guardarValor = useExpedientes((s) => s.guardarValorEstado);
  const hidratar = useExpedientes((s) => s.hidratarEstadoDesdeflujo);
  const actualizarObs = useExpedientes((s) => s.actualizarObservacionesEstado);

  const cuentas = useCuentasActividad(tipoActividad);
  const datos = exp?.estadoResultados;
  const valores = datos?.valores ?? {};

  // Pre-llenado inicial desde el flujo (una vez por expediente)
  useEffect(() => {
    if (!exp || datos?.preLlenadoDesdeflujo) return;
    const flujoVals = exp.flujo?.valores;
    const plazo = exp.flujo?.plazoMeses || exp.data.plazo || 12;
    if (!flujoVals) return;
    const todasCuentas = [
      ...cuentas.ingresos,
      ...cuentas.costos,
      ...cuentas.gastosOperacion,
      ...cuentas.consumoFamiliar,
    ];
    const auto = preLlenarDesdeflujo(flujoVals, todasCuentas, plazo);
    if (Object.keys(auto).length > 0) {
      hidratar(expedienteId, "resultados", tipoActividad, auto);
    } else {
      hidratar(expedienteId, "resultados", tipoActividad, {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expedienteId, cuentas.tipoActividad]);

  // Totales calculados
  const totales = useMemo(() => {
    const sum = (lista: { id: string }[]) =>
      lista.reduce((acc, c) => acc + (valores[c.id]?.valor || 0), 0);
    const ingresos = sum(cuentas.ingresos);
    const costos = cuentas.esAsalariado ? 0 : sum(cuentas.costos);
    const gastosOp = sum(cuentas.gastosOperacion);
    const consumo = sum(cuentas.consumoFamiliar);
    const utilidadBruta = ingresos - costos;
    const utilidadOperativa = utilidadBruta - gastosOp;
    const excedenteFamiliar = utilidadOperativa - consumo;
    const excedenteNeto = excedenteFamiliar - cuotaEstimada;
    const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0;
    const capacidadPago = ingresos > 0 ? (cuotaEstimada / ingresos) * 100 : 0;
    return { ingresos, costos, gastosOp, consumo, utilidadBruta, utilidadOperativa, excedenteFamiliar, excedenteNeto, margenBruto, capacidadPago };
  }, [cuentas, valores, cuotaEstimada]);

  // Datos para gráficos
  const donaIngresos = cuentas.ingresos
    .map((c) => ({ name: c.etiqueta.replace(/\s*\(.*\)$/, ""), value: valores[c.id]?.valor || 0 }))
    .filter((x) => x.value > 0);
  const cascada = [
    { name: "Ingresos", value: totales.ingresos, fill: "#12A150" },
    { name: "− Costos", value: -totales.costos, fill: "#DC2626" },
    { name: "− Op.", value: -totales.gastosOp, fill: "#F59E0B" },
    { name: "− Hogar", value: -totales.consumo, fill: "#F97316" },
    { name: "− Cuota", value: -cuotaEstimada, fill: "#7C3AED" },
    { name: "Neto", value: totales.excedenteNeto, fill: totales.excedenteNeto >= 0 ? "#0F766E" : "#B91C1C" },
  ];

  const colores = ["#12A150", "#0F766E", "#F59E0B", "#F97316", "#7C3AED", "#0EA5E9", "#DC2626"];

  const alertas: { tipo: "roja" | "ambar"; msg: string }[] = [];
  if (totales.utilidadBruta < 0) alertas.push({ tipo: "roja", msg: "Utilidad bruta negativa: costos superan los ingresos" });
  if (totales.excedenteNeto < 0) alertas.push({ tipo: "roja", msg: "El excedente familiar no cubre la cuota estimada" });
  if (totales.consumo > 0 && totales.consumo < 3000) alertas.push({ tipo: "ambar", msg: "Consumo familiar declarado menor a C$3,000" });
  if (totales.capacidadPago > 70) alertas.push({ tipo: "ambar", msg: `Capacidad de pago comprometida (${totales.capacidadPago.toFixed(0)}% del ingreso)` });

  const onChange = (id: string, v: number) => guardarValor(expedienteId, "resultados", id, v);

  return (
    <section className="space-y-4">
      <BannerActividad
        tipoActividad={cuentas.tipoActividad}
        etiquetas={cuentas.etiquetas}
        onCambiarActividad={onSwitchToSolicitud}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ingresos */}
        <Bloque titulo="1. Ingresos" icono="💵" color="verde">
          {cuentas.ingresos.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total ingresos" valor={totales.ingresos} tono="verde" />
        </Bloque>

        {/* Costos */}
        <Bloque titulo={`2. ${cuentas.etiquetas.costos}`} icono={cuentas.etiquetas.icono} color="rojo">
          {cuentas.esAsalariado ? (
            <p className="mb-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              El cliente es asalariado: no aplican costos de producción. Registrar únicamente gastos relacionados al empleo (si los hubiese).
            </p>
          ) : null}
          {cuentas.costos.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total costos" valor={totales.costos} tono="rojo" />
          <SubtotalRow label="Utilidad bruta" valor={totales.utilidadBruta} tono={totales.utilidadBruta >= 0 ? "verde" : "rojo"} destacado />
        </Bloque>

        {/* Gastos operación */}
        <Bloque titulo="3. Gastos de operación" icono="⚙️" color="ambar">
          {cuentas.gastosOperacion.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total operación" valor={totales.gastosOp} tono="ambar" />
          <SubtotalRow label="Utilidad operativa" valor={totales.utilidadOperativa} tono={totales.utilidadOperativa >= 0 ? "verde" : "rojo"} destacado />
        </Bloque>

        {/* Consumo familiar */}
        <Bloque titulo="4. Consumo familiar" icono="🏠" color="teal">
          {cuentas.consumoFamiliar.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total consumo" valor={totales.consumo} tono="teal" />
        </Bloque>
      </div>

      {/* Resultado final */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">5. Resultado del período</h3>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <ResumenBox label="Excedente familiar" valor={totales.excedenteFamiliar} />
          <ResumenBox label="Cuota estimada" valor={-cuotaEstimada} tono="amber" />
          <ResumenBox label="Excedente neto" valor={totales.excedenteNeto} destacado />
          <ResumenBox label="Capacidad de pago" valor={totales.capacidadPago} sufijo="%" tono={totales.capacidadPago > 70 ? "red" : totales.capacidadPago > 50 ? "amber" : "green"} />
        </div>
        {alertas.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs">
            {alertas.map((a, i) => (
              <li key={i} className={cn(
                "rounded-md px-2 py-1",
                a.tipo === "roja" ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200" : "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
              )}>
                {a.tipo === "roja" ? "🔴" : "⚠️"} {a.msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Cascada del resultado</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cascada}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,#e2e8f0)" />
                <XAxis dataKey="name" fontSize={10} stroke="var(--chart-axis,#64748b)" />
                <YAxis fontSize={10} stroke="var(--chart-axis,#64748b)" />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value">
                  {cascada.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Composición del ingreso</h3>
          <div className="h-64">
            {donaIngresos.length === 0 ? (
              <p className="grid h-full place-items-center text-xs text-slate-500">Sin ingresos registrados</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donaIngresos} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40} label={(e) => `${e.name}`}>
                    {donaIngresos.map((_, i) => <Cell key={i} fill={colores[i % colores.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend fontSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
          Observaciones del asesor
        </label>
        <textarea
          rows={3}
          value={datos?.observacionesAsesor || ""}
          onChange={(e) => actualizarObs(expedienteId, "resultados", e.target.value)}
          placeholder="Notas sobre la calidad de la información, verificaciones realizadas, etc."
          className="w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
    </section>
  );
}

/* ---- Helpers visuales ---- */

function Bloque({ titulo, icono, children, color }: { titulo: string; icono: string; color: "verde" | "rojo" | "ambar" | "teal"; children: React.ReactNode }) {
  const header =
    color === "verde" ? "bg-fieldcredit-green text-white" :
    color === "rojo"  ? "bg-rose-600 text-white" :
    color === "ambar" ? "bg-amber-500 text-white" :
                        "bg-fieldcredit-teal text-white";
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className={cn("flex items-center gap-2 px-3 py-2 text-sm font-semibold", header)}>
        <span>{icono}</span><span>{titulo}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function SubtotalRow({ label, valor, tono, destacado }: { label: string; valor: number; tono: "verde" | "rojo" | "ambar" | "teal"; destacado?: boolean }) {
  const bg =
    tono === "verde" ? "bg-fieldcredit-green-pale text-fieldcredit-green-dark dark:bg-fieldcredit-green-dark/20 dark:text-fieldcredit-green-light" :
    tono === "rojo"  ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200" :
    tono === "ambar" ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200" :
                       "bg-fieldcredit-teal-pale text-fieldcredit-teal-dark dark:bg-fieldcredit-teal-dark/20 dark:text-fieldcredit-teal-light";
  return (
    <div className={cn("mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm", bg, destacado && "font-bold")}>
      <span>{label}</span>
      <span className="font-mono">{fmt(valor)}</span>
    </div>
  );
}

function ResumenBox({ label, valor, sufijo, tono, destacado }: { label: string; valor: number; sufijo?: string; tono?: "green" | "amber" | "red"; destacado?: boolean }) {
  const color =
    tono === "red"   ? "text-rose-600 dark:text-rose-300" :
    tono === "amber" ? "text-amber-600 dark:text-amber-300" :
    tono === "green" ? "text-fieldcredit-green dark:text-fieldcredit-green-light" :
    valor >= 0       ? "text-fieldcredit-green dark:text-fieldcredit-green-light" :
                       "text-rose-600 dark:text-rose-300";
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn("mt-1 font-mono text-lg", color, destacado && "font-extrabold")}>
        {sufijo === "%" ? `${valor.toFixed(1)}%` : fmt(valor)}
      </div>
    </div>
  );
}

// Estado del módulo para el indicador de tab
export function estadoResultadosStatus(datos?: { valores: Record<string, ValorCuenta> }, cuentasObligatorias: string[] = []): "pendiente" | "progreso" | "completo" | "alerta" {
  if (!datos || Object.keys(datos.valores).length === 0) return "pendiente";
  const faltantes = cuentasObligatorias.filter((id) => !(datos.valores[id]?.valor > 0));
  if (faltantes.length === 0) return "completo";
  return "progreso";
}
