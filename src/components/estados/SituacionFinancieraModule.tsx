// Estado de Situación Financiera con cuentas dinámicas por actividad económica.
// Fase 2 UX: bloques colapsables en móvil, resumen pegajoso, gráficos
// responsivos, tokens semánticos de color.
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { useExpedientes, type ValorCuenta } from "@/stores/expedientes";
import { useCuentasActividad } from "@/hooks/useCuentasActividad";
import { useIsMobile } from "@/hooks/use-mobile";
import { CampoFinanciero } from "./CampoFinanciero";
import { BannerActividad } from "./BannerActividad";
import { ResumenPegajoso } from "./ResumenPegajoso";
import {
  BloqueFinanciero, SubtotalRow, ResumenBox, ListaAlertas,
} from "./BloqueFinanciero";

interface Props {
  expedienteId: string;
  tipoActividad?: string;
  onSwitchToSolicitud: () => void;
}

const fmt = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;

export function SituacionFinancieraModule({
  expedienteId, tipoActividad, onSwitchToSolicitud,
}: Props) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const guardar = useExpedientes((s) => s.guardarValorEstado);
  const actualizarObs = useExpedientes((s) => s.actualizarObservacionesEstado);
  const esMovil = useIsMobile();

  const cuentas = useCuentasActividad(tipoActividad);
  const datos = exp?.situacionFinanciera;
  const valores = datos?.valores ?? {};

  const totales = useMemo(() => {
    const sum = (lista: { id: string }[]) =>
      lista.reduce((a, c) => a + (valores[c.id]?.valor || 0), 0);
    const activoCorriente = sum(cuentas.activosCorriente);
    const activoFijo = sum(cuentas.activosFijos);
    const activoInmueble = sum(cuentas.activosInmuebles);
    const totalActivos = activoCorriente + activoFijo + activoInmueble;
    const pasivoCorriente = sum(cuentas.pasivosCorriente);
    const pasivoLP = sum(cuentas.pasivosLargoPlazo);
    const totalPasivos = pasivoCorriente + pasivoLP;
    const patrimonio = totalActivos - totalPasivos;
    const indiceEndeudamiento = totalActivos > 0 ? (totalPasivos / totalActivos) * 100 : 0;
    const razonLiquidez =
      pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : activoCorriente > 0 ? 99 : 0;
    return {
      activoCorriente, activoFijo, activoInmueble, totalActivos,
      pasivoCorriente, pasivoLP, totalPasivos, patrimonio,
      indiceEndeudamiento, razonLiquidez,
    };
  }, [cuentas, valores]);

  const llenos = (lista: { id: string }[]) =>
    lista.filter((c) => (valores[c.id]?.valor || 0) > 0).length;

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
      <ResumenPegajoso
        label="Patrimonio neto"
        valor={totales.patrimonio}
        secundario={{
          label: "Endeud.",
          valor: totales.indiceEndeudamiento,
          sufijo: "%",
          alerta: totales.indiceEndeudamiento > 60,
        }}
        alertas={alertas.length}
      />

      <BannerActividad
        tipoActividad={cuentas.tipoActividad}
        etiquetas={cuentas.etiquetas}
        onCambiarActividad={onSwitchToSolicitud}
      />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <BloqueFinanciero
          titulo="Activos corrientes"
          icono="💵"
          color="teal"
          colapsableEnEscritorio
          subtotal={totales.activoCorriente}
          llenos={llenos(cuentas.activosCorriente)}
          total={cuentas.activosCorriente.length}
          defaultAbierto
        >
          {cuentas.activosCorriente.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total corriente" valor={totales.activoCorriente} tono="teal" />
        </BloqueFinanciero>

        <BloqueFinanciero
          titulo="Activos fijos"
          icono="🚜"
          color="verde"
          colapsableEnEscritorio
          subtotal={totales.activoFijo}
          llenos={llenos(cuentas.activosFijos)}
          total={cuentas.activosFijos.length}
        >
          {cuentas.activosFijos.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total fijos" valor={totales.activoFijo} tono="verde" />
        </BloqueFinanciero>

        <BloqueFinanciero
          titulo="Inmuebles"
          icono="🏠"
          color="verde"
          colapsableEnEscritorio
          subtotal={totales.activoInmueble}
          llenos={llenos(cuentas.activosInmuebles)}
          total={cuentas.activosInmuebles.length}
        >
          {cuentas.activosInmuebles.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total inmuebles" valor={totales.activoInmueble} tono="verde" />
        </BloqueFinanciero>

        <BloqueFinanciero
          titulo="Pasivos"
          icono="💳"
          color="rojo"
          colapsableEnEscritorio
          subtotal={totales.totalPasivos}
          llenos={llenos([...cuentas.pasivosCorriente, ...cuentas.pasivosLargoPlazo])}
          total={cuentas.pasivosCorriente.length + cuentas.pasivosLargoPlazo.length}
        >
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Corto plazo
          </div>
          {cuentas.pasivosCorriente.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total pasivo corriente" valor={totales.pasivoCorriente} tono="rojo" />

          <div className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Largo plazo
          </div>
          {cuentas.pasivosLargoPlazo.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total pasivo LP" valor={totales.pasivoLP} tono="rojo" />
          <SubtotalRow label="Total pasivos" valor={totales.totalPasivos} tono="rojo" destacado />
        </BloqueFinanciero>
      </div>

      {/* Patrimonio y salud financiera */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Patrimonio y salud financiera
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
          <ResumenBox label="Total activos" valor={totales.totalActivos} />
          <ResumenBox label="Total pasivos" valor={totales.totalPasivos} tono="amber" />
          <ResumenBox label="Patrimonio neto" valor={totales.patrimonio} destacado />
          <ResumenBox
            label="Endeudamiento"
            valor={totales.indiceEndeudamiento}
            sufijo="%"
            tono={
              totales.indiceEndeudamiento > 60 ? "red"
              : totales.indiceEndeudamiento > 40 ? "amber"
              : "green"
            }
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Razón de liquidez:{" "}
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {totales.razonLiquidez.toFixed(2)}
          </span>
        </div>
        <ListaAlertas alertas={alertas} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Estructura del balance</h3>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={balance}
                stackOffset="sign"
                layout={esMovil ? "vertical" : "horizontal"}
                margin={{ top: 4, right: 8, left: esMovil ? -28 : 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,#e2e8f0)" />
                {esMovil ? (
                  <>
                    <XAxis
                      type="number"
                      fontSize={9}
                      stroke="var(--chart-axis,#64748b)"
                      tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                    />
                    <YAxis type="category" dataKey="name" fontSize={9} stroke="var(--chart-axis,#64748b)" width={54} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="name" fontSize={10} stroke="var(--chart-axis,#64748b)" />
                    <YAxis
                      fontSize={10}
                      stroke="var(--chart-axis,#64748b)"
                      tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                    />
                  </>
                )}
                <Tooltip formatter={(v: number) => fmt(Math.abs(v))} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: esMovil ? 9 : 11 }} iconSize={8} />
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

        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Composición de activos</h3>
          <div className="h-52 sm:h-64">
            {donaActivos.length === 0 ? (
              <p className="grid h-full place-items-center text-xs text-muted-foreground">
                Sin activos registrados
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donaActivos}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={esMovil ? 58 : 80}
                    innerRadius={esMovil ? 30 : 40}
                  >
                    {donaActivos.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Legend
                    wrapperStyle={{ fontSize: esMovil ? 10 : 11 }}
                    iconSize={8}
                    layout="horizontal"
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <label
          htmlFor="obs-situacion"
          className="mb-2 block text-xs font-medium text-foreground"
        >
          Observaciones del asesor
        </label>
        <textarea
          id="obs-situacion"
          rows={3}
          value={datos?.observacionesAsesor || ""}
          onChange={(e) => actualizarObs(expedienteId, "situacion", e.target.value)}
          placeholder="Verificación de bienes, situación legal de inmuebles, etc."
          className="w-full resize-y rounded-xl border border-input bg-transparent p-3 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fieldcredit-teal/50 focus-visible:ring-offset-2"
        />
      </div>
    </section>
  );
}

export function estadoSituacionStatus(
  datos?: { valores: Record<string, ValorCuenta> },
): "pendiente" | "progreso" | "completo" | "alerta" {
  if (!datos || Object.keys(datos.valores).length === 0) return "pendiente";
  const conValor = Object.values(datos.valores).filter((v) => v.valor > 0).length;
  if (conValor >= 3) return "completo";
  return "progreso";
}
