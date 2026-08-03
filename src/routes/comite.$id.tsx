// src/routes/comite.$id.tsx
// Dictamen IA de un expediente en comité + chat en vivo + decisión humana.
// FASE 1: Persistencia en Supabase agregada — guarda número FC-YYYY-NNNN
//         y recupera el dictamen si se pierde de memoria (recarga de página).
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ProveedorBadge } from "@/components/ia/ProveedorBadge";
import { ScoreGauge } from "@/components/comite/ScoreGauge";
import { BanderasCumplimiento } from "@/components/comite/BanderasCumplimiento";
import { ScoreAgroResilia } from "@/components/comite/ScoreAgroResilia";
import { RecomendacionIA } from "@/components/comite/RecomendacionIA";
import { AnalisisFinanciero } from "@/components/comite/AnalisisFinanciero";
import { DecisionComite } from "@/components/comite/DecisionComite";
import { ChatCopiloto } from "@/components/comite/ChatCopiloto";
import { ExportarDictamenPDF } from "@/components/comite/ExportarDictamenPDF";
import { useCargarExpediente } from "@/hooks/useHidratarExpediente";
import { useExpedientes, type DictamenIA } from "@/stores/expedientes";
import { supabase } from "@/integrations/supabase/client";         // [FASE 1]
import { useDictamenGuardado } from "@/hooks/useDictamenGuardado"; // [FASE 1]
import { llamarIA } from "@/services/ia/adaptadorIA";
import { construirContextoExpediente } from "@/services/ia/contextoExpediente";
import { PROMPT_GENERAR_DICTAMEN, SISTEMA_COPILOTO_COMITE } from "@/services/ia/prompts";
import { parsearDictamenIA } from "@/services/ia/parsearDictamen";
import { productosCredito } from "@/data/catalogos";

export const Route = createFileRoute("/comite/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Dictamen ${params.id} — FieldCredit` },
      { name: "description", content: "Dictamen crediticio del Copiloto IA con score, banderas y recomendación." },
      { property: "og:title", content: `Dictamen ${params.id} — Comité FieldCredit` },
      { property: "og:description", content: "Análisis integral IA + decisión humana." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DictamenPage,
});

const LOGS = [
  "Leyendo expediente digital completo...",
  "Analizando flujo de efectivo mes a mes...",
  "Evaluando estado de resultados y excedente familiar...",
  "Revisando situación financiera y patrimonio...",
  "Verificando garantías y cobertura...",
  "Cruzando contra manual de políticas CONAMI...",
  "Calculando score de salud financiera...",
  "Identificando banderas de cumplimiento...",
  "Calculando AgroResilia Score (ARS) si aplica...",
  "Generando dictamen y recomendación...",
];

type Fase = "idle" | "procesando" | "listo" | "error";

function DictamenPage() {
  const { id } = Route.useParams();
  const exp = useExpedientes((s) => s.expedientes[id]);
  const { cargando: cargandoExp } = useCargarExpediente(id);
  const guardarDictamen = useExpedientes((s) => s.guardarDictamenIA);
  const marcarEnComite = useExpedientes((s) => s.marcarEnComite);

  const [fase, setFase] = useState<Fase>(exp?.comite?.dictamenIA ? "listo" : "idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [dictamen, setDictamen] = useState<DictamenIA | null>(exp?.comite?.dictamenIA ?? null);
  const [error, setError] = useState<string | null>(null);
  const [numeroDictamen, setNumeroDictamen] = useState<string | null>(null); // [FASE 1]

  // [FASE 1] Carga el dictamen persistido en Supabase si no hay uno en memoria.
  // Permite recuperarlo después de una recarga de página.
  const { dictamen: dictamenGuardado, meta: dictamenMeta } =
    useDictamenGuardado(Number(id));

  // [FASE 1] Hidrata desde Supabase cuando la memoria está vacía.
  useEffect(() => {
    if (dictamenGuardado && !dictamen) {
      setDictamen(dictamenGuardado);
      setFase("listo");
    }
  }, [dictamenGuardado, dictamen]);

  // [FASE 1] Muestra el número del dictamen cuando se carga desde Supabase.
  useEffect(() => {
    if (dictamenMeta?.numero_dictamen && !numeroDictamen) {
      setNumeroDictamen(dictamenMeta.numero_dictamen);
    }
  }, [dictamenMeta, numeroDictamen]);

  useEffect(() => {
    if (exp && exp.estado !== "en_comite" && !exp.comite?.decision) marcarEnComite(id);
  }, [exp, id, marcarEnComite]);

  if (!exp && cargandoExp) {
    return (
      <AppLayout>
        <PageHeader title={`Comité ${id}`} subtitle="Cargando desde la nube…" />
        <p className="text-sm text-slate-500">Sincronizando expediente…</p>
      </AppLayout>
    );
  }

  if (!exp) {
    return (
      <AppLayout>
        <PageHeader title={`Comité ${id}`} subtitle="Expediente no encontrado" />
        <Link to="/comite" className="text-sm text-fieldcredit-green underline">
          Volver al comité
        </Link>
      </AppLayout>
    );
  }

  const d = exp.data;
  const nombre =
    [d?.primer_nombre, d?.segundo_nombre, d?.primer_apellido, d?.segundo_apellido].filter(Boolean).join(" ") || "—";
  const producto = productosCredito.find((p) => p.id === d?.producto)?.nombre || d?.producto || "—";
  const esAR = d?.producto === "agroresilia";

  const generar = async () => {
    setFase("procesando");
    setLogs([]);
    setError(null);

    let cancelado = false;
    (async () => {
      for (let i = 0; i < LOGS.length; i++) {
        if (cancelado) return;
        await new Promise((r) => setTimeout(r, 500));
        if (cancelado) return;
        setLogs((prev) => [...prev, LOGS[i]]);
      }
    })();

    try {
      const contexto = construirContextoExpediente(exp);
      const respuesta = await llamarIA({
        sistema: SISTEMA_COPILOTO_COMITE(contexto, esAR),
        mensajes: [{ role: "user", content: PROMPT_GENERAR_DICTAMEN(contexto) }],
        maxTokens: 2000,
      });
      const parsed = parsearDictamenIA(respuesta);
      cancelado = true;

      // Guardar en Zustand (comportamiento original)
      setDictamen(parsed);
      guardarDictamen(id, parsed);
      setFase("listo");

      // [FASE 1] Persistir en Supabase para sobrevivir recargas de página.
      // Se hace en background — un fallo aquí no interrumpe el flujo.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: fila } = await supabase
            .from("dictamenes")
            .insert({
              solicitud_id: Number(id),   // INTEGER en Supabase
              contenido_json: parsed,
              estado: "borrador",
              generado_por: user.id,      // UUID de Supabase Auth
              modelo_ia: "llama-3.3-70b-versatile",
              editado_por_asesor: false,
            })
            .select("numero_dictamen")
            .single();

          if (fila?.numero_dictamen) {
            setNumeroDictamen(fila.numero_dictamen);
          }
        }
      } catch (dbErr) {
        // No bloquea — el dictamen ya está en pantalla y en Zustand.
        console.warn("[comite.$id] No se pudo persistir en Supabase:", dbErr);
      }

    } catch (e) {
      cancelado = true;
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
      setFase("error");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title={`Dictamen ${exp.id}`}
        subtitle={`${nombre} · ${producto}`}
        actions={<StatusBadge status={exp.estado} />}
      />

      <Link
        to="/comite"
        className="mb-4 inline-flex items-center gap-1 text-xs text-slate-600 hover:underline dark:text-slate-400"
      >
        <ArrowLeft size={12} /> Volver al comité
      </Link>

      <div className="mb-4 grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-800">
        <Info k="Monto" v={d?.monto ? `C$ ${d.monto.toLocaleString("es-NI")}` : "—"} />
        <Info k="Plazo" v={d?.plazo ? `${d.plazo} meses` : "—"} />
        <Info k="Frecuencia" v={d?.frecuencia_pago || "—"} />
        <Info k="Actividad" v={d?.tipo_actividad || "—"} />
        <Info k="Fiador" v={d?.aplica_fiador ? "Sí" : "No"} />
        <Info k="Cédula" v={d?.cedula || "—"} />
      </div>

      {fase === "idle" && (
        <button
          onClick={generar}
          className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-fieldcredit-green to-fieldcredit-teal py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl"
        >
          <Sparkles size={22} />
          Analizar expediente con el Copiloto IA
          <ProveedorBadge dark />
        </button>
      )}

      {fase === "procesando" && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-fieldcredit-teal" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Copiloto IA procesando...
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {logs.map((l, i) => (
              <li key={i} className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2">
                <span className="text-fieldcredit-green">✓</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      {fase === "error" && (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/30">
          <p className="mb-2 text-sm font-bold text-red-800 dark:text-red-200">
            ⚠️ Error al generar el dictamen
          </p>
          <p className="mb-4 text-xs text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={generar}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {fase === "listo" && dictamen && (
        <>
          <ScoreGauge score={dictamen.score} semaforo={dictamen.semaforo} />
          <ResumenEjecutivo texto={dictamen.resumen} />
          {esAR && dictamen.scoreARS && <ScoreAgroResilia ars={dictamen.scoreARS} />}
          <BanderasCumplimiento banderas={dictamen.banderas} />
          <AnalisisFinanciero metricas={dictamen.metricas} />
          <RecomendacionIA recomendacion={dictamen.recomendacion} />
          <DecisionComite expedienteId={id} />
          <ChatCopiloto expediente={exp} dictamen={dictamen} clienteNombre={nombre} />

          {/* [FASE 1] Número del dictamen + exportación */}
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={generar}
              className="flex-1 rounded-xl border border-slate-300 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Regenerar dictamen
            </button>
            <ExportarDictamenPDF
              dictamen={dictamen}
              expediente={exp}
              clienteNombre={nombre}
            />
          </div>

          {/* [FASE 1] Indicador de persistencia */}
          {numeroDictamen && (
            <p className="mb-4 text-center text-xs text-slate-400 font-mono">
              {numeroDictamen} · guardado en repositorio
            </p>
          )}
        </>
      )}
    </AppLayout>
  );
}

function ResumenEjecutivo({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">📝 Resumen ejecutivo</h3>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{texto}</p>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-slate-500">{k}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{v}</p>
    </div>
  );
}
