// Asistente de voz para captura de datos en campo.
// Usa la Web Speech API para transcribir y el endpoint /api/ia/completar
// (mismo que usa el copiloto) para estructurar los datos.
// Ruta: src/components/ia/AsistenteVoz.tsx

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, ChevronDown, ChevronUp, Volume2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";

// ── Tipos ───────────────────────────────────────────────────────────────────
interface CampoExtraido {
  campo: string;
  valor: string;
  confianza: "alta" | "media" | "baja";
}

interface RespuestaIA {
  campos: CampoExtraido[];
  resumen: string;
  sugerencia?: string;
}

interface Props {
  contexto: string;
  expedienteId: string;
  onAplicar?: (campos: CampoExtraido[]) => void;
}

// ── Reconocimiento de voz ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;

function crearReconocimiento(): AnyRec | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "es-NI";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  return rec;
}

// Mismo sistema prompt que usa el copiloto — conciso para Llama 3
const SISTEMA_PROMPT = `Eres el asistente de campo de FieldCredit para asesores de crédito rural en Nicaragua.
El asesor está en el módulo "{MODULO}" del expediente.

Extrae los datos mencionados y devuelve SOLO JSON válido sin texto extra ni bloques de código:
{
  "campos": [
    { "campo": "nombre_campo", "valor": "valor", "confianza": "alta|media|baja" }
  ],
  "resumen": "Qué capturaste en una oración",
  "sugerencia": "Qué falta o aclarar (omitir si no aplica)"
}

Campos por módulo:
- solicitud: nombre, cedula, fecha_nacimiento, telefono, actividad, monto, plazo, destino
- flujo: rubro, manzanas, rendimiento, precio_unitario, ciclos_año, ingreso_monto, egreso_tipo, egreso_monto
- garantias: tipo_garantia, descripcion_bien, valor_estimado, ubicacion_bien
- geo: descripcion_ubicacion, referencia_acceso, tipo_camino
- docs: documento_tipo, documento_estado
- general: cualquier dato relevante del expediente`;

const CONFIANZA_STYLE: Record<string, string> = {
  alta:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  baja:  "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-300",
};

// ── Componente ───────────────────────────────────────────────────────────────
export function AsistenteVoz({ contexto, expedienteId, onAplicar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [transcripcion, setTranscripcion] = useState("");
  const [parcial, setParcial] = useState("");
  const [editando, setEditando] = useState(false);       // ← nuevo: modo edición
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<RespuestaIA | null>(null);
  const [soportado, setSoportado] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const acumulado = useRef("");

  useEffect(() => {
    const rec = crearReconocimiento();
    if (!rec) { setSoportado(false); return; }
    recRef.current = rec;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      if (final) {
        acumulado.current += final;
        setTranscripcion(acumulado.current);
      }
      setParcial(interim);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        toast.error("Permiso de micrófono denegado. Activalo en la configuración del navegador.");
        setGrabando(false);
      }
    };

    rec.onend = () => {
      // Si aún está en modo grabación, reinicia (para grabación continua)
      if (recRef.current && grabando) {
        try { recRef.current.start(); } catch { /* ya corriendo */ }
      }
    };

    return () => { try { rec.stop(); } catch { /* ignore */ } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarGrabacion = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    acumulado.current = "";
    setTranscripcion("");
    setParcial("");
    setResultado(null);
    setEditando(false);
    try {
      rec.start();
      setGrabando(true);
      toast.success("Escuchando… Hablá con claridad.", { duration: 2000 });
    } catch { /* ya estaba corriendo */ }
  }, []);

  const detenerGrabacion = useCallback(() => {
    setGrabando(false);
    setParcial("");
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const procesarConIA = useCallback(async () => {
    const texto = transcripcion.trim();
    if (!texto) { toast.error("No hay texto grabado todavía."); return; }

    setProcesando(true);
    setResultado(null);
    try {
      const sistema = SISTEMA_PROMPT.replace("{MODULO}", contexto);

      // Usa el mismo formato que el copiloto (adaptadorIA.ts)
      const respuesta = await fetch("/api/ia/completar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedor: "groq",
          modelo: "llama-3.3-70b-versatile",
          sistema,
          mensajes: [{ role: "user", content: `Transcripción del asesor:\n"${texto}"` }],
          maxTokens: 800,
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await respuesta.json() as any;

      if (!respuesta.ok || !json.exito) {
        throw new Error(json.error || `Error ${respuesta.status}`);
      }

      const raw = (json.texto as string).replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw) as RespuestaIA;
      setResultado(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      console.error("[AsistenteVoz]", msg);
      toast.error(`Error al procesar: ${msg}`);
    } finally {
      setProcesando(false);
    }
  }, [transcripcion, contexto]);

  if (!soportado) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-fieldcredit-teal/40 bg-white shadow-sm dark:border-teal-700/30 dark:bg-slate-800">
      {/* Header colapsable */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fieldcredit-teal-pale dark:hover:bg-slate-700"
      >
        <Volume2 size={18} className="shrink-0 text-fieldcredit-teal" />
        <div className="flex-1">
          <p className="text-sm font-bold text-fieldcredit-teal-dark dark:text-teal-300">
            🎙️ Asistente de voz en campo
          </p>
          <p className="text-xs text-slate-500">Dictá los datos y la IA los estructura automáticamente</p>
        </div>
        {abierto ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {abierto && (
        <div className="border-t border-fieldcredit-teal/20 p-4 dark:border-teal-700/20">

          {/* Instrucciones */}
          <div className="mb-4 rounded-lg bg-fieldcredit-teal-pale px-3 py-2 dark:bg-teal-900/20">
            <p className="text-xs text-teal-800 dark:text-teal-200">
              <strong>¿Cómo usarlo?</strong> Presioná el micrófono y dictá los datos del cliente en voz alta.
              Ejemplo: <em>"Tiene 5 manzanas de café, cosecha 20 quintales por manzana a 800 córdobas."</em>
            </p>
          </div>

          {/* Botón de grabación */}
          <div className="mb-4 flex justify-center">
            <button
              onClick={grabando ? detenerGrabacion : iniciarGrabacion}
              className={`flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-4 text-white transition-all ${
                grabando
                  ? "animate-pulse border-red-400 bg-red-500 shadow-lg shadow-red-200 dark:shadow-red-900/50"
                  : "border-fieldcredit-teal bg-fieldcredit-teal hover:bg-fieldcredit-teal-dark"
              }`}
            >
              {grabando ? <MicOff size={28} /> : <Mic size={28} />}
              <span className="text-[10px] font-bold">{grabando ? "DETENER" : "GRABAR"}</span>
            </button>
          </div>

          {/* Transcripción — con modo edición */}
          {(transcripcion || parcial) && (
            <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase text-slate-500">Transcripción</p>
                {!grabando && transcripcion && (
                  <button
                    onClick={() => setEditando(!editando)}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-fieldcredit-teal hover:bg-fieldcredit-teal-pale dark:hover:bg-teal-900/20"
                  >
                    {editando
                      ? <><Check size={11} /> Listo</>
                      : <><Pencil size={11} /> Editar</>}
                  </button>
                )}
              </div>

              <div className="p-3">
                {editando ? (
                  // Modo edición: textarea para corregir lo que el micrófono no captó bien
                  <textarea
                    value={transcripcion}
                    onChange={(e) => {
                      setTranscripcion(e.target.value);
                      acumulado.current = e.target.value;
                    }}
                    rows={4}
                    className="w-full resize-y rounded border border-fieldcredit-teal/40 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-fieldcredit-teal dark:border-teal-700/40 dark:bg-slate-800 dark:text-slate-200"
                    placeholder="Corregí el texto antes de estructurar..."
                  />
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-200">{transcripcion}</p>
                )}
                {/* Texto parcial en tiempo real mientras graba */}
                {parcial && !editando && (
                  <p className="mt-1 text-sm italic text-slate-400">{parcial}…</p>
                )}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          {transcripcion && !grabando && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={procesarConIA}
                disabled={procesando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-fieldcredit-green py-2.5 text-sm font-bold text-white hover:bg-fieldcredit-green-dark disabled:opacity-60"
              >
                {procesando
                  ? <><Loader2 size={16} className="animate-spin" /> Procesando…</>
                  : <>✨ Estructurar con IA</>}
              </button>
              <button
                onClick={() => {
                  acumulado.current = "";
                  setTranscripcion("");
                  setParcial("");
                  setResultado(null);
                  setEditando(false);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                Limpiar
              </button>
            </div>
          )}

          {/* Resultado de la IA */}
          {resultado && (
            <div className="space-y-3">
              {/* Resumen */}
              <div className="rounded-lg bg-fieldcredit-green-pale p-3 dark:bg-green-900/20">
                <p className="text-xs font-bold text-fieldcredit-green-dark dark:text-green-300">
                  ✅ {resultado.resumen}
                </p>
                {resultado.sugerencia && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    💡 {resultado.sugerencia}
                  </p>
                )}
              </div>

              {/* Campos extraídos */}
              {resultado.campos.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    Datos capturados ({resultado.campos.length}):
                  </p>
                  <div className="space-y-1.5">
                    {resultado.campos.map((c, i) => (
                      <div key={i}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-slate-400">{c.campo}</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.valor}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${CONFIANZA_STYLE[c.confianza] ?? CONFIANZA_STYLE.media}`}>
                          {c.confianza}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer obligatorio */}
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
                ⚠️ <strong>Verificá los datos antes de guardar.</strong> El asistente de IA puede
                cometer errores. La decisión crediticia siempre la toma el comité humano.
              </p>

              {/* Botón aplicar */}
              {onAplicar && resultado.campos.length > 0 && (
                <button
                  onClick={() => {
                    onAplicar(resultado.campos);
                    toast.success("Datos enviados al formulario. Revisalos antes de guardar.");
                  }}
                  className="w-full rounded-lg bg-fieldcredit-green py-2.5 text-sm font-bold text-white hover:bg-fieldcredit-green-dark"
                >
                  Aplicar al expediente
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
