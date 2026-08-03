// src/routes/normativa.tsx
// Ruta completa del Agente Normativo — accesible desde el BottomNav.
// Responde consultas sobre políticas, garantías, fiadores y coberturas
// usando RAG sobre los manuales oficiales de MiCrédito.
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { BookOpen, Send, FileText, Sparkles, RotateCcw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { consultarNormativa, type FuenteNormativa } from "@/services/ia/ragNormativo";
import { useExpedientes } from "@/stores/expedientes";

export const Route = createFileRoute("/normativa")({
  head: () => ({ meta: [{ title: "Agente Normativo — FieldCredit" }] }),
  component: NormativaPage,
});

interface Mensaje {
  id       : string;
  rol      : "asesor" | "agente";
  texto    : string;
  fuentes  : FuenteNormativa[];
  timestamp: Date;
}

const SUGERENCIAS = [
  "¿Cuáles son los requisitos para aceptar una garantía hipotecaria?",
  "¿Qué documentos necesita un fiador sin negocio formal?",
  "¿Cuál es el monto máximo sin fiador para AgroResilia?",
  "¿Qué hacer si el cliente no tiene cédula vigente?",
  "¿Cuáles son los rangos de edad aceptados para el microseguro?",
  "¿Cómo se calcula la cobertura mínima de garantía prendaria?",
];

function NormativaPage() {
  // Contexto opcional: si se llega desde un expediente con ?expedienteId=xx
  const search = useSearch({ strict: false }) as unknown as { expedienteId?: string };
  const expedienteId = search?.expedienteId;

  const exp = useExpedientes((s) =>
    expedienteId ? s.expedientes[expedienteId] : undefined
  );

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [mensajes]);

  function construirContexto(): string | undefined {
    if (!exp?.data) return undefined;
    const d = exp.data;
    return [
      d.primer_nombre  && `Cliente: ${d.primer_nombre} ${d.primer_apellido ?? ""}`,
      d.tipo_actividad && `Actividad: ${d.tipo_actividad}`,
      d.producto       && `Producto solicitado: ${d.producto}`,
      d.monto          && `Monto: C$ ${d.monto.toLocaleString("es-NI")}`,
      d.plazo          && `Plazo: ${d.plazo} meses`,
      d.municipio_residencia && `Municipio: ${d.municipio_residencia}`,
    ].filter(Boolean).join("\n");
  }

  async function enviar(textoPregunta?: string) {
    const texto = (textoPregunta ?? pregunta).trim();
    if (!texto || cargando) return;

    setError(null);
    setPregunta("");

    setMensajes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), rol: "asesor", texto, fuentes: [], timestamp: new Date() },
    ]);
    setCargando(true);

    try {
      const { respuesta, fuentes } = await consultarNormativa(texto, construirContexto());
      setMensajes((prev) => [
        ...prev,
        { id: crypto.randomUUID(), rol: "agente", texto: respuesta, fuentes, timestamp: new Date() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar la normativa.");
    } finally {
      setCargando(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function limpiarChat() {
    setMensajes([]);
    setError(null);
    setPregunta("");
  }

  return (
    <AppLayout>
      <PageHeader
        title="Agente Normativo"
        subtitle="Consulta políticas, garantías y reglamentos de MiCrédito"
        actions={
          mensajes.length > 0 ? (
            <button
              onClick={limpiarChat}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5
                         text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700
                         dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RotateCcw size={12} strokeWidth={1.8} />
              Nueva consulta
            </button>
          ) : undefined
        }
      />

      {/* Contexto de expediente activo */}
      {exp?.data?.primer_nombre && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 dark:border-teal-800/40 dark:bg-teal-900/10">
          <Sparkles size={13} className="shrink-0 text-fieldcredit-teal" strokeWidth={1.8} />
          <p className="text-xs text-teal-700 dark:text-teal-300">
            Consultando con contexto del expediente de{" "}
            <strong>{exp.data.primer_nombre} {exp.data.primer_apellido}</strong>
          </p>
        </div>
      )}

      {/* Área de conversación */}
      <div className="flex flex-col gap-3 pb-4">

        {/* Estado inicial: sugerencias */}
        {mensajes.length === 0 && !cargando && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-fieldcredit-teal" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                ¿En qué puedo ayudarte?
              </p>
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Las respuestas se generan a partir de los manuales y reglamentos oficiales de MiCrédito.
              Selecciona una consulta frecuente o escribe la tuya.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2.5 text-left
                             text-xs text-teal-700 transition-colors hover:border-teal-300
                             hover:bg-teal-100 dark:border-teal-800/40 dark:bg-teal-900/10
                             dark:text-teal-300 dark:hover:bg-teal-900/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensajes */}
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 ${msg.rol === "asesor" ? "items-end" : "items-start"}`}
          >
            {msg.rol === "agente" && (
              <div className="flex items-center gap-1.5 px-1">
                <BookOpen size={12} className="text-fieldcredit-teal" strokeWidth={1.8} />
                <span className="text-[10px] font-semibold text-fieldcredit-teal uppercase tracking-wide">
                  Agente Normativo
                </span>
              </div>
            )}

            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] ${
                msg.rol === "asesor"
                  ? "rounded-tr-sm bg-fieldcredit-green text-white"
                  : "rounded-tl-sm border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              {msg.texto}
            </div>

            {/* Fuentes */}
            {msg.fuentes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-w-[90%] px-1">
                <span className="text-[10px] text-slate-400">Fuentes:</span>
                {msg.fuentes.map((f) => (
                  <span
                    key={f.fragmento_id}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200
                               bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500
                               dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                  >
                    <FileText size={9} strokeWidth={1.8} />
                    {f.nombre}
                  </span>
                ))}
              </div>
            )}

            <p className="px-1 text-[10px] text-slate-400">
              {msg.timestamp.toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}

        {/* Indicador de carga */}
        {cargando && (
          <div className="flex items-start gap-2">
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex gap-1.5 items-center">
                <span className="text-[10px] text-slate-400">Consultando normativa</span>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-fieldcredit-teal"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input fijo */}
      <div className="fixed bottom-[88px] left-0 right-0 z-30 border-t border-slate-200 bg-background/90 px-4 py-3 backdrop-blur-sm dark:border-slate-700 md:relative md:bottom-auto md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            ref={inputRef}
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Escribe tu consulta normativa..."
            disabled={cargando}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm
                       placeholder-slate-400 shadow-sm transition-all
                       focus:border-fieldcredit-teal focus:outline-none focus:ring-1
                       focus:ring-fieldcredit-teal disabled:opacity-50
                       dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            onClick={() => enviar()}
            disabled={!pregunta.trim() || cargando}
            className="rounded-xl bg-fieldcredit-teal px-4 py-2.5 text-white shadow-sm
                       transition-colors hover:bg-fieldcredit-teal-dark
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} strokeWidth={1.8} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-400">
          ⚠ Respuestas basadas en documentos oficiales. Para excepciones consulta con tu supervisor.
        </p>
      </div>
    </AppLayout>
  );
}
