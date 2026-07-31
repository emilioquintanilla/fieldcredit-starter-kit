/**
 * Copiloto IA del módulo de Flujo de Efectivo.
 *
 * Antes era una maqueta con los controles deshabilitados. Ahora usa el mismo
 * adaptador que el resto de la app (`llamarIA`), el prompt de asistente de campo
 * con `moduloActual: "flujo"` y las sugerencias ya definidas para este módulo.
 *
 * Además del expediente, se le pasa un resumen calculado del flujo (saldo
 * promedio, mes crítico, capacidad de pago, meses en negativo) para que pueda
 * responder sobre los números que el asesor tiene en pantalla en ese momento,
 * no solo sobre lo guardado en el expediente.
 *
 * El Copiloto no aprueba ni rechaza créditos: eso está fijado en el prompt del
 * sistema y se recuerda en el pie del panel.
 */
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, ChevronDown } from "lucide-react";
import { useExpedientes } from "@/stores/expedientes";
import { llamarIA, type Mensaje } from "@/services/ia/adaptadorIA";
import { construirContextoExpediente } from "@/services/ia/contextoExpediente";
import { SISTEMA_ASISTENTE_CAMPO, SUGERENCIAS } from "@/services/ia/prompts";
import { BurbujaEscribiendo, BurbujaMensaje } from "@/components/ia/burbujas";
import { ProveedorBadge } from "@/components/ia/ProveedorBadge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface ResumenFlujoIA {
  saldoPromedio: number;
  ingresoPromedio: number;
  egresoPromedio: number;
  capacidadPagoPromedio: number;
  mesCritico: string;
  capacidadMesCritico: number;
  mesesNegativos: number;
  plazoMeses: number;
  cuotaEstimada: number;
}

interface Props {
  expedienteId: string;
  resumen: ResumenFlujoIA;
}

const fmt = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;

/** Resumen numérico que se anexa al contexto del expediente. */
function describirFlujo(r: ResumenFlujoIA): string {
  return [
    "RESUMEN CALCULADO DEL FLUJO DE EFECTIVO (en pantalla ahora):",
    `- Plazo analizado: ${r.plazoMeses} meses`,
    `- Cuota estimada: ${fmt(r.cuotaEstimada)}/mes`,
    `- Ingreso promedio: ${fmt(r.ingresoPromedio)}/mes`,
    `- Egreso promedio: ${fmt(r.egresoPromedio)}/mes`,
    `- Saldo neto promedio: ${fmt(r.saldoPromedio)}/mes`,
    `- Capacidad de pago promedio: ${r.capacidadPagoPromedio.toFixed(0)}% (límite de política: 70%)`,
    `- Mes más crítico: ${r.mesCritico} con capacidad de pago ${r.capacidadMesCritico.toFixed(0)}%`,
    `- Meses con saldo negativo: ${r.mesesNegativos}`,
  ].join("\n");
}

export function CopilotoFlujo({ expedienteId, resumen }: Props) {
  const expediente = useExpedientes((s) => s.expedientes[expedienteId]);
  const esMovil = useIsMobile();
  // En móvil el panel arranca cerrado: el asesor está capturando datos y un
  // chat de 260px al final de la columna solo agrega scroll. Se abre al tocarlo
  // y queda abierto el resto de la sesión. En escritorio siempre está visible.
  const [abiertoMovil, setAbiertoMovil] = useState(false);
  const desplegado = !esMovil || abiertoMovil;

  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      role: "assistant",
      content:
        "Estoy viendo el flujo de efectivo de este expediente. Puedo revisar si alcanza " +
        "para la cuota, en qué meses hay más riesgo o cómo pesan los ingresos estacionales. " +
        "¿Qué querés analizar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Desplaza solo el contenedor del chat: usar scrollIntoView movía toda la
    // página y sacaba de vista el formulario que el asesor estaba llenando.
    const cont = scrollRef.current;
    if (cont) cont.scrollTop = cont.scrollHeight;
  }, [mensajes, cargando, desplegado]);

  const enviar = async (textoArg?: string) => {
    const texto = (textoArg ?? input).trim();
    if (!texto || cargando) return;
    setInput("");
    setError(null);
    const nuevos: Mensaje[] = [...mensajes, { role: "user", content: texto }];
    setMensajes(nuevos);
    setCargando(true);
    try {
      const contextoExp = expediente ? construirContextoExpediente(expediente) : "";
      const contexto = `${contextoExp}\n\n${describirFlujo(resumen)}`;
      const respuesta = await llamarIA({
        sistema: SISTEMA_ASISTENTE_CAMPO(contexto, "flujo"),
        mensajes: nuevos,
        maxTokens: 700,
      });
      setMensajes([...nuevos, { role: "assistant", content: respuesta || "(sin respuesta)" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      setMensajes([
        ...nuevos,
        {
          role: "assistant",
          content: `⚠️ No pude conectarme con el Copiloto. ${msg}`,
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border-2 border-fieldcredit-teal shadow-sm">
      <button
        type="button"
        onClick={() => esMovil && setAbiertoMovil((v) => !v)}
        aria-expanded={desplegado}
        className={cn(
          "flex w-full items-center gap-2 bg-fieldcredit-teal px-3 py-2.5 text-left sm:px-4",
          esMovil ? "cursor-pointer active:brightness-95" : "cursor-default",
        )}
      >
        <Sparkles size={16} className="shrink-0 text-white" />
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
          Copiloto del flujo
        </span>
        {esMovil && !abiertoMovil && (
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
            Preguntar
          </span>
        )}
        <ProveedorBadge dark />
        {esMovil && (
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 text-white transition-transform duration-200",
              abiertoMovil && "rotate-180",
            )}
          />
        )}
      </button>

      {desplegado && (
        <>
          <div
            ref={scrollRef}
            className="h-64 space-y-3 overflow-y-auto overscroll-contain bg-muted/40 p-3 sm:h-72 sm:p-4"
          >
            {mensajes.map((m, i) => (
              <BurbujaMensaje key={i} mensaje={m} tema="claro" />
            ))}
            {cargando && <BurbujaEscribiendo tema="claro" />}
            <div ref={finRef} />
          </div>

          {/* Sugerencias del módulo de flujo */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide bg-card px-3 pt-2.5">
            {SUGERENCIAS.flujo.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                disabled={cargando}
                className="shrink-0 whitespace-nowrap rounded-full border border-fieldcredit-teal bg-fieldcredit-teal-pale px-3 py-1.5 text-xs font-semibold text-fieldcredit-teal-dark transition-colors hover:bg-fieldcredit-teal hover:text-white disabled:opacity-50 dark:bg-teal-900/30 dark:text-teal-200"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-t border-border bg-card p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviar();
              }}
              placeholder="Preguntá sobre este flujo..."
              aria-label="Pregunta al Copiloto sobre el flujo"
              className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-transparent px-3 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fieldcredit-teal/50 focus-visible:ring-offset-1 sm:h-10"
            />
            <button
              type="button"
              onClick={() => enviar()}
              disabled={cargando || !input.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fieldcredit-teal text-white transition-all duration-200 hover:bg-fieldcredit-teal-dark active:scale-[0.97] disabled:opacity-50 sm:h-10 sm:w-10"
              aria-label="Enviar pregunta"
            >
              <Send size={15} />
            </button>
          </div>

          {error && (
            <div className="border-t border-border bg-fieldcredit-amber-light px-3 py-1.5 text-[11px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {error}
            </div>
          )}

          <p className="border-t border-border bg-card px-3 py-2 text-[10px] text-muted-foreground">
            El Copiloto orienta el análisis. No aprueba, rechaza ni desembolsa créditos: la
            decisión siempre es del comité.
          </p>
        </>
      )}
    </section>
  );
}
