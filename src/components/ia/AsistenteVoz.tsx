// Asistente de voz para captura de datos en campo.
// Usa la Web Speech API (sin dependencias externas) para transcribir y
// envía la transcripción a Claude para estructurar los datos del expediente.
// Ruta: src/components/ia/AsistenteVoz.tsx

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
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
  contexto: string;          // Qué módulo está abierto ("flujo", "solicitud", etc.)
  expedienteId: string;
  onAplicar?: (campos: CampoExtraido[]) => void;
}

// ── Reconocimiento de voz (Web Speech API) ───────────────────────────────────
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never;

function crearReconocimiento(): InstanceType<SpeechRecognitionType> | null {
  if (typeof window === "undefined") return null;
  const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ||
             (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new (SR as new () => InstanceType<SpeechRecognitionType>)();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (rec as any).lang = "es-NI";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (rec as any).continuous = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (rec as any).interimResults = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (rec as any).maxAlternatives = 1;
  return rec;
}

const SISTEMA_PROMPT = `Eres el asistente de campo de FieldCredit, una app para asesores de crédito rural de MiCrédito en Nicaragua.

El asesor está en campo completando información de un expediente crediticio en el módulo: {MODULO}.

Tu tarea es:
1. Extraer los datos mencionados por el asesor en su transcripción de voz.
2. Estructurarlos en campos específicos del expediente.
3. Dar un resumen breve de lo capturado.
4. Si hay algo ambiguo, sugerir qué aclarar.

Campos del expediente según módulo:
- solicitud: nombre, cédula, fecha_nacimiento, telefono, actividad, monto, plazo, destino
- flujo: cultivo/rubro, manzanas, rendimiento, precio_unitario, ciclos_año, ingresos_monto, egresos_tipo, egresos_monto
- garantías: tipo_garantia, descripcion_bien, valor_estimado, ubicacion_bien
- geo: descripcion_ubicacion, referencia_acceso, tipo_camino
- general: cualquier dato del expediente

IMPORTANTE: Responde SOLO con JSON válido, sin texto adicional ni bloques de código. Formato:
{
  "campos": [
    { "campo": "nombre_del_campo", "valor": "valor_extraido", "confianza": "alta|media|baja" }
  ],
  "resumen": "Texto breve de lo que capturaste",
  "sugerencia": "Qué aclarar o completar (opcional)"
}`;

// ── Componente principal ─────────────────────────────────────────────────────
export function AsistenteVoz({ contexto, expedienteId, onAplicar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [transcripcion, setTranscripcion] = useState("");
  const [transcripcionParcial, setTranscripcionParcial] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<RespuestaIA | null>(null);
  const [soportado, setSoportado] = useState(true);

  const recRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);
  const transcripcionRef = useRef("");

  useEffect(() => {
    const rec = crearReconocimiento();
    if (!rec) { setSoportado(false); return; }
    recRef.current = rec;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rec as any).onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      if (final) {
        transcripcionRef.current += final;
        setTranscripcion(transcripcionRef.current);
      }
      setTranscripcionParcial(interim);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rec as any).onerror = (e: any) => {
      console.warn("[voz]", e.error);
      if (e.error === "not-allowed") {
        toast.error("Permiso de micrófono denegado.");
        setGrabando(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rec as any).onend = () => {
      if (grabando) {
        try { (rec as any).start(); } catch { /* reinicia si aún activo */ }
      }
    };

    return () => {
      try { (rec as any).stop(); } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarGrabacion = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    transcripcionRef.current = "";
    setTranscripcion("");
    setTranscripcionParcial("");
    setResultado(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rec as any).start();
      setGrabando(true);
      toast.success("Escuchando… Habla con claridad.", { duration: 2000 });
    } catch { /* ya estaba corriendo */ }
  }, []);

  const detenerGrabacion = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    setGrabando(false);
    try { (rec as any).stop(); } catch { /* ignore */ }
  }, []);

  const procesarConIA = useCallback(async () => {
    const texto = transcripcionRef.current.trim();
    if (!texto) { toast.error("No hay texto grabado."); return; }

    setProcesando(true);
    try {
      const prompt = SISTEMA_PROMPT.replace("{MODULO}", contexto);
      const respuesta = await fetch("/api/ia/completar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sistema: prompt,
          mensaje: `Transcripción del asesor:\n"${texto}"`,
          expedienteId,
        }),
      });
      const json = await respuesta.json() as { respuesta?: string };
      const raw = (json.respuesta ?? "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw) as RespuestaIA;
      setResultado(parsed);
    } catch (e) {
      console.error("[AsistenteVoz]", e);
      toast.error("Error al procesar con IA. Revisá la conexión.");
    } finally {
      setProcesando(false);
    }
  }, [contexto, expedienteId]);

  const CONFIANZA_COLOR: Record<string, string> = {
    alta: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    media: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    baja: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  if (!soportado) return null; // No mostrar si el browser no soporta

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-fieldcredit-teal/40 bg-white shadow-sm dark:border-teal-700/30 dark:bg-slate-800">
      {/* Header */}
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
              <strong>¿Cómo usarlo?</strong> Presioná el micrófono y dictá los datos del cliente.
              Por ejemplo: <em>"El productor tiene 5 manzanas de café, cosecha unas 20 quintales por manzana,
              el precio está en 800 córdobas el quintal."</em>
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

          {/* Transcripción en tiempo real */}
          {(transcripcion || transcripcionParcial) && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900">
              <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Transcripción</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{transcripcion}</p>
              {transcripcionParcial && (
                <p className="text-sm italic text-slate-400">{transcripcionParcial}</p>
              )}
            </div>
          )}

          {/* Botón procesar */}
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
                onClick={() => { setTranscripcion(""); transcripcionRef.current = ""; setResultado(null); }}
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
                          <span className="text-[10px] text-slate-400">{c.campo}</span>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.valor}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${CONFIANZA_COLOR[c.confianza] ?? CONFIANZA_COLOR.media}`}>
                          {c.confianza}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer obligatorio */}
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
                ⚠️ <strong>Verificá los datos antes de guardar.</strong> El asistente de IA puede cometer errores.
                Los datos son sugerencias — la decisión crediticia siempre la toma el comité humano.
              </p>

              {/* Botón aplicar */}
              {onAplicar && resultado.campos.length > 0 && (
                <button
                  onClick={() => { onAplicar(resultado.campos); toast.success("Datos enviados al formulario."); }}
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
