// Chat en vivo con el Copiloto sobre el dictamen ya generado.
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { DictamenIA, ExpedienteBorrador } from "@/stores/expedientes";
import { llamarIA, type Mensaje } from "@/services/ia/adaptadorIA";
import { construirContextoExpediente } from "@/services/ia/contextoExpediente";
import { SISTEMA_COPILOTO_COMITE } from "@/services/ia/prompts";
import { BurbujaEscribiendo, BurbujaMensaje } from "@/components/ia/burbujas";
import { ProveedorBadge } from "@/components/ia/ProveedorBadge";

const SUGERENCIAS = [
  "¿Por qué este score?",
  "¿Qué pasa si reduzco el monto?",
  "¿Qué condiciones recomiendas?",
  "¿Cuál es el mes más crítico?",
  "¿El fiador respalda bien?",
  "¿Apruebas o rechazas y por qué?",
];

interface Props {
  expediente: ExpedienteBorrador;
  dictamen: DictamenIA;
  clienteNombre: string;
}

export function ChatCopiloto({ expediente, dictamen, clienteNombre }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      role: "assistant",
      content:
        `Dictamen generado para ${clienteNombre}. Score ${dictamen.score}/100. ` +
        `Semáforo ${dictamen.semaforo}. ¿Qué quieres profundizar del análisis?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const esAR = expediente.data?.producto === "agroresilia";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const enviar = async (textoArg?: string) => {
    const texto = (textoArg ?? input).trim();
    if (!texto || cargando) return;
    setInput("");
    setError(null);
    const nuevos: Mensaje[] = [...mensajes, { role: "user", content: texto }];
    setMensajes(nuevos);
    setCargando(true);
    try {
      const contexto = construirContextoExpediente(expediente);
      const respuesta = await llamarIA({
        sistema: SISTEMA_COPILOTO_COMITE(contexto, esAR),
        mensajes: nuevos,
        maxTokens: 800,
      });
      setMensajes([...nuevos, { role: "assistant", content: respuesta || "(sin respuesta)" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      setMensajes([
        ...nuevos,
        { role: "assistant", content: `⚠️ Error de conexión con el Copiloto. ${msg}` },
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border-2 border-fieldcredit-teal">
      <div className="flex items-center gap-3 bg-fieldcredit-teal px-4 py-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        <span className="flex-1 text-sm font-bold text-white">
          Pregúntale al Copiloto sobre este expediente
        </span>
        <ProveedorBadge dark />
      </div>

      <div className="h-72 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900">
        {mensajes.map((m, i) => (
          <BurbujaMensaje key={i} mensaje={m} tema="claro" />
        ))}
        {cargando && <BurbujaEscribiendo tema="claro" />}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto bg-white px-3 pt-2 dark:bg-slate-800">
        {SUGERENCIAS.map((s) => (
          <button
            key={s}
            onClick={() => enviar(s)}
            disabled={cargando}
            className="flex-shrink-0 whitespace-nowrap rounded-full border border-fieldcredit-teal bg-fieldcredit-teal-light px-3 py-1 text-xs font-semibold text-fieldcredit-teal-dark transition-colors hover:bg-fieldcredit-teal hover:text-white disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") enviar();
          }}
          placeholder="Pregunta al Copiloto sobre el expediente..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-fieldcredit-teal dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
        <button
          onClick={() => enviar()}
          disabled={cargando || !input.trim()}
          className="flex items-center gap-1 rounded-xl bg-fieldcredit-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send size={14} />
        </button>
      </div>

      {error && (
        <div className="border-t border-slate-200 bg-amber-50 px-3 py-1 text-[11px] text-amber-800 dark:border-slate-700 dark:bg-amber-900/30 dark:text-amber-200">
          {error}
        </div>
      )}
    </div>
  );
}
