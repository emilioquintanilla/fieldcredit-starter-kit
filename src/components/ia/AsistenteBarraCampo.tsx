// Barra flotante del Copiloto IA — asistente de campo (siempre visible en el expediente).
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import type { ExpedienteBorrador } from "@/stores/expedientes";
import { llamarIA, nombreProveedor, type Mensaje } from "@/services/ia/adaptadorIA";
import { construirContextoExpediente } from "@/services/ia/contextoExpediente";
import {
  SISTEMA_ASISTENTE_CAMPO,
  SUGERENCIAS,
  detectarAlertas,
  type Alerta,
  type ModuloActual,
} from "@/services/ia/prompts";
import { cn } from "@/lib/utils";

interface Props {
  expediente: ExpedienteBorrador | undefined;
  moduloActual: ModuloActual;
}

export function AsistenteBarraCampo({ expediente, moduloActual }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAlertas(detectarAlertas(expediente, moduloActual));
  }, [expediente, moduloActual]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const contexto = useMemo(() => construirContextoExpediente(expediente), [expediente]);
  const sugerencias = SUGERENCIAS[moduloActual] || [];

  const enviar = async (textoArg?: string) => {
    const texto = (textoArg ?? input).trim();
    if (!texto || cargando) return;
    setInput("");
    setErrorApi(null);
    const nuevos: Mensaje[] = [...mensajes, { role: "user", content: texto }];
    setMensajes(nuevos);
    setCargando(true);
    try {
      const respuesta = await llamarIA({
        sistema: SISTEMA_ASISTENTE_CAMPO(contexto, moduloActual),
        mensajes: nuevos,
        maxTokens: 500,
      });
      setMensajes([...nuevos, { role: "assistant", content: respuesta || "(sin respuesta)" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setErrorApi(msg);
      setMensajes([
        ...nuevos,
        { role: "assistant", content: `⚠️ No pude conectar con el asistente. ${msg}` },
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      {/* Alertas flotantes cuando la barra está colapsada */}
      {alertas.length > 0 && !abierto && (
        <div className="fixed bottom-20 right-4 z-40 flex max-w-xs flex-col gap-2">
          {alertas.slice(0, 3).map((a, i) => (
            <AlertaChip
              key={i}
              alerta={a}
              onAccion={() => {
                setAbierto(true);
                enviar(`Explícame más sobre: ${a.titulo}. ${a.mensaje}`);
              }}
              onCerrar={() => setAlertas((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-fieldcredit-green-dark text-white shadow-2xl lg:left-64">
        {abierto && (
          <div className="flex h-72 flex-col border-b border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-fieldcredit-teal" />
                <span className="text-sm font-bold">Copiloto IA — Asistente de campo</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium">
                  {nombreProveedor()}
                </span>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="text-white/70 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {mensajes.length === 0 && (
                <div className="rounded-xl bg-white/5 p-3 text-sm text-white/80">
                  👋 Hola. Estoy aquí para ayudarte con el módulo <strong>{moduloActual}</strong>.
                  Puedes preguntarme sobre inconsistencias, política crediticia o campos faltantes.
                </div>
              )}
              {mensajes.map((m, i) => (
                <Burbuja key={i} mensaje={m} />
              ))}
              {cargando && (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80 [animation-delay:240ms]" />
                </div>
              )}
              <div ref={endRef} />
            </div>

            {sugerencias.length > 0 && mensajes.length === 0 && (
              <div className="flex gap-2 overflow-x-auto px-3 pb-2">
                {sugerencias.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="flex-shrink-0 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {errorApi && (
              <div className="border-t border-white/10 px-3 py-1 text-[11px] text-amber-200">
                {errorApi}
              </div>
            )}
          </div>
        )}

        <div
          className="flex items-center gap-3 px-4 py-2"
          onClick={() => !abierto && setAbierto(true)}
        >
          <Bot size={18} className="shrink-0" />
          {!abierto ? (
            <>
              <span className="flex-1 cursor-pointer text-sm text-white/80">
                {alertas.length > 0
                  ? `⚠️ ${alertas.length} alerta${alertas.length > 1 ? "s" : ""} — toca para ver`
                  : "Copiloto IA · Pregúntame sobre el expediente"}
              </span>
              {alertas.length > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                  {alertas.length}
                </span>
              )}
            </>
          ) : (
            <div className="flex flex-1 gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enviar();
                }}
                placeholder="Pregunta al Copiloto..."
                onClick={(e) => e.stopPropagation()}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/50 outline-none focus:bg-white/20"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enviar();
                }}
                disabled={cargando || !input.trim()}
                className="flex items-center gap-1 rounded-xl bg-fieldcredit-teal px-3 py-2 text-sm font-bold disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Espaciador para que la barra fija no tape el contenido */}
      <div aria-hidden className="h-16" />
    </>
  );
}

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const esUser = mensaje.role === "user";
  return (
    <div className={cn("flex", esUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
          esUser ? "bg-fieldcredit-teal text-white" : "bg-white/10 text-white/90",
        )}
      >
        {mensaje.content}
      </div>
    </div>
  );
}

function AlertaChip({
  alerta,
  onAccion,
  onCerrar,
}: {
  alerta: Alerta;
  onAccion: () => void;
  onCerrar: () => void;
}) {
  const colores: Record<Alerta["tipo"], string> = {
    verde: "bg-green-50 border-green-400 text-green-800",
    amber: "bg-amber-50 border-amber-400 text-amber-800",
    rojo: "bg-red-50 border-red-400 text-red-800",
    info: "bg-blue-50 border-blue-400 text-blue-800",
  };
  return (
    <div className={cn("rounded-xl border-l-4 p-3 shadow-lg", colores[alerta.tipo])}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="mb-0.5 text-xs font-bold">
            {alerta.icono} {alerta.titulo}
          </p>
          <p className="text-xs leading-snug">{alerta.mensaje}</p>
        </div>
        <button onClick={onCerrar} className="text-xs opacity-60 hover:opacity-100" aria-label="Cerrar alerta">
          ✕
        </button>
      </div>
      <button onClick={onAccion} className="mt-2 text-xs font-bold underline">
        {alerta.accion || "Preguntar al Copiloto"} →
      </button>
    </div>
  );
}
