// Módulo de Flujo de Efectivo — formulario + gráficos interactivos
// Fase 2 UX: captura monetaria segura, grilla de meses navegable en móvil,
// resumen pegajoso, gráficos responsivos y tokens semánticos de color.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer, Area, AreaChart, ReferenceArea, ComposedChart, Line,
  PieChart, Pie, Cell,
} from "recharts";
import {
  HelpCircle, BarChart3, ListChecks, AlertTriangle,
  CheckCircle2, XCircle, Info, ChevronLeft, ChevronRight, Zap,
} from "lucide-react";
import { useExpedientes } from "@/stores/expedientes";
import { AlertasCoherencia } from "@/components/ia/AlertasCoherencia";
import { InputMonetario } from "@/components/ui/input-monetario";
import { ResumenPegajoso } from "@/components/estados/ResumenPegajoso";
import { BloqueFinanciero } from "@/components/estados/BloqueFinanciero";
import { CopilotoFlujo, type ResumenFlujoIA } from "@/components/ia/CopilotoFlujo";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BLOQUE_META, BLOQUE_BG, COLORES_GRAFICO,
  generarMeses, mesActualISO, type Bloque,
} from "@/data/flujo-catalogos";
import { getRubrosParaActividad } from "@/data/rubrosFlujoPorActividad";
import { useRubrosActividad } from "@/hooks/useRubrosActividad";
import { cn } from "@/lib/utils";

// Formato monetario
const fmtC = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;

// Tono e ícono de cada bloque, para que los bloques del flujo se vean y se
// comporten igual que los de Estado de Resultados y Situación Financiera.
const TONO_BLOQUE: Record<Bloque, "verde" | "rojo" | "ambar" | "teal"> = {
  A: "verde", B: "teal", C: "ambar", D: "rojo", F: "teal", E: "rojo",
};
const ICONO_BLOQUE: Record<Bloque, string> = {
  A: "\u{1F4B5}", B: "\u{1F33E}", C: "\u{1F3E0}", D: "\u{1F69C}", F: "\u{2699}\u{FE0F}", E: "\u{1F4B3}",
};
const fmtK = (n: number) => `C$${(n / 1000).toFixed(0)}k`;

interface Props {
  expedienteId: string;
  plazoMeses: number;
  tipoActividad?: string;
  montoSolicitado: number;
  onSwitchToSolicitud?: () => void;
}

export function FlujoModule({
  expedienteId, plazoMeses, tipoActividad, montoSolicitado, onSwitchToSolicitud,
}: Props) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]?.flujo);
  const inicializarFlujo = useExpedientes((s) => s.inicializarFlujo);
  const rubrosAct = useRubrosActividad(tipoActividad);
  const [vista, setVista] = useState<"datos" | "graficos">("datos");
  const [bloquesAbiertos, setBloquesAbiertos] = useState<Record<Bloque, boolean>>({
    A: true, B: false, C: false, D: false, F: false, E: false,
  });

  // Inicializa el flujo al montar
  useEffect(() => {
    const mesInicio = mesActualISO();
    const cuotaInicial = plazoMeses > 0 ? Math.round((montoSolicitado || 0) / plazoMeses) : 0;
    inicializarFlujo(expedienteId, { plazoMeses, mesInicio, tipoActividad, cuotaEstimada: cuotaInicial });
  }, [expedienteId, plazoMeses, tipoActividad, montoSolicitado, inicializarFlujo]);

  const meses = useMemo(
    () => (flujo ? generarMeses(flujo.mesInicio, flujo.plazoMeses) : []),
    [flujo],
  );
  // Los hooks deben ejecutarse siempre en el mismo orden, así que el resumen se
  // calcula antes del early return de "flujo no inicializado".
  const resumenIA = useResumenIA(expedienteId, meses);

  if (!flujo) {
    return <p className="text-sm text-muted-foreground">Inicializando flujo de efectivo…</p>;
  }

  const toggleBloque = (b: Bloque) => setBloquesAbiertos((prev) => ({ ...prev, [b]: !prev[b] }));

  return (
    <div className="space-y-4">
      <ResumenFlujo expedienteId={expedienteId} />

      {/* Banner de actividad económica */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-fieldcredit-green/40 bg-fieldcredit-green-pale p-3 dark:border-green-700 dark:bg-green-900/20">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xl">{rubrosAct.etiquetas.icono}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fieldcredit-green-dark dark:text-green-200">
              Rubros para: {rubrosAct.tipoActividad}
            </p>
            <p className="truncate text-xs text-slate-600 dark:text-slate-300">
              {rubrosAct.etiquetas.nota}
            </p>
          </div>
        </div>
        {onSwitchToSolicitud && (
          <button
            type="button"
            onClick={onSwitchToSolicitud}
            className="shrink-0 whitespace-nowrap text-xs font-semibold text-fieldcredit-teal underline underline-offset-2 transition-colors hover:text-fieldcredit-teal-dark"
          >
            Cambiar →
          </button>
        )}
      </div>

      {/* Selector de vista (móvil y tablet) */}
      <div className="flex gap-1 rounded-2xl border border-border bg-card p-1 lg:hidden">
        <button
          onClick={() => setVista("datos")}
          aria-pressed={vista === "datos"}
          className={cn(
            "flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            vista === "datos"
              ? "bg-fieldcredit-green text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <ListChecks size={14} className="mr-1 inline" /> Ingresar datos
        </button>
        <button
          onClick={() => setVista("graficos")}
          aria-pressed={vista === "graficos"}
          className={cn(
            "flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            vista === "graficos"
              ? "bg-fieldcredit-green text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <BarChart3 size={14} className="mr-1 inline" /> Gráficos
        </button>
      </div>

      {/* Alertas de coherencia en tiempo real durante la captura */}
      <AlertasCoherencia expedienteId={expedienteId} modoCompacto />

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className={cn("min-w-0 space-y-4", vista === "graficos" && "hidden lg:block")}>
          <VistaDatos
            expedienteId={expedienteId}
            meses={meses}
            bloquesAbiertos={bloquesAbiertos}
            toggleBloque={toggleBloque}
          />
        </div>
        <div className={cn("min-w-0 space-y-4", vista === "datos" && "hidden lg:block")}>
          <VistaGraficos expedienteId={expedienteId} resumen={resumenIA} />
        </div>
      </div>
    </div>
  );
}

/* =============== RESUMEN PARA EL COPILOTO =============== */

/**
 * Arma el resumen numérico del flujo que se le entrega al Copiloto, para que
 * responda sobre lo que el asesor tiene en pantalla y no solo sobre lo guardado.
 */
function useResumenIA(expedienteId: string, meses: string[]): ResumenFlujoIA {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]?.flujo);
  const { datosMensuales } = useCalculos(expedienteId);

  return useMemo(() => {
    const critico = datosMensuales.reduce(
      (max, d, i) => (d.capacidadPago > max.cap ? { nombre: meses[i] ?? "—", cap: d.capacidadPago } : max),
      { nombre: meses[0] ?? "—", cap: -Infinity },
    );
    const capProm = promedio(datosMensuales.map((d) => d.capacidadPago));
    return {
      saldoPromedio: promedio(datosMensuales.map((d) => d.saldoNeto)),
      ingresoPromedio: promedio(datosMensuales.map((d) => d.ingresos)),
      egresoPromedio: promedio(datosMensuales.map((d) => d.egresos)),
      capacidadPagoPromedio: isFinite(capProm) ? capProm : 0,
      mesCritico: critico.nombre,
      capacidadMesCritico: isFinite(critico.cap) ? critico.cap : 0,
      mesesNegativos: datosMensuales.filter((d) => d.saldoNeto < 0).length,
      plazoMeses: flujo?.plazoMeses ?? 0,
      cuotaEstimada: flujo?.cuotaEstimada ?? 0,
    };
  }, [datosMensuales, meses, flujo?.plazoMeses, flujo?.cuotaEstimada]);
}

/* =============== RESUMEN PEGAJOSO =============== */

function ResumenFlujo({ expedienteId }: { expedienteId: string }) {
  const { datosMensuales } = useCalculos(expedienteId);
  if (datosMensuales.length === 0) return null;

  const saldoProm = promedio(datosMensuales.map((d) => d.saldoNeto));
  const capProm = promedio(datosMensuales.map((d) => d.capacidadPago));
  const mesesNeg = datosMensuales.filter((d) => d.saldoNeto < 0).length;

  return (
    <ResumenPegajoso
      label="Saldo neto promedio"
      valor={saldoProm}
      secundario={{
        label: "Cap. pago",
        valor: isFinite(capProm) ? Math.min(capProm, 999) : 0,
        sufijo: "%",
        alerta: capProm > 70,
      }}
      alertas={mesesNeg}
    />
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

  const subtotalBloque = (b: Bloque) =>
    rubrosDin[b].reduce((acc, r) => {
      if (!flujo.rubrosActivos[r.key]) return acc;
      return acc + (flujo.valores[r.key]?.reduce((s, v) => s + v, 0) ?? 0);
    }, 0);

  const activosBloque = (b: Bloque) =>
    rubrosDin[b].filter((r) => flujo.rubrosActivos[r.key]).length;

  return (
    <div className="min-w-0 space-y-3">
      {(Object.keys(rubrosDin) as Bloque[]).map((b) => (
        <BloqueForm
          key={b}
          bloque={b}
          expedienteId={expedienteId}
          meses={meses}
          abierto={bloquesAbiertos[b]}
          onToggle={() => toggleBloque(b)}
          subtotal={subtotalBloque(b)}
          activos={activosBloque(b)}
          total={rubrosDin[b].length}
        />
      ))}

      <BloqueSaldo expedienteId={expedienteId} meses={meses} datosMensuales={datosMensuales} />
    </div>
  );
}

function BloqueForm({
  bloque, expedienteId, meses, abierto, onToggle, subtotal, activos, total,
}: {
  bloque: Bloque;
  expedienteId: string;
  meses: string[];
  abierto: boolean;
  onToggle: () => void;
  subtotal: number;
  activos: number;
  total: number;
}) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]!.flujo!);
  const setValoresRubro = useExpedientes((s) => s.setValoresRubroFlujo);
  const meta = BLOQUE_META[bloque];
  const bg = BLOQUE_BG[bloque];
  const rubrosBloque = getRubrosParaActividad(flujo.tipoActividad)[bloque];

  const totalConsumoFamiliar = bloque === "C" ? subtotal / (flujo.plazoMeses || 1) : 0;
  const consumoBajo = bloque === "C" && subtotal > 0 && totalConsumoFamiliar < 3000;

  const rellenarMes1EnTodos = () => {
    rubrosBloque.forEach((r) => {
      if (!flujo.rubrosActivos[r.key]) return;
      const valorM1 = flujo.valores[r.key]?.[0] ?? 0;
      if (valorM1 > 0) {
        setValoresRubro(expedienteId, r.key, new Array(flujo.plazoMeses).fill(valorM1));
      }
    });
  };

  // Un bloque sin rubros (F en varias actividades) no aporta nada en pantalla.
  if (rubrosBloque.length === 0) return null;

  // Se reutiliza BloqueFinanciero — el mismo componente de Estado de Resultados
  // y Situación Financiera — para que el encabezado, el chevron, el subtotal y
  // el contador se vean e interactúen igual en los tres módulos.
  return (
    <BloqueFinanciero
      titulo={meta.titulo}
      icono={ICONO_BLOQUE[bloque]}
      color={TONO_BLOQUE[bloque]}
      bgPersonalizado={bg}
      colapsableEnEscritorio
      abierto={abierto}
      onToggle={onToggle}
      subtotal={subtotal}
      llenos={activos}
      total={total}
    >
      <div className="min-w-0 space-y-3">
        <p className="rounded-xl bg-muted p-2.5 text-xs text-muted-foreground">
          💡 {meta.tip}
        </p>

        <button
          type="button"
          onClick={rellenarMes1EnTodos}
          className="flex items-center gap-1.5 rounded-xl bg-fieldcredit-teal-pale px-3 py-2 text-xs font-semibold text-fieldcredit-teal-dark transition-colors hover:bg-fieldcredit-teal-light active:scale-[0.97] dark:bg-teal-900/30 dark:text-teal-200"
        >
          <Zap size={13} /> Rellenar todos los meses con el valor del mes 1
        </button>

        {rubrosBloque.map((r) => (
          <FilaRubro
            key={r.key}
            rubro={r}
            bloque={bloque}
            expedienteId={expedienteId}
            plazoMeses={flujo.plazoMeses}
            meses={meses}
          />
        ))}

        {consumoBajo && (
          <div className="rounded-xl border border-fieldcredit-amber/40 bg-fieldcredit-amber-light p-2.5 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            ⚠️ El gasto familiar declarado parece bajo para una familia. ¿Es correcto? Un gasto
            mínimo referencial es C$3,000/mes.
          </div>
        )}

        <div className={cn("rounded-xl px-3 py-2.5 text-sm font-bold", meta.subtotal)}>
          SUBTOTAL {meta.titulo.split(".")[1]?.trim().toUpperCase() || ""} — {fmtC(subtotal)}
        </div>
      </div>
    </BloqueFinanciero>
  );
}

/* -------- Fila rubro con toggle igual / variable -------- */

function FilaRubro({
  rubro, bloque, expedienteId, plazoMeses, meses,
}: {
  rubro: { key: string; label: string; ayuda: string };
  bloque: Bloque;
  expedienteId: string;
  plazoMeses: number;
  meses: string[];
}) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]!.flujo!);
  const toggleRubro = useExpedientes((s) => s.toggleRubroFlujo);
  const actualizarValor = useExpedientes((s) => s.actualizarValorMesFlujo);
  const setValoresRubro = useExpedientes((s) => s.setValoresRubroFlujo);
  const actualizarDesc = useExpedientes((s) => s.actualizarDescRubroFlujo);

  const activo = !!flujo.rubrosActivos[rubro.key];
  const valores = useMemo(() => flujo.valores[rubro.key] ?? [], [flujo.valores, rubro.key]);
  const totalRubro = valores.reduce((s, v) => s + v, 0);
  const activoSinValores = activo && totalRubro === 0 && bloque === "B";

  const todosIguales = valores.length > 0 && valores.every((v) => v === valores[0]);
  const [modoManual, setModoManual] = useState<boolean | null>(null);
  const modoIgual = modoManual ?? todosIguales;

  // El valor base se deriva de los datos, no se guarda en estado aparte.
  // Antes se inicializaba una sola vez al montar: si los valores llegaban
  // después (hidratación desde Supabase), el campo se quedaba mostrando 0
  // aunque el rubro sí tuviera monto guardado.
  const valorBase = todosIguales ? (valores[0] ?? 0) : 0;

  const aplicarATodos = (valor: number) => {
    setValoresRubro(expedienteId, rubro.key, new Array(plazoMeses).fill(valor));
  };

  return (
    <div className="min-w-0 rounded-2xl border border-border p-2.5 transition-colors">
      <div className="mb-2 flex items-center gap-2">
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={activo}
            onChange={() => toggleRubro(expedienteId, rubro.key)}
            className="peer sr-only"
            aria-label={`Activar ${rubro.label}`}
          />
          <div className="peer h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-fieldcredit-green peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-fieldcredit-teal/50 peer-focus-visible:ring-offset-2 dark:bg-slate-600" />
        </label>
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{rubro.label}</span>
        <TooltipInline text={rubro.ayuda} />
        {activo && (
          <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-muted-foreground">
            {fmtC(totalRubro)}
          </span>
        )}
      </div>

      {activo && (
        <>
          {(rubro.key === "otroFijo" || rubro.key === "otroEstacional") && (
            <input
              type="text"
              placeholder="Describe este rubro..."
              value={
                rubro.key === "otroFijo"
                  ? (flujo.otroFijoDesc ?? "")
                  : (flujo.otroEstacionalDesc ?? "")
              }
              onChange={(e) =>
                actualizarDesc(
                  expedienteId,
                  rubro.key === "otroFijo" ? "otroFijoDesc" : "otroEstacionalDesc",
                  e.target.value,
                )
              }
              className="mb-2 h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fieldcredit-teal/50 focus-visible:ring-offset-1"
            />
          )}

          {/* Toggle de modo */}
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setModoManual(!modoIgual)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 active:scale-[0.97]",
                modoIgual
                  ? "border-fieldcredit-teal bg-fieldcredit-teal text-white"
                  : "border-input bg-transparent text-muted-foreground hover:bg-accent",
              )}
              title={
                modoIgual
                  ? "Un mismo valor se aplica a todos los meses"
                  : "Cada mes tiene su propio valor"
              }
            >
              {modoIgual ? "= Igual todos los meses" : "≠ Variable por mes"}
            </button>
          </div>

          {modoIgual ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[140px] flex-1">
                <InputMonetario
                  valor={valorBase}
                  onChange={aplicarATodos}
                  destacado
                  aria-label={`Valor mensual de ${rubro.label}`}
                />
              </div>
              <span className="shrink-0 rounded-full bg-fieldcredit-teal-pale px-2.5 py-1 text-[11px] font-semibold text-fieldcredit-teal-dark dark:bg-teal-900/30 dark:text-teal-200">
                × {plazoMeses} meses
              </span>
              <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-foreground">
                = {fmtC(valorBase * plazoMeses)}
              </span>
            </div>
          ) : (
            <GrillaMeses
              meses={meses}
              valores={valores}
              rubroLabel={rubro.label}
              onCambiar={(idx, v) => actualizarValor(expedienteId, rubro.key, idx, v)}
            />
          )}

          {activoSinValores && (
            <p className="mt-2 text-xs text-fieldcredit-amber">
              ⚠️ Este rubro está activo pero todos los meses están en cero. ¿No hay ingreso en el
              período?
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* -------- Grilla de meses con navegación -------- */

function GrillaMeses({
  meses, valores, rubroLabel, onCambiar,
}: {
  meses: string[];
  valores: number[];
  rubroLabel: string;
  onCambiar: (idx: number, valor: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  // Con 12 o 24 meses la grilla se desplaza varias pantallas a la derecha y
  // nada indica que haya más meses fuera de vista. Estas flechas y el degradado
  // del borde hacen visible que la fila continúa.
  const revisarScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setPuedeIzq(el.scrollLeft > 4);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    revisarScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", revisarScroll, { passive: true });
    window.addEventListener("resize", revisarScroll);
    return () => {
      el.removeEventListener("scroll", revisarScroll);
      window.removeEventListener("resize", revisarScroll);
    };
  }, [meses.length]);

  const desplazar = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 264, behavior: "smooth" });
  };

  return (
    <div className="relative min-w-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {meses.length} meses · deslizá para ver más
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => desplazar(-1)}
            disabled={!puedeIzq}
            aria-label="Meses anteriores"
            data-compact
            className="grid h-7 w-7 place-items-center rounded-full border border-input text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => desplazar(1)}
            disabled={!puedeDer}
            aria-label="Meses siguientes"
            data-compact
            className="grid h-7 w-7 place-items-center rounded-full border border-input text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-1 overflow-x-auto scrollbar-hide scroll-smooth px-1"
        style={{ scrollSnapType: "x proximity" }}
      >
        <div className="flex gap-1.5" style={{ minWidth: `${meses.length * 92}px` }}>
          {meses.map((m, idx) => (
            <div
              key={idx}
              className="flex w-[86px] shrink-0 flex-col items-center"
              style={{ scrollSnapAlign: "start" }}
            >
              <label
                htmlFor={`mes-${rubroLabel}-${idx}`}
                className="mb-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {m}
              </label>
              <InputMonetario
                id={`mes-${rubroLabel}-${idx}`}
                valor={valores[idx] ?? 0}
                onChange={(v) => onCambiar(idx, v)}
                prefijo={null}
                destacado
                aria-label={`${rubroLabel} — mes ${m}`}
              />
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => onCambiar(idx, valores[idx - 1] ?? 0)}
                  className="mt-1 rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-fieldcredit-teal"
                  title="Copiar valor del mes anterior"
                >
                  ↑ copiar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Degradados que insinúan contenido fuera de vista */}
      {puedeIzq && (
        <div className="pointer-events-none absolute bottom-6 left-0 top-6 w-6 bg-gradient-to-r from-card to-transparent" />
      )}
      {puedeDer && (
        <div className="pointer-events-none absolute bottom-6 right-0 top-6 w-6 bg-gradient-to-l from-card to-transparent" />
      )}
    </div>
  );
}

function TooltipInline({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        title={text}
        aria-label={`Ayuda: ${text}`}
        data-compact
        className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <HelpCircle size={14} />
      </button>
      <span className="pointer-events-none absolute right-0 top-7 z-20 hidden w-48 rounded-xl bg-slate-900 p-2 text-[10px] text-white shadow-lg group-hover:block dark:bg-slate-700">
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
    { nombre: meses[0] || "—", cap: -Infinity },
  );
  const mesesNeg = datosMensuales.filter((d) => d.saldoNeto < 0).length;

  return (
    <section className="min-w-0 rounded-2xl border-2 border-fieldcredit-green bg-card p-3 shadow-sm sm:p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        F. Saldo y capacidad de pago
      </h3>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="cuota-flujo" className="text-sm text-foreground">
          Cuota estimada MiCrédito (C$/mes):
        </label>
        <div className="w-32">
          <InputMonetario
            id="cuota-flujo"
            valor={flujo.cuotaEstimada || 0}
            onChange={(v) => actualizarCuota(expedienteId, v)}
            prefijo={null}
            aria-label="Cuota estimada mensual"
          />
        </div>
      </div>

      <div className="-mx-3 min-w-0 overflow-x-auto scrollbar-hide px-3 sm:mx-0 sm:px-0">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead>
            <tr className="bg-muted">
              <th className="sticky left-0 z-10 bg-muted px-2 py-1.5 text-left"> </th>
              {meses.map((m) => (
                <th
                  key={m}
                  className="px-2 py-1.5 text-right font-medium text-muted-foreground"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <FilaTabla label="Ingresos" values={datosMensuales.map((d) => fmtC(d.ingresos))} />
            <FilaTabla label="Egresos" values={datosMensuales.map((d) => fmtC(d.egresos))} />
            <FilaTabla
              label="Saldo"
              values={datosMensuales.map((d) => (
                <span className={d.saldoNeto < 0 ? "font-semibold text-fieldcredit-red" : ""}>
                  {fmtC(d.saldoNeto)}
                </span>
              ))}
            />
            <FilaTabla label="Cuota" values={datosMensuales.map((d) => fmtC(d.cuota))} />
            <FilaTabla
              label="Disponible"
              values={datosMensuales.map((d) => (
                <span className={d.disponible < 0 ? "font-semibold text-fieldcredit-red" : ""}>
                  {fmtC(d.disponible)}
                </span>
              ))}
            />
            <FilaTabla
              label="Cap. Pago"
              values={datosMensuales.map((d) => <SemaforoCap cap={d.capacidadPago} />)}
            />
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <TarjetaResumen titulo="Ingreso promedio" valor={`${fmtC(ingresoProm)}/mes`} />
        <TarjetaResumen titulo="Egreso promedio" valor={`${fmtC(egresoProm)}/mes`} />
        <TarjetaResumen titulo="Cap. pago prom." valor={<SemaforoCap cap={capPagoProm} />} />
        <TarjetaResumen
          titulo="Mes más crítico"
          valor={
            <span>
              {mesCritico.nombre}
              <br />
              <small>Cap: {isFinite(mesCritico.cap) ? mesCritico.cap.toFixed(0) : 0}%</small>
            </span>
          }
        />
        <TarjetaResumen
          titulo="Meses con saldo negativo"
          valor={
            <span className={mesesNeg === 0 ? "text-fieldcredit-green" : "text-fieldcredit-red"}>
              {mesesNeg} {mesesNeg === 0 ? "🟢" : "🔴"}
            </span>
          }
        />
      </div>
    </section>
  );
}

function FilaTabla({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr className="border-t border-border">
      <td className="sticky left-0 z-10 bg-card px-2 py-1.5 font-medium text-muted-foreground">
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-2 py-1.5 text-right font-mono tabular-nums text-foreground">
          {v}
        </td>
      ))}
    </tr>
  );
}

function TarjetaResumen({ titulo, valor }: { titulo: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/50 p-2.5 text-xs">
      <div className="text-muted-foreground">{titulo}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{valor}</div>
    </div>
  );
}

function SemaforoCap({ cap }: { cap: number }) {
  const c = isFinite(cap) ? cap : 0;
  const color =
    c > 70 ? "text-fieldcredit-red" : c > 50 ? "text-fieldcredit-amber" : "text-fieldcredit-green";
  const emoji = c > 70 ? "🔴" : c > 50 ? "🟡" : "🟢";
  return (
    <span className={cn("font-semibold tabular-nums", color)}>
      {c.toFixed(0)}% {emoji}
    </span>
  );
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
  gastosNegocio: number;
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
      const gastosNegocio = sumar("F", i);
      const otrasDeudas = sumar("E", i);
      const egresos = gastoHogar + costoProduccion + gastosNegocio + otrasDeudas;
      const saldoNeto = ingresos - egresos;
      const cuota = flujo.cuotaEstimada;
      const disponible = saldoNeto - cuota;
      const capacidadPago = saldoNeto > 0 ? (cuota / saldoNeto) * 100 : cuota > 0 ? 999 : 0;
      return {
        mes: m, ingresos, egresos, saldoNeto, disponible, capacidadPago, cuota,
        gastoHogar, costoProduccion, gastosNegocio, otrasDeudas, ingresosFijos, ingresosEstacional,
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

function VistaGraficos({
  expedienteId, resumen,
}: {
  expedienteId: string;
  resumen: ResumenFlujoIA;
}) {
  const flujo = useExpedientes((s) => s.expedientes[expedienteId]!.flujo!);
  const { datosMensuales } = useCalculos(expedienteId);
  const esMovil = useIsMobile();
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

  // Con muchos meses las etiquetas del eje X se enciman. Mostrar una de cada
  // dos (o de cada tres) mantiene el eje legible sin perder referencia.
  const intervaloX = esMovil
    ? chartData.length > 12 ? 2 : chartData.length > 6 ? 1 : 0
    : chartData.length > 18 ? 1 : 0;

  const ejeX = {
    dataKey: "mes",
    tick: { fontSize: esMovil ? 9 : 11, fill: "var(--chart-axis)" },
    interval: intervaloX as number,
    angle: esMovil ? -40 : 0,
    textAnchor: esMovil ? ("end" as const) : ("middle" as const),
    height: esMovil ? 46 : 30,
  };

  const ejeY = {
    tickFormatter: fmtK,
    tick: { fontSize: esMovil ? 9 : 11, fill: "var(--chart-axis)" },
    width: esMovil ? 44 : 60,
  };

  const margenChart = { top: 12, right: 8, bottom: 4, left: esMovil ? -8 : 0 };
  const altoChart = esMovil ? 200 : 240;
  const tooltipStyle = { borderRadius: 12, fontSize: 12 };
  const leyenda = { fontSize: esMovil ? 10 : 11 };

  return (
    <div className="min-w-0 space-y-4">
      <Grafico titulo="Ingresos vs Egresos por mes">
        <ResponsiveContainer width="100%" height={altoChart}>
          <BarChart data={chartData} margin={margenChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis {...ejeX} />
            <YAxis {...ejeY} />
            <Tooltip formatter={(v: number) => fmtC(v)} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={leyenda} iconSize={8} />
            <ReferenceLine
              y={cuotaMensual}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={esMovil ? undefined : { value: "Cuota", fill: "#f59e0b", fontSize: 11 }}
            />
            <Bar dataKey="ingresos" name="Ingresos" fill="#5eb837" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos" name="Egresos" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Grafico>

      <Grafico titulo="Saldo neto mensual vs Cuota del crédito">
        <ResponsiveContainer width="100%" height={esMovil ? 190 : 220}>
          <AreaChart
            data={chartData.map((d) => ({ ...d, cuotaLinea: cuotaMensual }))}
            margin={margenChart}
          >
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
            <XAxis {...ejeX} />
            <YAxis {...ejeY} />
            <Tooltip formatter={(v: number) => fmtC(v)} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={leyenda} iconSize={8} />
            <Area
              type="monotone" dataKey="saldoNeto" name="Saldo neto"
              stroke="#5eb837" strokeWidth={2.5} fill="url(#gradSaldo)"
              dot={{ fill: "#5eb837", r: esMovil ? 3 : 4 }} activeDot={{ r: 6 }}
            />
            <Area
              type="monotone" dataKey="cuotaLinea" name="Cuota del crédito"
              stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5"
              fill="url(#gradCuota)" dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Grafico>

      <Grafico
        titulo="Capacidad de pago mensual (%)"
        subtitulo="Meta: mantenerse bajo el 70% todos los meses"
      >
        <ResponsiveContainer width="100%" height={esMovil ? 190 : 220}>
          <ComposedChart data={chartData} margin={margenChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis {...ejeX} />
            <YAxis
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
              ticks={[0, 25, 50, 70, 100]}
              tick={{ fontSize: esMovil ? 9 : 11, fill: "var(--chart-axis)" }}
              width={esMovil ? 34 : 50}
            />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`, "Cap. de pago"]}
              contentStyle={tooltipStyle}
            />
            <ReferenceArea y1={0} y2={50} fill="#dcfce7" fillOpacity={0.4} />
            <ReferenceArea y1={50} y2={70} fill="#fef3c7" fillOpacity={0.5} />
            <ReferenceArea y1={70} y2={100} fill="#fee2e2" fillOpacity={0.5} />
            <ReferenceLine
              y={50} stroke="#5eb837" strokeDasharray="4 4"
              label={esMovil ? undefined : { value: "50%", fill: "#5eb837", fontSize: 10 }}
            />
            <ReferenceLine
              y={70} stroke="#dc2626" strokeDasharray="4 4"
              label={esMovil ? undefined : { value: "70% límite", fill: "#dc2626", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="capacidadPago"
              name="Cap. de pago"
              stroke="#45ada2"
              strokeWidth={2.5}
              dot={(props: { cx?: number; cy?: number; payload?: DatoMes; index?: number }) => {
                const { cx, cy, payload, index } = props;
                if (cx == null || cy == null || !payload) return <g key={index} />;
                const color =
                  payload.capacidadPago > 70 ? "#dc2626"
                  : payload.capacidadPago > 50 ? "#f59e0b"
                  : "#5eb837";
                return (
                  <circle
                    key={index} cx={cx} cy={cy} r={esMovil ? 4 : 5}
                    fill={color} stroke="white" strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Grafico>

      <Grafico titulo="Composición del ingreso total del período">
        {composicion.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Sin ingresos declarados aún.
          </p>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={esMovil ? 210 : 240}>
              <PieChart>
                <Pie
                  data={composicion}
                  cx="50%"
                  cy={esMovil ? "42%" : "50%"}
                  innerRadius={esMovil ? 42 : 60}
                  outerRadius={esMovil ? 64 : 90}
                  paddingAngle={3}
                  dataKey="valor"
                >
                  {composicion.map((_, index) => (
                    <Cell key={index} fill={COLORES_GRAFICO[index % COLORES_GRAFICO.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtC(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: esMovil ? 9 : 10 }} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
            {/* El total va centrado en el hueco de la dona, no en el contenedor:
                con la leyenda abajo, el centro visual del anillo sube. */}
            <div
              className="pointer-events-none absolute inset-x-0 flex justify-center"
              style={{ top: esMovil ? "30%" : "38%" }}
            >
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Total</div>
                <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {fmtC(totalIngresos)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Grafico>

      <Grafico titulo="Estructura de egresos por mes">
        <ResponsiveContainer width="100%" height={esMovil ? 190 : 220}>
          <BarChart data={chartData} margin={margenChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis {...ejeX} />
            <YAxis {...ejeY} />
            <Tooltip formatter={(v: number) => fmtC(v)} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={leyenda} iconSize={8} />
            <Bar dataKey="gastoHogar" name="Hogar y familia" fill="#8D6E63" stackId="a" />
            <Bar dataKey="costoProduccion" name="Producción" fill="#37474F" stackId="a" />
            <Bar dataKey="gastosNegocio" name="Gastos del negocio" fill="#1565C0" stackId="a" />
            <Bar dataKey="otrasDeudas" name="Otras deudas" fill="#dc2626" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Grafico>

      <PanelAnalisis
        datosMensuales={datosMensuales}
        cuotaMensual={cuotaMensual}
        plazoMeses={flujo.plazoMeses}
      />

      <CopilotoFlujo expedienteId={expedienteId} resumen={resumen} />
    </div>
  );
}

function Grafico({
  titulo, subtitulo, children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <h4 className="text-sm font-semibold text-foreground">{titulo}</h4>
      {subtitulo && <p className="mb-2 text-xs text-muted-foreground">{subtitulo}</p>}
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
    if (capPagoPromedio < 50)
      hallazgos.push({ tipo: "verde", texto: `Capacidad de pago promedio: ${capPagoPromedio.toFixed(0)}% — saludable (meta: < 70%)` });
    else if (capPagoPromedio < 70)
      hallazgos.push({ tipo: "amber", texto: `Capacidad de pago promedio: ${capPagoPromedio.toFixed(0)}% — atención` });
    else
      hallazgos.push({ tipo: "rojo", texto: `Capacidad de pago promedio: ${capPagoPromedio.toFixed(0)}% — supera el límite` });

    const mesesNegativos = datosMensuales.filter((m) => m.saldoNeto < 0).length;
    if (mesesNegativos === 0)
      hallazgos.push({ tipo: "verde", texto: "Sin meses con saldo negativo en el período analizado" });
    else
      hallazgos.push({ tipo: "rojo", texto: `${mesesNegativos} mes(es) con saldo negativo — riesgo de incumplimiento` });

    const mesCritico = datosMensuales.reduce((max, m) => (m.capacidadPago > max.capacidadPago ? m : max));
    hallazgos.push({
      tipo: mesCritico.capacidadPago > 70 ? "rojo" : "amber",
      texto: `Mes más crítico: ${mesCritico.mes} — capacidad de pago ${mesCritico.capacidadPago.toFixed(0)}%`,
    });

    if (datosMensuales.length >= 6) {
      const primeros3 = promedio(datosMensuales.slice(0, 3).map((m) => m.ingresos));
      const ultimos3 = promedio(datosMensuales.slice(-3).map((m) => m.ingresos));
      if (ultimos3 > primeros3 * 1.05)
        hallazgos.push({ tipo: "verde", texto: "Tendencia de ingresos creciente en el período" });
      else if (ultimos3 < primeros3 * 0.95)
        hallazgos.push({ tipo: "amber", texto: "Tendencia de ingresos decreciente — revisar con el cliente" });
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
    <section className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <h4 className="mb-3 text-sm font-semibold text-foreground">
        📊 Análisis automático del flujo
      </h4>
      {hallazgos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Ingresa datos del flujo para ver el análisis automático.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {hallazgos.map((h, i) => (
            <li key={i} className="flex items-start gap-2">
              {h.tipo === "verde" && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-fieldcredit-green" />}
              {h.tipo === "amber" && <AlertTriangle size={16} className="mt-0.5 shrink-0 text-fieldcredit-amber" />}
              {h.tipo === "rojo" && <XCircle size={16} className="mt-0.5 shrink-0 text-fieldcredit-red" />}
              {h.tipo === "info" && <Info size={16} className="mt-0.5 shrink-0 text-fieldcredit-teal" />}
              <span className="min-w-0 text-foreground">{h.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Helper para estado del módulo (usado por el detalle del expediente)
export function estadoFlujo(
  flujo: import("@/stores/expedientes").FlujoEfectivo | undefined,
): "pendiente" | "progreso" | "completo" {
  if (!flujo) return "pendiente";
  const rubrosDin = getRubrosParaActividad(flujo.tipoActividad);
  const total = (bloque: Bloque) =>
    rubrosDin[bloque].reduce(
      (acc, r) =>
        acc + (flujo.rubrosActivos[r.key] ? (flujo.valores[r.key]?.reduce((s, v) => s + v, 0) ?? 0) : 0),
      0,
    );
  const ingresos = total("A") + total("B");
  const consumo = total("C");
  const cuotaOK = (flujo.cuotaEstimada || 0) > 0;
  if (ingresos > 0 && consumo > 0 && cuotaOK) return "completo";
  if (ingresos > 0 || consumo > 0 || cuotaOK) return "progreso";
  return "pendiente";
}
