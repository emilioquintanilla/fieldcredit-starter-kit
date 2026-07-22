// Detalle de expediente con barra de módulos (tabs)
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileImage, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { FiadorModule } from "@/components/FiadorModule";
import { GarantiasModule } from "@/components/GarantiasModule";
import { FlujoModule, estadoFlujo } from "@/components/FlujoModule";
import { EstadoResultadosModule, estadoResultadosStatus } from "@/components/estados/EstadoResultadosModule";
import { SituacionFinancieraModule, estadoSituacionStatus } from "@/components/estados/SituacionFinancieraModule";
import { GeoModule, estadoGeoStatus } from "@/components/geo/GeoModule";
import { DocsExpedientePage, estadoDocsSoporte } from "@/components/docs/DocsExpedientePage";
import { AsistenteBarraCampo } from "@/components/ia/AsistenteBarraCampo";

import { useExpedientes } from "@/stores/expedientes";
import { productosCredito } from "@/data/catalogos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expedientes/$id")({
  head: () => ({ meta: [{ title: "Detalle de expediente — FieldCredit" }] }),
  component: ExpedienteDetalle,
});

type TabId = "solicitud" | "fiador" | "garantias" | "flujo" | "resultados" | "situacion" | "geo" | "docs";
type Estado = "pendiente" | "progreso" | "completo" | "alerta";

// Cálculo simple de cuota mensual estimada (para índice de cobertura del fiador)
const cuotaEstimadaMensual = (monto?: number, plazo?: number) => {
  if (!monto || !plazo) return 0;
  // Tasa mensual referencial 2.5% — solo para el prototipo
  const i = 0.025;
  return Math.round((monto * i) / (1 - Math.pow(1 + i, -plazo)));
};

function ExpedienteDetalle() {
  const { id } = Route.useParams();
  const exp = useExpedientes((s) => s.expedientes[id]);
  const [tab, setTab] = useState<TabId>("solicitud");

  const d = exp?.data;

  // Estado de cada módulo (pendiente/progreso/completo)
  const estadoFiador: Estado = useMemo(() => {
    if (!exp?.fiador) return "pendiente";
    const f = exp.fiador;
    const dp = !!(f.primer_apellido && f.primer_nombre && f.cedula && f.fecha_nacimiento && f.sexo);
    const act = !!(f.tipo_actividad && (f.descripcion_actividad?.length ?? 0) >= 15);
    const ing = f.ingresos.some((i) => i.monto > 0);
    const eg = f.egresos.some((e) => e.monto > 0);
    const done = [dp, act, ing, eg].filter(Boolean).length;
    if (done === 4) return "completo";
    if (done > 0) return "progreso";
    return "pendiente";
  }, [exp?.fiador]);

  const estadoGarantias: Estado = useMemo(() => {
    const g = exp?.garantias;
    const tipos = d?.tipos_garantia || [];
    const requierePrend = tipos.includes("prendaria");
    const requiereHipo = tipos.includes("hipotecaria");
    const prendOk = !requierePrend || (g?.bienes.length ?? 0) > 0;
    const hipoOk = !requiereHipo || (g?.inmueble && g.inmueble.valor_mercado && (g.inmueble.fotos?.length ?? 0) >= 2);
    if (!g || (!g.bienes.length && !g.inmueble)) return "pendiente";
    if (prendOk && hipoOk) return "completo";
    return "progreso";
  }, [exp?.garantias, d?.tipos_garantia]);

  const estadoFlujoMod: Estado = useMemo(() => estadoFlujo(exp?.flujo), [exp?.flujo]);

  if (!exp) {
    return (
      <AppLayout>
        <PageHeader title={`Expediente ${id}`} subtitle="No encontrado" />
        <p className="text-sm text-slate-500">
          Este expediente no existe en el borrador local.{" "}
          <Link to="/expedientes" className="text-fieldcredit-green underline">Volver</Link>
        </p>
      </AppLayout>
    );
  }

  const nombre = [d?.primer_nombre, d?.segundo_nombre, d?.primer_apellido, d?.segundo_apellido]
    .filter(Boolean).join(" ") || "—";
  const estado = exp.estado === "completada" ? "en_revision" : "borrador";
  const aplicaFiador = !!d?.aplica_fiador;
  const aplicaGarantia = !!d?.aplica_garantia &&
    (d?.tipos_garantia || []).some((t) => t === "prendaria" || t === "hipotecaria");
  const cuota = cuotaEstimadaMensual(d?.monto, d?.plazo);
  const tiposGarantia = d?.tipos_garantia || [];

  const tipoActividadFlujo = d?.producto === "agroresilia" ? "AgroResilia" : d?.tipo_actividad;
  const estadoResMod = estadoResultadosStatus(exp.estadoResultados);
  const estadoSitMod = estadoSituacionStatus(exp.situacionFinanciera);
  const estadoGeoMod = estadoGeoStatus(exp);
  const fiadorTieneNegocio = !!(exp.fiador?.tipo_actividad && exp.fiador?.nombre_negocio);

  const tabs: { id: TabId; label: string; disabled?: boolean; estado?: Estado; visible: boolean }[] = [
    { id: "solicitud", label: "📋 Solicitud", visible: true, estado: exp.estado === "completada" ? "completo" : "progreso" },
    { id: "fiador", label: "👤 Fiador", visible: aplicaFiador, estado: estadoFiador },
    { id: "garantias", label: "🔒 Garantías", visible: aplicaGarantia, estado: estadoGarantias },
    { id: "flujo", label: "💰 Flujo", visible: true, estado: estadoFlujoMod },
    { id: "resultados", label: "📊 Resultados", visible: true, estado: estadoResMod },
    { id: "situacion", label: "🏦 Situación", visible: true, estado: estadoSitMod },
    { id: "geo", label: "📍 Geo", visible: true, estado: estadoGeoMod },
    { id: "docs", label: "📄 Docs", visible: true, estado: estadoDocsSoporte(exp) },
  ];


  return (
    <AppLayout>
      <PageHeader
        title={`Expediente ${exp.id}`}
        subtitle={nombre}
        actions={<StatusBadge status={estado} />}
      />

      <Link to="/expedientes" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-600 hover:underline dark:text-slate-400">
        <ArrowLeft size={12} /> Volver al listado
      </Link>

      {/* Barra de módulos */}
      <nav
        className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
        aria-label="Módulos del expediente"
      >
        {tabs.filter((t) => t.visible).map((t) => (
          <button
            key={t.id}
            disabled={t.disabled}
            onClick={() => !t.disabled && setTab(t.id)}
            title={t.disabled ? "Disponible en próximas actualizaciones" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-fieldcredit-green text-white"
                : "text-slate-600 hover:bg-fieldcredit-green-pale dark:text-slate-300 dark:hover:bg-slate-700",
              t.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent dark:hover:bg-transparent",
            )}
          >
            <span>{t.label}</span>
            {t.estado && <EstadoDot estado={t.estado} />}
          </button>
        ))}
      </nav>

      {tab === "solicitud" && <TabSolicitud expedienteId={id} />}
      {tab === "fiador" && aplicaFiador && <FiadorModule expedienteId={id} cuotaDeudor={cuota} />}
      {tab === "garantias" && aplicaGarantia && (
        <GarantiasModule expedienteId={id} montoCredito={d?.monto || 0} tiposGarantia={tiposGarantia} />
      )}
      {tab === "flujo" && (
        <FlujoModule
          expedienteId={id}
          plazoMeses={d?.plazo || 12}
          tipoActividad={tipoActividadFlujo}
          montoSolicitado={d?.monto || 0}
          onSwitchToSolicitud={() => setTab("solicitud")}
        />
      )}
      {tab === "resultados" && (
        <EstadoResultadosModule
          expedienteId={id}
          tipoActividad={tipoActividadFlujo}
          cuotaEstimada={cuota}
          onSwitchToSolicitud={() => setTab("solicitud")}
        />
      )}
      {tab === "situacion" && (
        <SituacionFinancieraModule
          expedienteId={id}
          tipoActividad={tipoActividadFlujo}
          onSwitchToSolicitud={() => setTab("solicitud")}
        />
      )}
      {tab === "geo" && (
        <GeoModule expedienteId={id} aplicaFiador={aplicaFiador} fiadorTieneNegocio={fiadorTieneNegocio} />
      )}
      {tab === "docs" && <TabDocumentos expedienteId={id} />}

      <AsistenteBarraCampo expediente={exp} moduloActual={tab} />
    </AppLayout>
  );
}

/* -------- Tab Solicitud (contenido original de detalle) -------- */

function TabSolicitud({ expedienteId }: { expedienteId: string }) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId])!;
  const d = exp.data;
  const producto = productosCredito.find((p) => p.id === d.producto)?.nombre || "—";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Resumen</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Info k="Cédula" v={d.cedula} />
          <Info k="Fecha nacimiento" v={d.fecha_nacimiento} />
          <Info k="Teléfono" v={d.telefono} />
          <Info k="Departamento" v={d.departamento_residencia} />
          <Info k="Actividad" v={d.tipo_actividad} />
          <Info k="Producto" v={producto} />
          <Info k="Monto" v={d.monto ? `C$ ${d.monto.toLocaleString("es-NI")}` : undefined} />
          <Info k="Plazo" v={d.plazo ? `${d.plazo} meses` : undefined} />
          <Info k="Frecuencia" v={d.frecuencia_pago} />
          <Info k="Fiador" v={d.aplica_fiador ? `Sí (${d.relacion_fiador || ""})` : "No"} />
        </dl>
        {d.destino && (
          <div className="mt-3">
            <div className="text-xs text-slate-500">Destino</div>
            <p className="text-sm text-slate-800 dark:text-slate-200">{d.destino}</p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <FileImage size={14} /> Firma digital
        </h2>
        {d.firma_digital ? (
          <img src={d.firma_digital} alt="Firma" className="h-24 w-full rounded border border-slate-200 bg-white object-contain dark:border-slate-700" />
        ) : (
          <p className="text-xs text-slate-500">Sin firma capturada.</p>
        )}
      </section>
    </div>
  );
}

/* -------- Tab Documentos -------- */

function TabDocumentos({ expedienteId }: { expedienteId: string }) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId])!;
  const marcarEnComite = useExpedientes((s) => s.marcarEnComite);
  const yaEnComite = exp.estado === "en_comite" || !!exp.comite?.dictamenIA;
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <FileImage size={14} /> Documentos adjuntos
        </h2>
        {exp.documentos.length === 0 ? (
          <p className="text-xs text-slate-500">Sin documentos.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {exp.documentos.map((doc) => (
              <li key={doc.tipo} className="flex items-center gap-3 rounded-md border border-slate-200 p-2 dark:border-slate-700">
                {doc.mimeType.startsWith("image/") ? (
                  <img src={doc.base64} alt={doc.nombre} className="h-14 w-20 shrink-0 rounded object-cover" />
                ) : (
                  <div className="grid h-14 w-20 shrink-0 place-items-center rounded bg-slate-100 text-xs text-slate-500 dark:bg-slate-700">PDF</div>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <div className="truncate font-medium text-slate-900 dark:text-slate-100">{doc.nombre}</div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {new Date(doc.fechaCaptura).toLocaleString("es-NI")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-fieldcredit-teal/40 bg-fieldcredit-teal-light/40 p-4 dark:border-teal-800/60 dark:bg-teal-900/20">
        <h3 className="mb-2 text-sm font-bold text-fieldcredit-teal-dark dark:text-teal-200">
          ⚖️ Enviar a comité de crédito
        </h3>
        <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
          El Copiloto IA analizará el expediente completo y emitirá un dictamen con score,
          banderas de cumplimiento y recomendación. La decisión final la toma el comité humano.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => marcarEnComite(expedienteId)}
            disabled={yaEnComite}
            className="rounded-lg bg-fieldcredit-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {yaEnComite ? "Ya está en comité" : "Enviar al comité"}
          </button>
          {yaEnComite && (
            <Link
              to="/comite/$id"
              params={{ id: expedienteId }}
              className="rounded-lg border border-fieldcredit-teal px-4 py-2 text-sm font-bold text-fieldcredit-teal-dark dark:text-teal-200"
            >
              Ver dictamen →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}


/* -------- Helpers -------- */

function Info({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="text-sm text-slate-900 dark:text-slate-100">{v || "—"}</dd>
    </div>
  );
}

function EstadoDot({ estado }: { estado: Estado }) {
  const cls =
    estado === "completo" ? "bg-fieldcredit-green" :
    estado === "alerta"   ? "bg-rose-500" :
    estado === "progreso" ? "bg-fieldcredit-amber" :
    "bg-slate-300 dark:bg-slate-500";
  return <span className={cn("inline-block h-2 w-2 rounded-full", cls)} aria-hidden />;
}
