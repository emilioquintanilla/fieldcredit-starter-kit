// Módulo Análisis de Garantías del Deudor — prendaria y/o hipotecaria
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, MapPin, AlertTriangle, CheckCircle2, Camera } from "lucide-react";
import {
  useExpedientes,
  type BienPrendado,
  type InmuebleHipotecario,
} from "@/stores/expedientes";
import { departamentos, municipiosPorDepartamento } from "@/data/municipios";
import {
  tiposBienPrendado, iconosBienPrendado, estadosBien,
  tiposInmueble, estadosInmueble,
  COBERTURA_PRENDARIA, COBERTURA_HIPOTECARIA,
} from "@/data/fiador-garantias";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmtC = (n: number) => `C$ ${n.toLocaleString("es-NI")}`;

interface Props {
  expedienteId: string;
  montoCredito: number;
  tiposGarantia: string[]; // ids: solidaria/prendaria/hipotecaria/otra
}

export function GarantiasModule({ expedienteId, montoCredito, tiposGarantia }: Props) {
  const incluyePrend = tiposGarantia.includes("prendaria");
  const incluyeHipo = tiposGarantia.includes("hipotecaria");
  const incluyeSolid = tiposGarantia.includes("solidaria");

  const exp = useExpedientes((s) => s.expedientes[expedienteId]);

  // Autoguardado cada 30 s
  useEffect(() => {
    const t = setInterval(() => {
      if (exp?.garantias) toast.success("Garantías — guardado automático", { duration: 1200 });
    }, 30000);
    return () => clearInterval(t);
  }, [exp?.garantias]);

  const tabs = [
    incluyePrend ? { id: "prendaria", label: "🔒 Prendaria" } : null,
    incluyeHipo ? { id: "hipotecaria", label: "🏠 Hipotecaria" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  const [tab, setTab] = useState(tabs[0]?.id ?? "prendaria");

  const bienes = exp?.garantias?.bienes ?? [];
  const inmueble = exp?.garantias?.inmueble;

  const totalPrendMercado = bienes.reduce((a, b) => a + (b.valor_mercado || 0), 0);
  const totalPrendAceptado = totalPrendMercado * COBERTURA_PRENDARIA;
  const hipoAceptado = (inmueble?.valor_mercado || 0) * COBERTURA_HIPOTECARIA;
  const totalAceptado = (incluyePrend ? totalPrendAceptado : 0) + (incluyeHipo ? hipoAceptado : 0);
  const coberturaTotal = montoCredito > 0 ? (totalAceptado / montoCredito) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Tabs de tipo de garantía */}
      {tabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-fieldcredit-green text-white"
                  : "text-slate-600 hover:bg-fieldcredit-green-pale dark:text-slate-300 dark:hover:bg-slate-700",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "prendaria" && incluyePrend && (
        <TabPrendaria expedienteId={expedienteId} bienes={bienes} montoCredito={montoCredito} totalMercado={totalPrendMercado} totalAceptado={totalPrendAceptado} />
      )}

      {tab === "hipotecaria" && incluyeHipo && (
        <TabHipotecaria expedienteId={expedienteId} inmueble={inmueble} montoCredito={montoCredito} valorAceptado={hipoAceptado} />
      )}

      {/* Resumen consolidado si hay más de un tipo */}
      {(incluyePrend && incluyeHipo) || (incluyeSolid && (incluyePrend || incluyeHipo)) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Resumen consolidado de garantías del deudor
          </h3>
          <dl className="space-y-1 text-sm">
            {incluyeSolid && <Row k="Fianza solidaria" v="✓ Aplica (ver fiador)" />}
            {incluyePrend && <Row k="Garantía prendaria" v={`${fmtC(totalPrendAceptado)} aceptado`} />}
            {incluyeHipo && <Row k="Garantía hipotecaria" v={`${fmtC(hipoAceptado)} aceptado`} />}
            <Row k="TOTAL VALOR ACEPTADO" v={fmtC(totalAceptado)} strong />
            <Row k="Monto del crédito" v={fmtC(montoCredito)} />
          </dl>
          <Semaforo cobertura={coberturaTotal} />
        </div>
      ) : null}
    </div>
  );
}

/* -------- TAB Prendaria -------- */

function TabPrendaria({
  expedienteId, bienes, montoCredito, totalMercado, totalAceptado,
}: {
  expedienteId: string;
  bienes: BienPrendado[];
  montoCredito: number;
  totalMercado: number;
  totalAceptado: number;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const cobertura = montoCredito > 0 ? (totalAceptado / montoCredito) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-fieldcredit-teal-light bg-fieldcredit-teal-pale p-3 text-xs text-fieldcredit-teal-dark dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-200">
        📋 Registra cada bien mueble que el deudor ofrece como garantía. Puedes agregar varios bienes. Toma fotos de cada uno directamente desde aquí.
      </div>

      {/* Cards de bienes */}
      <ul className="space-y-2">
        {bienes.map((b) => (
          <li key={b.id}>
            {editandoId === b.id ? (
              <FormBien
                expedienteId={expedienteId}
                bien={b}
                onCerrar={() => setEditandoId(null)}
              />
            ) : (
              <CardBien
                bien={b}
                onEditar={() => setEditandoId(b.id)}
              />
            )}
          </li>
        ))}
      </ul>

      {mostrarForm ? (
        <FormBien expedienteId={expedienteId} onCerrar={() => setMostrarForm(false)} />
      ) : (
        <button
          onClick={() => setMostrarForm(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-fieldcredit-green px-4 py-3 text-sm font-semibold text-fieldcredit-green hover:bg-fieldcredit-green-pale dark:hover:bg-slate-700"
        >
          <Plus size={16} /> Agregar bien prendado
        </button>
      )}

      {bienes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Resumen garantía prendaria</h3>
          <dl className="space-y-1 text-sm">
            <Row k="Total bienes registrados" v={String(bienes.length)} />
            <Row k="Valor de mercado total" v={fmtC(totalMercado)} />
            <Row k="Valor aceptado total (80%)" v={fmtC(totalAceptado)} strong />
            <Row k="Monto del crédito" v={fmtC(montoCredito)} />
          </dl>
          <Semaforo cobertura={cobertura} />
        </div>
      )}
    </div>
  );
}

function CardBien({ bien, onEditar }: { bien: BienPrendado; onEditar: () => void }) {
  const eliminar = useExpedientes((s) => s.eliminarBienPrendado);
  const { id: expId } = useExpedientes.getState().expedientes[Object.keys(useExpedientes.getState().expedientes)[0] || ""] || { id: "" };
  // no funciona confiable — usar handler pasado por prop
  void expId; void eliminar;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {iconosBienPrendado[bien.tipo_bien] || "📦"} {bien.tipo_bien} — <span className="font-normal">{bien.descripcion}</span>
          </div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Estado: <b className="text-slate-800 dark:text-slate-200">{bien.estado}</b> · Valor mercado: {fmtC(bien.valor_mercado)}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Valor aceptado: <b>{fmtC(bien.valor_mercado * COBERTURA_PRENDARIA)}</b>
          </div>
          <div className="text-xs text-slate-500">📸 {bien.fotos.length} foto{bien.fotos.length === 1 ? "" : "s"}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEditar} className="rounded p-1 text-fieldcredit-teal hover:bg-fieldcredit-teal-light dark:hover:bg-teal-900/30" aria-label="Editar">
            <Pencil size={14} />
          </button>
          <BotonEliminarBien bienId={bien.id} />
        </div>
      </div>
    </div>
  );
}

function BotonEliminarBien({ bienId }: { bienId: string }) {
  // Obtenemos el id de expediente desde contexto simple: usamos la primera clave que contenga este bien
  const store = useExpedientes.getState();
  const expedienteId = Object.entries(store.expedientes).find(([, e]) => e.garantias?.bienes.some((b) => b.id === bienId))?.[0];
  const eliminar = useExpedientes((s) => s.eliminarBienPrendado);
  return (
    <button
      onClick={() => { if (expedienteId) eliminar(expedienteId, bienId); }}
      className="rounded p-1 text-fieldcredit-red hover:bg-fieldcredit-red-light dark:hover:bg-red-900/30"
      aria-label="Eliminar"
    >
      <Trash2 size={14} />
    </button>
  );
}

function FormBien({
  expedienteId, bien, onCerrar,
}: {
  expedienteId: string;
  bien?: BienPrendado;
  onCerrar: () => void;
}) {
  const agregar = useExpedientes((s) => s.agregarBienPrendado);
  const actualizar = useExpedientes((s) => s.actualizarBienPrendado);

  const [tipoBien, setTipoBien] = useState(bien?.tipo_bien || "");
  const [descripcion, setDescripcion] = useState(bien?.descripcion || "");
  const [estado, setEstado] = useState(bien?.estado || "");
  const [valorMercado, setValorMercado] = useState<number | "">(bien?.valor_mercado || "");
  const [numSerie, setNumSerie] = useState(bien?.num_serie || "");
  const [ubicacion, setUbicacion] = useState(bien?.ubicacion || "");
  const [tieneGravamen, setTieneGravamen] = useState(bien?.tiene_gravamen || false);
  const [gravamenDesc, setGravamenDesc] = useState(bien?.gravamen_desc || "");
  const [fotos, setFotos] = useState<string[]>(bien?.fotos || []);

  const placeholder =
    tipoBien.startsWith("Vehículo") ? "Ej: Toyota Hilux 2018, color blanco, doble cabina"
    : tipoBien.startsWith("Semovientes") ? "Ej: 5 novillos Holstein de 3 años, aprox. 400 kg c/u"
    : tipoBien.startsWith("Maquinaria") ? "Ej: Bomba de riego Grundfos 2HP, modelo CM5-7"
    : "Describe el bien con el mayor detalle posible";

  const valorAceptado = (Number(valorMercado) || 0) * COBERTURA_PRENDARIA;

  const onFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const b64s = await Promise.all(files.map(
      (f) => new Promise<string>((res) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
      }),
    ));
    setFotos((prev) => [...prev, ...b64s]);
    e.target.value = "";
  };

  const guardar = () => {
    if (!tipoBien || !descripcion || !estado || !valorMercado || fotos.length === 0) {
      toast.error("Completa tipo, descripción, estado, valor y al menos 1 foto");
      return;
    }
    const data = {
      tipo_bien: tipoBien, descripcion, estado, valor_mercado: Number(valorMercado),
      num_serie: numSerie, ubicacion, tiene_gravamen: tieneGravamen,
      gravamen_desc: tieneGravamen ? gravamenDesc : undefined, fotos,
    };
    if (bien) actualizar(expedienteId, bien.id, data);
    else agregar(expedienteId, data);
    toast.success("Bien guardado");
    onCerrar();
  };

  return (
    <div className="space-y-3 rounded-xl border-2 border-fieldcredit-green bg-white p-4 dark:border-fieldcredit-green dark:bg-slate-800">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de bien">
          <select className={inp} value={tipoBien} onChange={(e) => setTipoBien(e.target.value)}>
            <option value="">Seleccionar…</option>
            {tiposBienPrendado.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Estado del bien">
          <select className={inp} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Seleccionar…</option>
            {estadosBien.map((e) => <option key={e.id} value={e.label}>{e.emoji} {e.label}</option>)}
          </select>
        </Field>
        <Field label="Descripción del bien" full>
          <textarea rows={2} className={inp} placeholder={placeholder} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Field>
        <Field label="Valor de mercado estimado (C$)" hint="¿Cuánto cree que valdría si lo vendiera hoy?">
          <input type="number" className={inp} value={valorMercado} onChange={(e) => setValorMercado(e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Valor aceptado (80% mercado)" hint="Calculado automáticamente al 80% del valor de mercado">
          <input readOnly className={cn(inp, "bg-slate-100 dark:bg-slate-700")} value={fmtC(valorAceptado)} />
        </Field>
        <Field label="Número de serie o placa (opcional)">
          <input className={inp} value={numSerie} onChange={(e) => setNumSerie(e.target.value)} />
        </Field>
        <Field label="Ubicación actual del bien" full>
          <textarea rows={2} className={inp} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
        </Field>
        <Field label="¿Tiene gravamen previo?" full>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={tieneGravamen} onChange={(e) => setTieneGravamen(e.target.checked)} />
            <span>Sí, el bien tiene un gravamen previo</span>
          </label>
          {tieneGravamen && (
            <>
              <input className={cn(inp, "mt-2")} placeholder="Descripción del gravamen" value={gravamenDesc} onChange={(e) => setGravamenDesc(e.target.value)} />
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-fieldcredit-amber-light p-2 text-xs text-fieldcredit-amber dark:bg-amber-900/30 dark:text-amber-200">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                Bien con gravamen previo. Informar al comité.
              </div>
            </>
          )}
        </Field>
      </div>

      {/* Fotos */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">📷 Fotos del bien (mín. 1)</span>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-fieldcredit-teal px-3 py-1 text-xs font-semibold text-white hover:bg-fieldcredit-teal-dark">
            <Camera size={12} /> Agregar
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onFotos} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {fotos.map((f, i) => (
            <div key={i} className="relative">
              <img src={f} alt="" className="h-16 w-20 rounded object-cover" />
              <button
                onClick={() => setFotos((prev) => prev.filter((_, ix) => ix !== i))}
                className="absolute -right-1 -top-1 rounded-full bg-fieldcredit-red p-0.5 text-white"
                aria-label="Quitar foto"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
          {fotos.length === 0 && <p className="text-xs text-slate-500">Sin fotos aún.</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
          Cancelar
        </button>
        <button onClick={guardar} className="rounded-lg bg-fieldcredit-green px-4 py-2 text-sm font-semibold text-white hover:bg-fieldcredit-green-dark">
          💾 Guardar bien
        </button>
      </div>
    </div>
  );
}

/* -------- TAB Hipotecaria -------- */

function TabHipotecaria({
  expedienteId, inmueble, montoCredito, valorAceptado,
}: {
  expedienteId: string;
  inmueble?: InmuebleHipotecario;
  montoCredito: number;
  valorAceptado: number;
}) {
  const guardar = useExpedientes((s) => s.guardarInmuebleHipotecario);
  const inm: InmuebleHipotecario = inmueble ?? { fotos: [], area_unidad: "mz" };
  const set = (patch: Partial<InmuebleHipotecario>) => guardar(expedienteId, patch);
  const municipios = inm.departamento ? municipiosPorDepartamento[inm.departamento] ?? [] : [];
  const cobertura = montoCredito > 0 ? (valorAceptado / montoCredito) * 100 : 0;

  const capturarGPS = () => {
    if (!navigator.geolocation) return toast.error("GPS no disponible en este dispositivo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({ gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude });
        toast.success("Ubicación capturada");
      },
      () => toast.error("No se pudo obtener la ubicación"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const b64s = await Promise.all(files.map(
      (f) => new Promise<string>((res) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
      }),
    ));
    set({ fotos: [...(inm.fotos || []), ...b64s] });
    e.target.value = "";
  };

  const onAvaluo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
    });
    set({ avaluo_pdf: b64 });
    toast.success("Avalúo adjuntado");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-fieldcredit-teal-light bg-fieldcredit-teal-pale p-3 text-xs text-fieldcredit-teal-dark dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-200">
        📋 Registra el bien inmueble que el deudor ofrece como garantía. Solo se registra UN inmueble por solicitud.
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800">
        <Field label="Tipo de inmueble">
          <select className={inp} value={inm.tipo_inmueble || ""} onChange={(e) => set({ tipo_inmueble: e.target.value })}>
            <option value="">Seleccionar…</option>
            {tiposInmueble.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Estado del inmueble">
          <select className={inp} value={inm.estado || ""} onChange={(e) => set({ estado: e.target.value })}>
            <option value="">Seleccionar…</option>
            {estadosInmueble.map((e) => <option key={e.id} value={e.label}>{e.emoji} {e.label}</option>)}
          </select>
        </Field>
        <Field label="Descripción del inmueble" full>
          <textarea rows={2} className={inp} placeholder="Ej: Casa de bloque y techo de zinc, 3 cuartos, sala, cocina, baño. Muro perimetral." value={inm.descripcion || ""} onChange={(e) => set({ descripcion: e.target.value })} />
        </Field>
        <Field label="Departamento">
          <select className={inp} value={inm.departamento || ""} onChange={(e) => set({ departamento: e.target.value, municipio: "" })}>
            <option value="">Seleccionar…</option>
            {departamentos.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Municipio">
          <select className={inp} value={inm.municipio || ""} onChange={(e) => set({ municipio: e.target.value })} disabled={!municipios.length}>
            <option value="">Seleccionar…</option>
            {municipios.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Dirección o referencia" full>
          <textarea rows={2} className={inp} placeholder="Ej: Del semáforo del parque 3 cuadras al lago, casa azul" value={inm.direccion || ""} onChange={(e) => set({ direccion: e.target.value })} />
        </Field>
        <Field label="Ubicación GPS" full>
          <button onClick={capturarGPS} className="inline-flex items-center gap-2 rounded-lg bg-fieldcredit-teal px-4 py-2 text-sm font-semibold text-white hover:bg-fieldcredit-teal-dark">
            <MapPin size={14} /> Capturar ubicación GPS del inmueble
          </button>
          {inm.gps_lat != null && inm.gps_lng != null && (
            <p className="mt-2 rounded-lg bg-slate-100 p-2 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              📍 {inm.gps_lat.toFixed(6)}, {inm.gps_lng.toFixed(6)} <span className="text-slate-500">(mapa disponible en próxima sesión)</span>
            </p>
          )}
        </Field>
        <Field label={`Área total (${inm.area_unidad === "m2" ? "m²" : "manzanas"})`}>
          <div className="flex gap-2">
            <button
              onClick={() => set({ area_unidad: inm.area_unidad === "m2" ? "mz" : "m2" })}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              🔄 {inm.area_unidad === "m2" ? "m²" : "Mz"}
            </button>
            <input type="number" className={inp} value={inm.area_valor ?? ""} onChange={(e) => set({ area_valor: Number(e.target.value) })} />
          </div>
        </Field>
        <Field label="Área de construcción (m², opcional)">
          <input type="number" className={inp} value={inm.area_construccion ?? ""} onChange={(e) => set({ area_construccion: Number(e.target.value) })} />
        </Field>
      </div>

      {/* Situación legal */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800">
        <Field label="¿Tiene escritura pública?">
          <div className="flex gap-4 pt-1 text-sm">
            {[["Sí", true], ["No", false]].map(([l, v]) => (
              <label key={String(v)} className="flex items-center gap-1">
                <input type="radio" checked={inm.tiene_escritura === v} onChange={() => set({ tiene_escritura: v as boolean })} /> {l}
              </label>
            ))}
          </div>
        </Field>
        <Field label="¿Inscrito en Registro?">
          <div className="flex gap-4 pt-1 text-sm">
            {[["Sí", true], ["No", false]].map(([l, v]) => (
              <label key={String(v)} className="flex items-center gap-1">
                <input type="radio" checked={inm.inscrito_registro === v} onChange={() => set({ inscrito_registro: v as boolean })} /> {l}
              </label>
            ))}
          </div>
        </Field>
        {inm.inscrito_registro && (
          <Field label="Número de registro / folio real">
            <input className={inp} value={inm.numero_registro || ""} onChange={(e) => set({ numero_registro: e.target.value })} />
          </Field>
        )}
        <Field label="Nombre del propietario registral">
          <input className={inp} value={inm.propietario_registral || ""} onChange={(e) => set({ propietario_registral: e.target.value })} />
        </Field>
        {inm.tiene_escritura === false && (
          <Alerta full>Inmueble sin escritura pública. Requiere autorización explícita del coordinador en el comité.</Alerta>
        )}
        {inm.inscrito_registro === false && (
          <Alerta full>Inmueble no inscrito en el Registro de la Propiedad. Riesgo legal. Informar al comité.</Alerta>
        )}
        <Field label="¿Tiene gravamen hipotecario previo?" full>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={inm.tiene_gravamen || false} onChange={(e) => set({ tiene_gravamen: e.target.checked })} />
            Sí, tiene gravamen previo
          </label>
          {inm.tiene_gravamen && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input className={inp} placeholder="Institución" value={inm.gravamen_institucion || ""} onChange={(e) => set({ gravamen_institucion: e.target.value })} />
              <input type="number" className={inp} placeholder="Saldo pendiente (C$)" value={inm.gravamen_saldo ?? ""} onChange={(e) => set({ gravamen_saldo: Number(e.target.value) })} />
              <div className="sm:col-span-2">
                <Alerta full>Inmueble con gravamen previo. El comité debe evaluar si acepta como garantía.</Alerta>
              </div>
            </div>
          )}
        </Field>
      </div>

      {/* Valor */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800">
        <Field label="Valor de mercado estimado (C$)" hint="¿Cuánto estima que vale este inmueble si se vendiera hoy?">
          <input type="number" className={inp} value={inm.valor_mercado ?? ""} onChange={(e) => set({ valor_mercado: Number(e.target.value) })} />
        </Field>
        <Field label="Valor aceptado (70%)" hint="Calculado al 70% del valor declarado">
          <input readOnly className={cn(inp, "bg-slate-100 dark:bg-slate-700")} value={fmtC((inm.valor_mercado || 0) * COBERTURA_HIPOTECARIA)} />
        </Field>
        <Field label="¿Cuenta con avalúo profesional?" full>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={inm.tiene_avaluo || false} onChange={(e) => set({ tiene_avaluo: e.target.checked })} />
            Sí, cuenta con avalúo
          </label>
          {inm.tiene_avaluo && (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-fieldcredit-teal px-3 py-1 text-xs font-semibold text-white hover:bg-fieldcredit-teal-dark">
              📎 Adjuntar avalúo PDF
              <input type="file" accept="application/pdf" className="hidden" onChange={onAvaluo} />
            </label>
          )}
          {inm.avaluo_pdf && <p className="mt-1 text-xs text-fieldcredit-green">✓ Avalúo adjuntado</p>}
        </Field>
      </div>

      {/* Fotos */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">📷 Fotos del inmueble (mín. 2)</span>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-fieldcredit-teal px-3 py-1 text-xs font-semibold text-white hover:bg-fieldcredit-teal-dark">
            <Camera size={12} /> Agregar
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onFotos} />
          </label>
        </div>
        <p className="mb-2 text-xs text-slate-500">Sugerencia: fachada principal, interior, entorno inmediato.</p>
        <div className="flex flex-wrap gap-2">
          {(inm.fotos || []).map((f, i) => (
            <div key={i} className="relative">
              <img src={f} alt="" className="h-20 w-24 rounded object-cover" />
              <button
                onClick={() => set({ fotos: (inm.fotos || []).filter((_, ix) => ix !== i) })}
                className="absolute -right-1 -top-1 rounded-full bg-fieldcredit-red p-0.5 text-white"
                aria-label="Quitar foto"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
          {(!inm.fotos || inm.fotos.length === 0) && <p className="text-xs text-slate-500">Sin fotos aún.</p>}
        </div>
      </div>

      {/* Resumen */}
      {inm.valor_mercado ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Resumen garantía hipotecaria</h3>
          <dl className="space-y-1 text-sm">
            <Row k="Tipo de inmueble" v={inm.tipo_inmueble || "—"} />
            <Row k="Situación legal" v={inm.inscrito_registro ? "✓ Inscrito" : "⚠ Sin inscripción"} />
            <Row k="Valor de mercado" v={fmtC(inm.valor_mercado)} />
            <Row k="Valor aceptado (70%)" v={fmtC(valorAceptado)} strong />
            <Row k="Monto del crédito" v={fmtC(montoCredito)} />
          </dl>
          <Semaforo cobertura={cobertura} />
        </div>
      ) : null}
    </div>
  );
}

/* -------- Helpers UI -------- */

const inp = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-fieldcredit-green focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

function Field({ label, children, full, hint }: { label: React.ReactNode; children: React.ReactNode; full?: boolean; hint?: string }) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-slate-100 py-1 dark:border-slate-700">
      <dt className="text-slate-600 dark:text-slate-400">{k}</dt>
      <dd className={cn("text-slate-900 dark:text-slate-100", strong && "font-semibold")}>{v}</dd>
    </div>
  );
}

function Alerta({ children, full }: { children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg bg-fieldcredit-amber-light p-2 text-xs text-fieldcredit-amber dark:bg-amber-900/30 dark:text-amber-200", full && "sm:col-span-2")}>
      <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {children}
    </div>
  );
}

function Semaforo({ cobertura }: { cobertura: number }) {
  const s =
    cobertura >= 100
      ? { cls: "bg-fieldcredit-green-light text-fieldcredit-green-dark dark:bg-green-900/40 dark:text-green-200", label: "SUFICIENTE", icon: <CheckCircle2 size={14} /> }
      : cobertura >= 70
      ? { cls: "bg-fieldcredit-amber-light text-fieldcredit-amber dark:bg-amber-900/40 dark:text-amber-200", label: "PARCIAL", icon: <AlertTriangle size={14} /> }
      : { cls: "bg-fieldcredit-red-light text-fieldcredit-red dark:bg-red-900/40 dark:text-red-300", label: "INSUFICIENTE", icon: <AlertTriangle size={14} /> };
  return (
    <div className={cn("mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold", s.cls)}>
      <span className="flex items-center gap-2">{s.icon} Cobertura</span>
      <span>{cobertura.toFixed(0)}% · {s.label}</span>
    </div>
  );
}
