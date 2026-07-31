// Estado de Resultados con cuentas dinámicas por actividad económica.
// Fase 2 UX: bloques colapsables en móvil, resumen pegajoso, gráficos
// responsivos, tokens semánticos de color.
import { useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
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
  cuotaEstimada: number;
  onSwitchToSolicitud: () => void;
}

const fmt = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;

export function EstadoResultadosModule({
  expedienteId, tipoActividad, cuotaEstimada, onSwitchToSolicitud,
}: Props) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const guardarValor = useExpedientes((s) => s.guardarValorEstado);
  const actualizarObs = useExpedientes((s) => s.actualizarObservacionesEstado);
  const esMovil = useIsMobile();

  const cuentas = useCuentasActividad(tipoActividad);
  const datos = exp?.estadoResultados;
  const valores = datos?.valores ?? {};

  // Pre-llenado gestionado por useSincronizarEstados (montado en expedientes.$id.tsx).

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
    return {
      ingresos, costos, gastosOp, consumo, utilidadBruta, utilidadOperativa,
      excedenteFamiliar, excedenteNeto, margenBruto, capacidadPago,
    };
  }, [cuentas, valores, cuotaEstimada]);

  // Cantidad de campos con valor por bloque, para el contador del encabezado.
  const llenos = (lista: { id: string }[]) =>
    lista.filter((c) => (valores[c.id]?.valor || 0) > 0).length;

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
      {/* Resumen siempre visible mientras se captura (solo móvil) */}
      <ResumenPegajoso
        label="Excedente neto"
        valor={totales.excedenteNeto}
        secundario={{
          label: "Cap. pago",
          valor: totales.capacidadPago,
          sufijo: "%",
          alerta: totales.capacidadPago > 70,
        }}
        alertas={alertas.length}
      />

      <BannerActividad
        tipoActividad={cuentas.tipoActividad}
        etiquetas={cuentas.etiquetas}
        onCambiarActividad={onSwitchToSolicitud}
      />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Ingresos */}
        <BloqueFinanciero
          titulo="1. Ingresos"
          icono="💵"
          color="verde"
          subtotal={totales.ingresos}
          llenos={llenos(cuentas.ingresos)}
          total={cuentas.ingresos.length}
          defaultAbierto
        >
          {cuentas.ingresos.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total ingresos" valor={totales.ingresos} tono="verde" />
        </BloqueFinanciero>

        {/* Costos */}
        <BloqueFinanciero
          titulo={`2. ${cuentas.etiquetas.costos}`}
          icono={cuentas.etiquetas.icono}
          color="rojo"
          subtotal={totales.costos}
          llenos={llenos(cuentas.costos)}
          total={cuentas.costos.length}
        >
          {cuentas.esAsalariado && (
            <p className="mb-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              El cliente es asalariado: no aplican costos de producción. Registrar únicamente
              gastos relacionados al empleo (si los hubiese).
            </p>
          )}
          {cuentas.costos.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total costos" valor={totales.costos} tono="rojo" />
          <SubtotalRow
            label="Utilidad bruta"
            valor={totales.utilidadBruta}
            tono={totales.utilidadBruta >= 0 ? "verde" : "rojo"}
            destacado
          />
        </BloqueFinanciero>

        {/* Gastos de operación */}
        <BloqueFinanciero
          titulo="3. Gastos de operación"
          icono="⚙️"
          color="ambar"
          subtotal={totales.gastosOp}
          llenos={llenos(cuentas.gastosOperacion)}
          total={cuentas.gastosOperacion.length}
        >
          {cuentas.gastosOperacion.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total operación" valor={totales.gastosOp} tono="ambar" />
          <SubtotalRow
            label="Utilidad operativa"
            valor={totales.utilidadOperativa}
            tono={totales.utilidadOperativa >= 0 ? "verde" : "rojo"}
            destacado
          />
        </BloqueFinanciero>

        {/* Consumo familiar */}
        <BloqueFinanciero
          titulo="4. Consumo familiar"
          icono="🏠"
          color="teal"
          subtotal={totales.consumo}
          llenos={llenos(cuentas.consumoFamiliar)}
          total={cuentas.consumoFamiliar.length}
        >
          {cuentas.consumoFamiliar.map((c) => (
            <CampoFinanciero key={c.id} cuenta={c} registro={valores[c.id]} onChange={onChange} />
          ))}
          <SubtotalRow label="Total consumo" valor={totales.consumo} tono="teal" />
        </BloqueFinanciero>
      </div>

      {/* Resultado del período */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">5. Resultado del período</h3>
        <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
          <ResumenBox label="Excedente familiar" valor={totales.excedenteFamiliar} />
          <ResumenBox label="Cuota estimada" valor={-cuotaEstimada} tono="amber" />
          <ResumenBox label="Excedente neto" valor={totales.excedenteNeto} destacado />
          <ResumenBox
            label="Capacidad de pago"
            valor={totales.capacidadPago}
            sufijo="%"
            tono={totales.capacidadPago > 70 ? "red" : totales.capacidadPago > 50 ? "amber" : "green"}
          />
        </div>
        <ListaAlertas alertas={alertas} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Cascada del resultado</h3>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cascada} margin={{ top: 4, right: 4, left: esMovil ? -20 : 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid,#e2e8f0)" />
                <XAxis
                  dataKey="name"
                  fontSize={esMovil ? 9 : 10}
                  stroke="var(--chart-axis,#64748b)"
                  interval={0}
                  angle={esMovil ? -35 : 0}
                  textAnchor={esMovil ? "end" : "middle"}
                  height={esMovil ? 44 : 30}
                />
                <YAxis
                  fontSize={esMovil ? 9 : 10}
                  stroke="var(--chart-axis,#64748b)"
                  tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  width={esMovil ? 38 : 60}
                />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {cascada.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Composición del ingreso</h3>
          <div className="h-52 sm:h-64">
            {donaIngresos.length === 0 ? (
              <p className="grid h-full place-items-center text-xs text-muted-foreground">
                Sin ingresos registrados
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donaIngresos}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={esMovil ? 58 : 80}
                    innerRadius={esMovil ? 30 : 40}
                    /* En móvil las etiquetas alrededor de la dona se salen del
                       contenedor y se cortan: la leyenda inferior las sustituye. */
                    label={esMovil ? false : (e) => `${e.name}`}
                  >
                    {donaIngresos.map((_, i) => <Cell key={i} fill={colores[i % colores.length]} />)}
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
          htmlFor="obs-resultados"
          className="mb-2 block text-xs font-medium text-foreground"
        >
          Observaciones del asesor
        </label>
        <textarea
          id="obs-resultados"
          rows={3}
          value={datos?.observacionesAsesor || ""}
          onChange={(e) => actualizarObs(expedienteId, "resultados", e.target.value)}
          placeholder="Notas sobre la calidad de la información, verificaciones realizadas, etc."
          className="w-full resize-y rounded-xl border border-input bg-transparent p-3 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fieldcredit-teal/50 focus-visible:ring-offset-2"
        />
      </div>
    </section>
  );
}

// Estado del módulo para el indicador de tab
export function estadoResultadosStatus(
  datos?: { valores: Record<string, ValorCuenta> },
  cuentasObligatorias: string[] = [],
): "pendiente" | "progreso" | "completo" | "alerta" {
  if (!datos || Object.keys(datos.valores).length === 0) return "pendiente";
  const faltantes = cuentasObligatorias.filter((id) => !(datos.valores[id]?.valor > 0));
  if (faltantes.length === 0) return "completo";
  return "progreso";
}
