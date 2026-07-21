// Estado de Situación Financiera con cuentas dinámicas por actividad económica.
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { useExpedientes, type ValorCuenta } from "@/stores/expedientes";
import { useCuentasActividad } from "@/hooks/useCuentasActividad";
import { CampoFinanciero } from "./CampoFinanciero";
import { BannerActividad } from "./BannerActividad";
import { cn } from "@/lib/utils";

interface Props {
  expedienteId: string;
  tipoActividad?: string;
  onSwitchToSolicitud: () => void;
}

const fmt = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;

export function SituacionFinancieraModule({ expedienteId, tipoActividad, onSwitchToSolicitud }: Props) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const guardar = useExpedientes((s) => s.guardarValorEstado);
  const actualizarObs = useExpedientes((s) => s.actualizarObservacionesEstado);

  const cuentas = useCuentasActividad(tipoActividad);
  const datos = exp?.situacionFinanciera;
  const valores = datos?.valores ?? {};

  const totales = useMemo(() => {
    const sum = (lista: { id: string }[]) => lista.reduce((a, c) => a + (valores[c.id]?.valor || 0), 0);
    const activoCorriente = sum(cuentas.activosCorriente);
    const activoFijo = sum(cuentas.activosFijos);
    const activoInmueble = sum(cuentas.activosInmuebles);
    const totalActivos = activoCorriente + activoFijo + activoInmueble;
    const pasivoCorriente = sum(cuentas.pasivosCorriente);
    const pasivoLP = sum(cuentas.pasivosLargoPlazo);
    const totalPasivos = pasivoCorriente + pasivoLP;
    const patrimonio = totalActivos - totalPasivos;
    const indiceEndeudamiento = totalActivos > 0 ? (totalPasivos / totalActivos) * 100 : 0;
    const razonLiquidez = pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : activoCorriente > 0 ? 99 : 0;
    return { activoCorriente, activoFijo, activoInmueble, totalActivos, pasivoCorriente, pasivoLP, totalPasivos, patrimonio, indiceEndeudamiento, razonLiquidez };
  }, [cuentas, valores]);

  const alertas: { tipo: "roja" | "ambar"; msg: string }[] = [];
  if (totales.patrimonio < 0) alertas.push({ tipo: "roja", msg: "Patrimonio neto negativo: los pasivos superan los activos" });
  if (totales.indiceEndeudamiento > 60) alertas.push({ tipo: "ambar", msg: `Índice de endeudamiento alto (${totales.indiceEndeudamiento.toFixed(0)}%)` });
  if (totales.razonLiquidez > 0 && totales.razonLiquidez < 1) alertas.push({ tipo: "ambar", msg: `Razón de liquidez baja (${totales.razonLiquidez.toFixed(2)})` });

  const onChange = (id: string, v: number) => guardar(expedienteId, "situacion", id, v);

  const balance = [
    {
      name: "Balance",
      Corriente: totales.activoCorriente,
      Fijo: totales.activoFijo,
      Inmueble: totales.activoInmueble,
      "Pasivo corriente": -totales.pasivoCorriente,
      "Pasivo LP": -totales.pasivoLP,
      Patrimonio: -totales.patrimonio,
    },
  ];

  const donaActivos = [
    { name: "Corriente", value: totales.activoCorriente, fill: "#0F766E" },
    { name: "Fijo",      value: totales.activoFijo,      fill: "#12A150" },
    { name: "Inmueble",  value: totales.activoInmueble,  fill: "#7C3AED" },
  ].filter((d) => d.value > 0);

  return (
    <section className="space-y-4">
      <BannerActividad
        tipoActividad={cuentas.tipoActividad}
        etiquetas={cuentas.etiquetas}
        onCambiarActividad={onSwitchToSolicitud}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque titulo="Activos corrientes" icono="💵" color="teal">
          {cuentas.activosCorriente.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <Subtotal label="Total corriente" valor={totales.activoCorriente} tono="teal" />
        </Bloque>

        <Bloque titulo="Activos fijos" icono="🚜" color="verde">
          {cuentas.activosFijos.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <Subtotal label="Total fijos" valor={totales.activoFijo} tono="verde" />
        </Bloque>

        <Bloque titulo="Inmuebles" icono="🏠" color="verde">
          {cuentas.activosInmuebles.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <Subtotal label="Total inmuebles" valor={totales.activoInmueble} tono="verde" />
        </Bloque>

        <Bloque titulo="Pasivos" icono="💳" color="rojo">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Corto plazo</div>
          {cuentas.pasivosCorriente.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <Subtotal label="Total pasivo corriente" valor={totales.pasivoCorriente} tono="rojo" />
          <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Largo plazo</div>
          {cuentas.pasivosLargoPlazo.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <Subtotal label="Total pasivo LP" valor={totales.pasivoLP} tono="rojo" />
          <Subtotal label="Total pasivos" valor={totales.totalPasivos} tono="rojo" destacado />
        </Bloque>
      </div>

      {/* Resumen patrimonio */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Patrimonio y salud financiera</h3>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Box label="Total activos" valor={totales.totalActivos} />
          <Box label="Total pasivos" valor={totales.totalPasivos} tono="amber" />
          <Box label="Patrimonio neto" valor={totales.patrimonio} destacado />
          <Box label="Endeudamiento" valor={totales.indiceEndeudamiento} sufijo="%" tono={totales.indiceEndeudamiento > 60 ? "red" : totales.indiceEndeudamiento > 40 ? "amber" : "green"} />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Razón de liquidez: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{totales.razonLiquidez.toFixed(2)}</span>
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
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Estructura del balance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balance} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,#e2e8f0)" />
                <XAxis dataKey="name" fontSize={10} stroke="var(--chart-axis,#64748b)" />
                <YAxis fontSize={10} stroke="var(--chart-axis,#64748b)" />
                <Tooltip formatter={(v: number) => fmt(Math.abs(v))} />
                <Legend fontSize={10} />
                <Bar dataKey="Corriente"        stackId="a" fill="#0F766E" />
                <Bar dataKey="Fijo"             stackId="a" fill="#12A150" />
                <Bar dataKey="Inmueble"         stackId="a" fill="#7C3AED" />
                <Bar dataKey="Pasivo corriente" stackId="b" fill="#DC2626" />
                <Bar dataKey="Pasivo LP"        stackId="b" fill="#F97316" />
                <Bar dataKey="Patrimonio"       stackId="b" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Composición de activos</h3>
          <div className="h-64">
            {donaActivos.length === 0 ? (
              <p className="grid h-full place-items-center text-xs text-slate-500">Sin activos registrados</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donaActivos} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40}>
                    {donaActivos.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend fontSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
          Observaciones del asesor
        </label>
        <textarea
          rows={3}
          value={datos?.observacionesAsesor || ""}
          onChange={(e) => actualizarObs(expedienteId, "situacion", e.target.value)}
          placeholder="Verificación de bienes, situación legal de inmuebles, etc."
          className="w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
    </section>
  );
}

function Bloque({ titulo, icono, children, color }: { titulo: string; icono: string; color: "verde" | "rojo" | "teal"; children: React.ReactNode }) {
  const header =
    color === "verde" ? "bg-fieldcredit-green text-white" :
    color === "rojo"  ? "bg-rose-600 text-white" :
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

function Subtotal({ label, valor, tono, destacado }: { label: string; valor: number; tono: "verde" | "rojo" | "teal"; destacado?: boolean }) {
  const bg =
    tono === "verde" ? "bg-fieldcredit-green-pale text-fieldcredit-green-dark dark:bg-fieldcredit-green-dark/20 dark:text-fieldcredit-green-light" :
    tono === "rojo"  ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200" :
                       "bg-fieldcredit-teal-pale text-fieldcredit-teal-dark dark:bg-fieldcredit-teal-dark/20 dark:text-fieldcredit-teal-light";
  return (
    <div className={cn("mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm", bg, destacado && "font-bold")}>
      <span>{label}</span>
      <span className="font-mono">{fmt(valor)}</span>
    </div>
  );
}

function Box({ label, valor, sufijo, tono, destacado }: { label: string; valor: number; sufijo?: string; tono?: "green" | "amber" | "red"; destacado?: boolean }) {
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

export function estadoSituacionStatus(datos?: { valores: Record<string, ValorCuenta> }): "pendiente" | "progreso" | "completo" | "alerta" {
  if (!datos || Object.keys(datos.valores).length === 0) return "pendiente";
  const conValor = Object.values(datos.valores).filter((v) => v.valor > 0).length;
  if (conValor >= 3) return "completo";
  return "progreso";
}
