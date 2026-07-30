// Nueva solicitud de crédito — formulario con 7 secciones + OCR de cédula
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Plus, Save, Send, Trash2, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Stepper, type Paso } from "@/components/Stepper";
import { CedulaScanner } from "@/components/CedulaScanner";
import { SignaturePad } from "@/components/SignaturePad";
import { AsistenteBarraCampo } from "@/components/ia/AsistenteBarraCampo";
import { useApp } from "@/stores/app";
import { useExpedientes, type SolicitudData } from "@/stores/expedientes";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import { useAutosaveSolicitud } from "@/hooks/useAutosaveSolicitud";
import { useCargarExpediente } from "@/hooks/useHidratarExpediente";

import { guardarSolicitud, actualizarExpedienteHeader } from "@/services/expedientesService";
import { sucursales } from "@/data/mock";
import { departamentos, municipiosPorDepartamento } from "@/data/municipios";
import {
  tiposActividad, productosCredito, plazos, frecuenciasPago, lineasAgroResilia,
  estadosCiviles, escolaridades, tiposVivienda, tiposSolicitud, ciclosProductivos,
  relacionesFiador, tiposGarantia,
} from "@/data/catalogos";
import { cn } from "@/lib/utils";
import {
  validarSeccionSolicitud,
  calcularProgresoSolicitud,
  nombreSeccion,
  NOMBRES_SECCION as NOMBRES_SECCION_BASE,
} from "@/lib/progresoSolicitud";


export const Route = createFileRoute("/expedientes/nuevo")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" && search.id ? search.id : undefined,
  }),
  head: () => ({ meta: [{ title: "Solicitud de crédito — FieldCredit" }] }),
  component: NuevaSolicitud,
});


const NOMBRES_SECCION = NOMBRES_SECCION_BASE;


// Utilidades
const regexCedula = /^\d{3}-\d{6}-\d{4}[A-Z]$/;
const calcEdad = (isoDate?: string) => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};
const fmtMiles = (v: string) => v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseNum = (v?: string | number) => {
  if (typeof v === "number") return v;
  return Number((v || "").toString().replace(/,/g, "")) || 0;
};

function NuevaSolicitud() {
  const usuario = useApp((s) => s.usuario);
  const sucursal = sucursales.find((s) => s.id === usuario?.sucursal_id);
  const navigate = useNavigate();
  const { id: idEdicion } = Route.useSearch();
  const esEdicion = !!idEdicion;

  const crearExpediente = useExpedientes((s) => s.crearExpediente);
  const setSupabaseId = useExpedientes((s) => s.setSupabaseId);
  const actualizarBorrador = useExpedientes((s) => s.actualizarBorrador);
  const completarSolicitud = useExpedientes((s) => s.completarSolicitud);
  const adjuntarDocumento = useExpedientes((s) => s.adjuntarDocumento);
  const crearRemote = useExpedientesRemote((s) => s.crear);
  const cambiarEstadoRemote = useExpedientesRemote((s) => s.cambiarEstado);

  const [expedienteId, setExpedienteId] = useState<string | null>(idEdicion ?? null);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [seccion, setSeccion] = useState(1);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [seccionesConError, setSeccionesConError] = useState<Set<number>>(new Set());
  const [seccionesCompletadas, setSeccionesCompletadas] = useState<Set<number>>(new Set());
  const [scannerVisible, setScannerVisible] = useState(true);
  const creandoRef = useRef(false);

  // Modo edición: descarga el borrador existente desde la nube y lo fusiona
  // en el store local antes de editarlo.
  const { cargando: cargandoEdicion, noEncontrado } = useCargarExpediente(idEdicion ?? "");

  // Crea el expediente localmente + en Supabase en cuanto entra (solo modo nuevo)
  useEffect(() => {
    if (esEdicion || expedienteId || !usuario || creandoRef.current) return;
    creandoRef.current = true;
    (async () => {
      const idLocal = crearExpediente();
      actualizarBorrador(idLocal, {
        sucursal: sucursal?.nombre,
        asesor: usuario.nombre,
      });
      setExpedienteId(idLocal);
      const remoto = await crearRemote({
        asesorId: usuario.id,
        sucursalId: usuario.sucursal_id,
        cliente: "Nuevo cliente",
      });
      if (remoto) {
        setSupabaseId(idLocal, remoto.id);
        actualizarBorrador(idLocal, { numero_solicitud: remoto.codigo });
      } else {
        setErrorCreacion(
          "No se pudo crear el expediente en la nube. Revise su conexión e intente de nuevo.",
        );
      }
      creandoRef.current = false;
    })();
  }, [esEdicion, expedienteId, usuario, sucursal, crearExpediente, actualizarBorrador, crearRemote, setSupabaseId]);


  // Suscripción reactiva al expediente — si usáramos getExpediente() aquí
  // el componente NO se re-renderiza al teclear y los inputs parecen bloqueados.
  const exp = useExpedientes((s) => (expedienteId ? s.expedientes[expedienteId] : undefined));
  const data: SolicitudData = exp?.data ?? {};

  const setData = (patch: Partial<SolicitudData>) => {
    if (!expedienteId) return;
    actualizarBorrador(expedienteId, patch);
  };

  // Guardado automático a Supabase con debounce
  useAutosaveSolicitud(exp?.supabaseId, exp?.data);


  // Validación por sección (compartida con listado/detalle)
  const validarSeccion = (n: number): Record<string, string> =>
    validarSeccionSolicitud(data, n);


  const irSeccion = (n: number, forzar = false) => {
    if (!forzar) {
      const err = validarSeccion(seccion);
      if (Object.keys(err).length > 0) {
        setErrores(err);
        setSeccionesConError((s) => new Set(s).add(seccion));
        toast.error("Complete los campos requeridos antes de continuar");
        return;
      }
      setErrores({});
      setSeccionesCompletadas((s) => new Set(s).add(seccion));
      setSeccionesConError((s) => {
        const c = new Set(s); c.delete(seccion); return c;
      });
    }
    setSeccion(n);
  };

  // Persiste TODO el formulario en Supabase (fuente de verdad cross-device).
  const sincronizarConNube = async (): Promise<boolean> => {
    const actual = useExpedientes.getState().expedientes[expedienteId ?? ""];
    if (!actual?.supabaseId) return false;
    const d = actual.data;
    try {
      await guardarSolicitud(actual.supabaseId, d as Record<string, unknown>);
      const nombre = [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
        .filter(Boolean).join(" ").trim();
      await actualizarExpedienteHeader(actual.supabaseId, {
        cliente: nombre || null,
        cedula: d.cedula ?? null,
        tipo_producto: d.producto ?? null,
        monto_solicitado: d.monto ?? null,
        plazo_meses: d.plazo ?? null,
        actividad: d.tipo_actividad ?? null,
      });
      return true;
    } catch (e) {
      console.error("[sincronizar solicitud]", e);
      return false;
    }
  };

  const guardarBorrador = async () => {
    const ok = await sincronizarConNube();
    toast[ok ? "success" : "error"](
      ok ? "Borrador guardado en la nube ✓" : "No se pudo guardar en la nube",
    );
  };

  const enviarSolicitud = async () => {
    const todosErr: Record<string, string> = {};
    const secErr = new Set<number>();
    for (let i = 1; i <= 7; i++) {
      const e = validarSeccion(i);
      if (Object.keys(e).length > 0) {
        secErr.add(i);
        Object.assign(todosErr, e);
      }
    }
    if (secErr.size > 0) {
      setErrores(todosErr);
      setSeccionesConError(secErr);
      setSeccion(Math.min(...Array.from(secErr)));
      toast.error("Faltan campos obligatorios en secciones marcadas");
      setTimeout(() => {
        const first = document.querySelector<HTMLElement>("[data-error='true']");
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    if (!expedienteId) return;
    completarSolicitud(expedienteId);

    const supabaseId = useExpedientes.getState().expedientes[expedienteId]?.supabaseId;
    if (!supabaseId) {
      toast.error("El expediente aún no está sincronizado con la nube. Intente de nuevo.");
      return;
    }

    // Guarda todo el formulario ANTES de navegar, para que cualquier
    // usuario/dispositivo vea exactamente los mismos datos.
    const ok = await sincronizarConNube();
    if (!ok) {
      toast.error("No se pudo guardar la solicitud en la nube. Revise su conexión.");
      return;
    }
    await cambiarEstadoRemote(supabaseId, "en_revision");

    toast.success("Solicitud enviada ✓");
    navigate({ to: "/expedientes/$id", params: { id: String(supabaseId) } });
  };


  // Auto-completa desde OCR solo los campos vacíos
  const aplicarOCR = (campos: Record<string, unknown>, lado: "anverso" | "reverso") => {
    const map: Record<string, keyof SolicitudData> = {
      cedula: "cedula",
      fechaNacimiento: "fecha_nacimiento",
      sexo: "sexo",
      primerApellido: "primer_apellido",
      segundoApellido: "segundo_apellido",
      primerNombre: "primer_nombre",
      segundoNombre: "segundo_nombre",
      direccionRegistrada: "direccion_registrada",
      departamentoRegistrado: "departamento_registrado",
    };
    const patch: Partial<SolicitudData> = {};
    const auto = { ...(data.auto_campos || {}) };
    for (const [k, v] of Object.entries(campos)) {
      const campo = map[k];
      if (!campo || !v) continue;
      const actual = (data as Record<string, unknown>)[campo];
      if (actual === undefined || actual === "" || actual === null) {
        (patch as Record<string, unknown>)[campo] = v;
        auto[campo] = "auto";
      }
    }
    if (Object.keys(patch).length > 0) {
      setData({ ...patch, auto_campos: auto });
      toast.success(`Datos auto-completados (${lado})`);
    }
    void lado;
  };

  const guardarFoto = (base64: string, lado: "anverso" | "reverso") => {
    if (!expedienteId) return;
    adjuntarDocumento(expedienteId, {
      tipo: `cedula_${lado}`,
      nombre: lado === "anverso" ? "Cédula — Anverso" : "Cédula — Reverso",
      base64,
      mimeType: "image/jpeg",
      fechaCaptura: new Date().toISOString(),
    });
  };

  // Marca un campo como editado si tenía badge "auto"
  const onEditarCampo = (campo: keyof SolicitudData, valor: unknown) => {
    const auto = { ...(data.auto_campos || {}) };
    if (auto[campo as string] === "auto") auto[campo as string] = "editado";
    setData({ [campo]: valor, auto_campos: auto } as Partial<SolicitudData>);
  };

  // Progreso general (secciones completadas + activa proporcional)
  const progreso = Math.round((seccionesCompletadas.size / 7) * 100);

  const pasos: Paso[] = useMemo(
    () =>
      NOMBRES_SECCION.map((nombre, i) => ({
        num: i + 1,
        nombre,
        completado: seccionesCompletadas.has(i + 1),
        conError: seccionesConError.has(i + 1),
      })),
    [seccionesCompletadas, seccionesConError],
  );

  if (!exp) {
    return (
      <AppLayout>
        <PageHeader title={esEdicion ? "Continuar solicitud" : "Nueva solicitud"} />
        <div className="text-sm text-slate-500">
          {esEdicion && noEncontrado && !cargandoEdicion
            ? "No se encontró el borrador solicitado."
            : esEdicion
              ? "Cargando borrador desde la nube…"
              : "Preparando expediente..."}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={esEdicion ? "Continuar solicitud de crédito" : "Nueva solicitud de crédito"}
        subtitle={`N.° ${data.numero_solicitud} · ${data.fecha_solicitud}`}
      />


      {errorCreacion && (
        <div className="mb-3 rounded-lg border border-fieldcredit-red/40 bg-rose-50 p-3 text-xs text-fieldcredit-red dark:bg-rose-900/20">
          {errorCreacion}
        </div>
      )}

      <Stepper pasos={pasos} activo={seccion} onIr={(n) => irSeccion(n, true)} progreso={progreso} />


      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        {seccion === 1 && (
          <Seccion1
            data={data} setData={setData} errores={errores}
            sucursalNombre={sucursal?.nombre || "—"} asesorNombre={usuario?.nombre || "—"}
          />
        )}
        {seccion === 2 && (
          <Seccion2
            data={data} setData={setData} onEditarCampo={onEditarCampo}
            errores={errores}
            scannerVisible={scannerVisible} setScannerVisible={setScannerVisible}
            aplicarOCR={aplicarOCR} guardarFoto={guardarFoto}
          />
        )}
        {seccion === 3 && <Seccion3 data={data} setData={setData} errores={errores} />}
        {seccion === 4 && <Seccion4 data={data} setData={setData} errores={errores} />}
        {seccion === 5 && <Seccion5 data={data} setData={setData} errores={errores} />}
        {seccion === 6 && <Seccion6 data={data} setData={setData} errores={errores} />}
        {seccion === 7 && (
          <Seccion7
            data={data} setData={setData} errores={errores}
          />
        )}
      </div>

      {/* Navegación */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSeccion((n) => Math.max(1, n - 1))}
          disabled={seccion === 1}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={guardarBorrador}
            className="inline-flex items-center gap-1 rounded-md border border-fieldcredit-teal bg-white px-3 py-2 text-sm font-medium text-fieldcredit-teal-dark hover:bg-fieldcredit-teal-pale dark:bg-slate-800"
          >
            <Save size={16} /> Guardar borrador
          </button>
          {seccion < 7 ? (
            <button
              type="button"
              onClick={() => irSeccion(seccion + 1)}
              className="inline-flex items-center gap-1 rounded-md bg-fieldcredit-green px-3 py-2 text-sm font-semibold text-white hover:bg-fieldcredit-green-dark"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={enviarSolicitud}
              className="inline-flex items-center gap-1 rounded-md bg-fieldcredit-green px-4 py-2 text-sm font-semibold text-white hover:bg-fieldcredit-green-dark"
            >
              <Send size={16} /> Enviar solicitud
            </button>
          )}
        </div>
      </div>

      <AsistenteBarraCampo expediente={exp} moduloActual="solicitud" />
    </AppLayout>
  );
}

/* ============================================================
   Helpers UI reutilizables
   ============================================================ */
function Label({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
      {children} {req && <span className="text-fieldcredit-red">*</span>}
    </label>
  );
}
function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-fieldcredit-red" data-error="true">{msg}</p>;
}
const inputBase =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100";
const inputOk = "border-slate-300 focus:border-fieldcredit-green focus:ring-fieldcredit-green/30 dark:border-slate-600";
const inputErr = "border-fieldcredit-red focus:ring-fieldcredit-red/30";

function BadgeAuto({ estado }: { estado?: "auto" | "editado" }) {
  if (!estado) return null;
  if (estado === "auto")
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-fieldcredit-teal-pale px-2 py-0.5 text-[10px] font-semibold text-fieldcredit-teal-dark dark:bg-teal-900/40 dark:text-teal-200">
        Auto ✓
      </span>
    );
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-fieldcredit-amber-light px-2 py-0.5 text-[10px] font-semibold text-fieldcredit-amber dark:bg-amber-900/40 dark:text-amber-200">
      Editado ✏
    </span>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="rounded-md border border-slate-200 bg-fieldcredit-green-pale px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   SECCIÓN 1 — Institución y asesor
   ============================================================ */
function Seccion1({
  data, setData, errores, sucursalNombre, asesorNombre,
}: {
  data: SolicitudData; setData: (p: Partial<SolicitudData>) => void;
  errores: Record<string, string>; sucursalNombre: string; asesorNombre: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        1. Datos de la institución y del asesor
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadOnlyField label="Sucursal" value={sucursalNombre} />
        <ReadOnlyField label="Nombre del asesor" value={asesorNombre} />
        <ReadOnlyField label="Fecha de solicitud" value={data.fecha_solicitud || "—"} />
        <ReadOnlyField label="Número de solicitud" value={data.numero_solicitud || "—"} />
      </div>
      <div>
        <Label req>Tipo de solicitud</Label>
        <div className="flex flex-wrap gap-2">
          {tiposSolicitud.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setData({ tipo_solicitud: t })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                data.tipo_solicitud === t
                  ? "border-fieldcredit-green bg-fieldcredit-green text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-fieldcredit-green-pale dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <ErrorText msg={errores.tipo_solicitud} />
      </div>
    </div>
  );
}

/* ============================================================
   SECCIÓN 2 — Datos personales del deudor
   ============================================================ */
function Seccion2({
  data, setData, onEditarCampo, errores, scannerVisible, setScannerVisible,
  aplicarOCR, guardarFoto,
}: {
  data: SolicitudData;
  setData: (p: Partial<SolicitudData>) => void;
  onEditarCampo: (campo: keyof SolicitudData, valor: unknown) => void;
  errores: Record<string, string>;
  scannerVisible: boolean; setScannerVisible: (v: boolean) => void;
  aplicarOCR: (campos: Record<string, unknown>, lado: "anverso" | "reverso") => void;
  guardarFoto: (base64: string, lado: "anverso" | "reverso") => void;
}) {
  const edad = calcEdad(data.fecha_nacimiento);
  const cedulaValida = data.cedula ? regexCedula.test(data.cedula) : false;
  const municipios = data.departamento_residencia
    ? municipiosPorDepartamento[data.departamento_residencia] || []
    : [];
  const auto = data.auto_campos || {};

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        2. Datos personales del deudor
      </h2>

      {scannerVisible && (
        <CedulaScanner
          onCamposDetectados={aplicarOCR}
          onFotoCapturada={guardarFoto}
          onLlenarManual={() => setScannerVisible(false)}
        />
      )}

      {/* Nombres */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label req>Primer apellido <BadgeAuto estado={auto.primer_apellido as "auto" | "editado" | undefined} /></Label>
          <input
            className={cn(inputBase, errores.primer_apellido ? inputErr : inputOk)}
            value={data.primer_apellido || ""}
            onChange={(e) => onEditarCampo("primer_apellido", e.target.value)}
          />
          <ErrorText msg={errores.primer_apellido} />
        </div>
        <div>
          <Label>Segundo apellido <BadgeAuto estado={auto.segundo_apellido as "auto" | "editado" | undefined} /></Label>
          <input
            className={cn(inputBase, inputOk)}
            value={data.segundo_apellido || ""}
            onChange={(e) => onEditarCampo("segundo_apellido", e.target.value)}
          />
        </div>
        <div>
          <Label req>Primer nombre <BadgeAuto estado={auto.primer_nombre as "auto" | "editado" | undefined} /></Label>
          <input
            className={cn(inputBase, errores.primer_nombre ? inputErr : inputOk)}
            value={data.primer_nombre || ""}
            onChange={(e) => onEditarCampo("primer_nombre", e.target.value)}
          />
          <ErrorText msg={errores.primer_nombre} />
        </div>
        <div>
          <Label>Segundo nombre <BadgeAuto estado={auto.segundo_nombre as "auto" | "editado" | undefined} /></Label>
          <input
            className={cn(inputBase, inputOk)}
            value={data.segundo_nombre || ""}
            onChange={(e) => onEditarCampo("segundo_nombre", e.target.value)}
          />
        </div>
      </div>

      {/* Cédula + fecha + sexo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label req>Número de cédula <BadgeAuto estado={auto.cedula as "auto" | "editado" | undefined} /></Label>
          <div className="relative">
            <input
              placeholder="000-000000-0000X"
              className={cn(inputBase, errores.cedula ? inputErr : inputOk, "pr-8 uppercase")}
              value={data.cedula || ""}
              onChange={(e) => onEditarCampo("cedula", e.target.value.toUpperCase())}
            />
            {data.cedula && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                {cedulaValida
                  ? <Check size={16} className="text-fieldcredit-green" />
                  : <X size={16} className="text-fieldcredit-red" />}
              </span>
            )}
          </div>
          <ErrorText msg={errores.cedula} />
        </div>
        <div>
          <Label req>Fecha de nacimiento <BadgeAuto estado={auto.fecha_nacimiento as "auto" | "editado" | undefined} /></Label>
          <input
            type="date"
            className={cn(inputBase, errores.fecha_nacimiento ? inputErr : inputOk)}
            value={data.fecha_nacimiento || ""}
            onChange={(e) => onEditarCampo("fecha_nacimiento", e.target.value)}
          />
          {edad !== null && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Edad: {edad} años</p>
          )}
          <ErrorText msg={errores.fecha_nacimiento} />
        </div>
        <div>
          <Label req>Sexo <BadgeAuto estado={auto.sexo as "auto" | "editado" | undefined} /></Label>
          <div className="flex gap-3 py-2">
            {(["M", "F"] as const).map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="radio" name="sexo" checked={data.sexo === s}
                  onChange={() => onEditarCampo("sexo", s)}
                  className="accent-fieldcredit-green"
                />
                {s === "M" ? "Masculino" : "Femenino"}
              </label>
            ))}
          </div>
          <ErrorText msg={errores.sexo} />
        </div>
      </div>

      {/* Estado civil + escolaridad */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label req>Estado civil</Label>
          <select
            className={cn(inputBase, errores.estado_civil ? inputErr : inputOk)}
            value={data.estado_civil || ""}
            onChange={(e) => setData({ estado_civil: e.target.value })}
          >
            <option value="">Seleccione...</option>
            {estadosCiviles.map((v) => <option key={v}>{v}</option>)}
          </select>
          <ErrorText msg={errores.estado_civil} />
        </div>
        <div>
          <Label>Escolaridad</Label>
          <select
            className={cn(inputBase, inputOk)}
            value={data.escolaridad || ""}
            onChange={(e) => setData({ escolaridad: e.target.value })}
          >
            <option value="">Seleccione...</option>
            {escolaridades.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Contacto */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Teléfono principal</Label>
          <input placeholder="8888-0000" className={cn(inputBase, inputOk)}
            value={data.telefono || ""} onChange={(e) => setData({ telefono: e.target.value })} />
        </div>
        <div>
          <Label>Teléfono alternativo</Label>
          <input className={cn(inputBase, inputOk)}
            value={data.telefono_alt || ""} onChange={(e) => setData({ telefono_alt: e.target.value })} />
        </div>
        <div>
          <Label>Correo electrónico</Label>
          <input type="email" className={cn(inputBase, errores.correo ? inputErr : inputOk)}
            value={data.correo || ""} onChange={(e) => setData({ correo: e.target.value })} />
          <ErrorText msg={errores.correo} />
        </div>
      </div>

      {/* Ubicación */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label req>Departamento de residencia</Label>
          <select
            className={cn(inputBase, errores.departamento_residencia ? inputErr : inputOk)}
            value={data.departamento_residencia || ""}
            onChange={(e) => setData({ departamento_residencia: e.target.value, municipio_residencia: "" })}
          >
            <option value="">Seleccione...</option>
            {departamentos.map((v) => <option key={v}>{v}</option>)}
          </select>
          <ErrorText msg={errores.departamento_residencia} />
        </div>
        <div>
          <Label>Municipio de residencia</Label>
          <select
            className={cn(inputBase, inputOk)}
            value={data.municipio_residencia || ""}
            disabled={!data.departamento_residencia}
            onChange={(e) => setData({ municipio_residencia: e.target.value })}
          >
            <option value="">Seleccione...</option>
            {municipios.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label req>Dirección domiciliar</Label>
        {data.direccion_registrada && (
          <p className="mb-1 text-xs italic text-fieldcredit-teal-dark dark:text-fieldcredit-teal">
            (dirección registrada en cédula — puede diferir de la actual): {data.direccion_registrada}
          </p>
        )}
        <textarea
          rows={2}
          className={cn(inputBase, errores.direccion_domiciliar ? inputErr : inputOk)}
          value={data.direccion_domiciliar || ""}
          onChange={(e) => setData({ direccion_domiciliar: e.target.value })}
        />
        <ErrorText msg={errores.direccion_domiciliar} />
      </div>

      {/* Vivienda + dependientes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label req>Tipo de vivienda</Label>
          <div className="flex flex-wrap gap-3 py-2">
            {tiposVivienda.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                <input type="radio" name="vivienda" checked={data.tipo_vivienda === t}
                  onChange={() => setData({ tipo_vivienda: t })} className="accent-fieldcredit-green" />
                {t}
              </label>
            ))}
          </div>
          <ErrorText msg={errores.tipo_vivienda} />
        </div>
        <div>
          <Label req>Número de dependientes</Label>
          <input type="number" min={0} max={20}
            className={cn(inputBase, errores.dependientes ? inputErr : inputOk)}
            value={data.dependientes ?? ""}
            onChange={(e) => setData({ dependientes: Number(e.target.value) })}
          />
          <ErrorText msg={errores.dependientes} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SECCIÓN 3 — Actividad económica
   ============================================================ */
const PLACEHOLDER_ACT: Record<string, string> = {
  "Comercio":                "Ej: Venta de ropa y calzado en el mercado municipal de Rivas",
  "Agropecuaria":            "Ej: Producción de maíz y frijol, 5 manzanas en Teustepe, Boaco",
  "Ganadería / Pecuario":    "Ej: Crianza y venta de ganado bovino, 15 cabezas en potrero propio",
  "Mixto (Agro + Comercio)": "Ej: Pulpería familiar y 3 manzanas de café en Jinotega",
  "Servicios":               "Ej: Servicio de transporte de carga en ruta Managua-León",
  "Producción / Manufactura":"Ej: Fabricación artesanal de puros, taller en Estelí",
  "Asalariado":              "Ej: Trabajador en empresa de construcción, contrato permanente",
  "AgroResilia":             "Ej: Producción de café con sistema de riego por goteo, 8 manzanas",
  "Otra":                    "Ej: Describa detalladamente la actividad principal del solicitante",
};

// Sugerencias de destino según actividad + producto — vincula ambos campos
const DESTINOS_SUGERIDOS: Record<string, string[]> = {
  "Comercio": [
    "Capital de trabajo para compra de inventario",
    "Ampliación o remodelación del local comercial",
    "Compra de equipo o mobiliario para el negocio",
  ],
  "Agropecuaria": [
    "Compra de insumos agrícolas (semillas, fertilizantes, agroquímicos)",
    "Preparación y siembra del ciclo productivo",
    "Compra de herramientas y equipos de labranza",
    "Construcción o mejora de infraestructura productiva",
  ],
  "Ganadería / Pecuario": [
    "Compra de semovientes (ganado bovino, porcino, aves)",
    "Mejora de potreros y cercas",
    "Compra de alimento y suplementos para el ganado",
    "Construcción de corrales o instalaciones pecuarias",
  ],
  "Mixto (Agro + Comercio)": [
    "Capital de trabajo mixto (negocio + insumos agrícolas)",
    "Compra de inventario comercial y semillas para siembra",
  ],
  "Servicios": [
    "Compra o reparación de equipo para prestación del servicio",
    "Capital de trabajo para operación del negocio de servicios",
  ],
  "Producción / Manufactura": [
    "Compra de materia prima para producción",
    "Adquisición o reparación de maquinaria",
    "Capital de trabajo para ciclo productivo",
  ],
  "Asalariado": [
    "Mejoras al hogar o vivienda",
    "Gastos de educación o salud familiar",
    "Consolidación de deudas",
  ],
  "AgroResilia": [
    "Instalación de sistema de riego por goteo",
    "Construcción de cosecha de agua (reservorio / pila)",
    "Instalación de sistema fotovoltaico para bombeo",
    "Construcción de macrotúnel o casa malla para producción protegida",
    "Establecimiento de sistema agroforestal o diversificación de cultivos",
    "Instalación de secadora solar para poscosecha",
  ],
  "Otra": [],
};

function Seccion3({
  data, setData, errores,
}: { data: SolicitudData; setData: (p: Partial<SolicitudData>) => void; errores: Record<string, string> }) {
  const municipios = data.departamento_operacion
    ? municipiosPorDepartamento[data.departamento_operacion] || []
    : [];
  const esAgro = data.tipo_actividad === "Agropecuaria" || data.producto === "agroresilia";
  const esAsalariado = data.tipo_actividad === "Asalariado";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        3. Actividad económica del deudor
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label req>Tipo de actividad</Label>
          <select
            className={cn(inputBase, errores.tipo_actividad ? inputErr : inputOk)}
            value={data.tipo_actividad || ""}
            onChange={(e) => setData({ tipo_actividad: e.target.value })}
          >
            <option value="">Seleccione...</option>
            {tiposActividad.map((t) => <option key={t}>{t}</option>)}
          </select>
          <ErrorText msg={errores.tipo_actividad} />
        </div>
        <div>
          <Label>Nombre del negocio</Label>
          <input
            disabled={esAsalariado}
            className={cn(inputBase, inputOk, esAsalariado && "opacity-50")}
            value={data.nombre_negocio || ""}
            onChange={(e) => setData({ nombre_negocio: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label req>Descripción de la actividad</Label>
        <textarea
          rows={3}
          placeholder={PLACEHOLDER_ACT[data.tipo_actividad || ""] || "Describa la actividad económica"}
          className={cn(inputBase, errores.descripcion_actividad ? inputErr : inputOk)}
          value={data.descripcion_actividad || ""}
          onChange={(e) => setData({ descripcion_actividad: e.target.value })}
        />
        <ErrorText msg={errores.descripcion_actividad} />
      </div>

      <div>
        <Label req>Antigüedad</Label>
        <div className="flex gap-2">
          <input type="number" min={0} placeholder="Años" className={cn(inputBase, inputOk)}
            value={data.antiguedad_anios ?? ""} onChange={(e) => setData({ antiguedad_anios: Number(e.target.value) })} />
          <input type="number" min={0} max={11} placeholder="Meses" className={cn(inputBase, inputOk)}
            value={data.antiguedad_meses ?? ""} onChange={(e) => setData({ antiguedad_meses: Number(e.target.value) })} />
        </div>
        <ErrorText msg={errores.antiguedad} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label req>Departamento donde opera</Label>
          <select
            className={cn(inputBase, errores.departamento_operacion ? inputErr : inputOk)}
            value={data.departamento_operacion || ""}
            onChange={(e) => setData({ departamento_operacion: e.target.value, municipio_operacion: "" })}
          >
            <option value="">Seleccione...</option>
            {departamentos.map((v) => <option key={v}>{v}</option>)}
          </select>
          <ErrorText msg={errores.departamento_operacion} />
        </div>
        <div>
          <Label>Municipio donde opera</Label>
          <select className={cn(inputBase, inputOk)} disabled={!data.departamento_operacion}
            value={data.municipio_operacion || ""}
            onChange={(e) => setData({ municipio_operacion: e.target.value })}
          >
            <option value="">Seleccione...</option>
            {municipios.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>Dirección del negocio</Label>
        <textarea rows={2} className={cn(inputBase, inputOk)}
          value={data.direccion_negocio || ""} onChange={(e) => setData({ direccion_negocio: e.target.value })} />
      </div>

      <div>
        <Label>¿Tiene local propio?</Label>
        <div className="flex gap-4 py-1">
          {(["si", "no"] as const).map((v) => (
            <label key={v} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
              <input type="radio" name="local" checked={data.local_propio === v}
                onChange={() => setData({ local_propio: v })} className="accent-fieldcredit-green" />
              {v === "si" ? "Sí" : "No"}
            </label>
          ))}
        </div>
      </div>

      {esAgro && (
        <div className="space-y-3 rounded-lg border border-fieldcredit-green-light bg-fieldcredit-green-pale p-3 dark:bg-slate-900/50">
          <h3 className="text-sm font-semibold text-fieldcredit-green-dark dark:text-fieldcredit-green">Actividad agropecuaria</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Cultivos principales</Label>
              <input placeholder="Ej: Maíz, frijol, sorgo" className={cn(inputBase, inputOk)}
                value={data.cultivos || ""} onChange={(e) => setData({ cultivos: e.target.value })} />
            </div>
            <div>
              <Label>Hectáreas / manzanas</Label>
              <input type="number" min={0} className={cn(inputBase, inputOk)}
                value={data.hectareas ?? ""} onChange={(e) => setData({ hectareas: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Ciclo productivo</Label>
              <select className={cn(inputBase, inputOk)}
                value={data.ciclo_productivo || ""} onChange={(e) => setData({ ciclo_productivo: e.target.value })}>
                <option value="">Seleccione...</option>
                {ciclosProductivos.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {esAsalariado && (
        <div className="space-y-3 rounded-lg border border-fieldcredit-teal-light bg-fieldcredit-teal-pale p-3 dark:bg-slate-900/50">
          <h3 className="text-sm font-semibold text-fieldcredit-teal-dark dark:text-fieldcredit-teal">Datos de empleo</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nombre del empleador</Label>
              <input className={cn(inputBase, inputOk)}
                value={data.empleador || ""} onChange={(e) => setData({ empleador: e.target.value })} />
            </div>
            <div>
              <Label>Cargo o puesto</Label>
              <input className={cn(inputBase, inputOk)}
                value={data.cargo || ""} onChange={(e) => setData({ cargo: e.target.value })} />
            </div>
            <div>
              <Label>Salario mensual bruto (C$)</Label>
              <input type="number" min={0} className={cn(inputBase, inputOk)}
                value={data.salario ?? ""} onChange={(e) => setData({ salario: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Tiempo de laborar</Label>
              <div className="flex gap-2">
                <input type="number" min={0} placeholder="Años" className={cn(inputBase, inputOk)}
                  value={data.laborar_anios ?? ""} onChange={(e) => setData({ laborar_anios: Number(e.target.value) })} />
                <input type="number" min={0} max={11} placeholder="Meses" className={cn(inputBase, inputOk)}
                  value={data.laborar_meses ?? ""} onChange={(e) => setData({ laborar_meses: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SECCIÓN 4 — Datos del crédito
   ============================================================ */
function Seccion4({
  data, setData, errores,
}: { data: SolicitudData; setData: (p: Partial<SolicitudData>) => void; errores: Record<string, string> }) {
  const [montoStr, setMontoStr] = useState(() => (data.monto ? fmtMiles(String(data.monto)) : ""));
  useEffect(() => {
    if (data.monto && !montoStr) setMontoStr(fmtMiles(String(data.monto)));
  }, [data.monto, montoStr]);
  const usd = data.monto ? (data.monto / 36.5).toFixed(2) : "0.00";
  const cuota = data.monto && data.plazo ? Math.round(data.monto / data.plazo) : 0;
  const esAgroResilia = data.producto === "agroresilia";

  const agregarDeuda = () => setData({
    deudas: [...(data.deudas || []), { institucion: "", saldo: 0, cuota: 0 }],
  });
  const eliminarDeuda = (i: number) => setData({
    deudas: (data.deudas || []).filter((_, idx) => idx !== i),
  });
  const editarDeuda = (i: number, patch: Partial<{ institucion: string; saldo: number; cuota: number }>) => {
    const arr = [...(data.deudas || [])];
    arr[i] = { ...arr[i], ...patch };
    setData({ deudas: arr });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        4. Datos del crédito solicitado
      </h2>

      <div>
        <Label req>Producto</Label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {productosCredito.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setData({ producto: p.id })}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-3 text-left transition-colors",
                data.producto === p.id
                  ? "border-fieldcredit-green bg-fieldcredit-green-pale dark:bg-slate-900/60"
                  : "border-slate-200 bg-white hover:border-fieldcredit-green dark:border-slate-700 dark:bg-slate-800",
              )}
            >
              <span className="text-lg">{p.icono}</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.nombre}</span>
            </button>
          ))}
        </div>
        <ErrorText msg={errores.producto} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label req>Monto solicitado (C$)</Label>
          <input
            inputMode="numeric"
            className={cn(inputBase, errores.monto ? inputErr : inputOk)}
            value={montoStr}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setMontoStr(fmtMiles(raw));
              setData({ monto: parseNum(raw) });
            }}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">≈ USD {usd}</p>
          <ErrorText msg={errores.monto} />
        </div>
        <div>
          <Label req>Plazo</Label>
          <select className={cn(inputBase, errores.plazo ? inputErr : inputOk)}
            value={data.plazo ?? ""} onChange={(e) => setData({ plazo: Number(e.target.value) })}>
            <option value="">Seleccione...</option>
            {plazos.map((p) => <option key={p} value={p}>{p} meses</option>)}
          </select>
          <ErrorText msg={errores.plazo} />
        </div>
        <div>
          <Label req>Frecuencia de pago</Label>
          <select className={cn(inputBase, errores.frecuencia_pago ? inputErr : inputOk)}
            value={data.frecuencia_pago || ""} onChange={(e) => setData({ frecuencia_pago: e.target.value })}>
            <option value="">Seleccione...</option>
            {frecuenciasPago.map((f) => <option key={f}>{f}</option>)}
          </select>
          <ErrorText msg={errores.frecuencia_pago} />
        </div>
      </div>

      <div className="rounded-lg bg-fieldcredit-teal-pale p-3 text-sm dark:bg-slate-900/60">
        <p className="font-semibold text-fieldcredit-teal-dark dark:text-fieldcredit-teal">
          Cuota estimada: C$ {cuota.toLocaleString("es-NI")}/{data.frecuencia_pago === "Mensual" || !data.frecuencia_pago ? "mes" : "período"}
        </p>
        <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-400">
          Estimación referencial. La cuota final la determina el comité.
        </p>
      </div>

      <div>
        <Label req>Destino del crédito</Label>
        {/* Sugerencias dinámicas según actividad y producto */}
        {(() => {
          const actKey = data.producto === "agroresilia" ? "AgroResilia" : (data.tipo_actividad || "");
          const sugerencias = DESTINOS_SUGERIDOS[actKey] || [];
          return sugerencias.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {sugerencias.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setData({ destino: s })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    data.destino === s
                      ? "border-fieldcredit-green bg-fieldcredit-green text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-fieldcredit-green hover:text-fieldcredit-green dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null;
        })()}
        <textarea rows={3}
          placeholder="Describí el destino específico del crédito..."
          className={cn(inputBase, errores.destino ? inputErr : inputOk)}
          value={data.destino || ""} onChange={(e) => setData({ destino: e.target.value })} />
        <p className="mt-1 text-xs text-slate-400">
          El destino debe coincidir con la actividad económica declarada.
          Seleccioná una sugerencia o escribí libremente.
        </p>
        <ErrorText msg={errores.destino} />
      </div>

      {/* Período de gracia */}
      <ToggleRow
        activo={!!data.periodo_gracia}
        onToggle={(v) => setData({ periodo_gracia: v })}
        label="¿Solicita período de gracia?"
      >
        {data.periodo_gracia && (
          <div className="mt-2">
            <Label>Meses de gracia (máx. 4)</Label>
            <select className={cn(inputBase, inputOk, "max-w-[120px]")}
              value={data.meses_gracia ?? 1} onChange={(e) => setData({ meses_gracia: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </ToggleRow>

      {/* Deudas */}
      <ToggleRow
        activo={!!data.tiene_deudas}
        onToggle={(v) => setData({ tiene_deudas: v })}
        label="¿Tiene deudas con otras instituciones?"
      >
        {data.tiene_deudas && (
          <div className="mt-2 space-y-2">
            {(data.deudas || []).map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-700 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
                <input placeholder="Institución" className={cn(inputBase, inputOk)}
                  value={d.institucion} onChange={(e) => editarDeuda(i, { institucion: e.target.value })} />
                <input type="number" placeholder="Saldo" className={cn(inputBase, inputOk)}
                  value={d.saldo || ""} onChange={(e) => editarDeuda(i, { saldo: Number(e.target.value) })} />
                <input type="number" placeholder="Cuota" className={cn(inputBase, inputOk)}
                  value={d.cuota || ""} onChange={(e) => editarDeuda(i, { cuota: Number(e.target.value) })} />
                <button type="button" onClick={() => eliminarDeuda(i)}
                  className="grid place-items-center rounded-md p-2 text-fieldcredit-red hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={agregarDeuda}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-fieldcredit-green px-3 py-1.5 text-xs font-medium text-fieldcredit-green-dark hover:bg-fieldcredit-green-pale dark:text-fieldcredit-green">
              <Plus size={14} /> Agregar institución
            </button>
          </div>
        )}
      </ToggleRow>

      {esAgroResilia && (
        <div className="space-y-3 rounded-lg border border-fieldcredit-teal-light bg-fieldcredit-teal-pale p-3 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold text-fieldcredit-teal-dark dark:text-fieldcredit-teal">🌿 AgroResilia</h3>
          <div>
            <Label>Línea AgroResilia</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {lineasAgroResilia.map((l) => (
                <button key={l.id} type="button"
                  onClick={() => setData({ linea_agroresilia: l.id })}
                  className={cn(
                    "rounded-md border p-2 text-left text-xs transition-colors",
                    data.linea_agroresilia === l.id
                      ? "border-fieldcredit-teal bg-white dark:bg-slate-800"
                      : "border-slate-200 bg-white/50 hover:border-fieldcredit-teal dark:border-slate-700 dark:bg-slate-800/50",
                  )}>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{l.nombre}</div>
                  <div className="text-slate-600 dark:text-slate-400">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tipo de tecnología a adquirir</Label>
              <input className={cn(inputBase, inputOk)}
                value={data.tecnologia_agroresilia || ""}
                onChange={(e) => setData({ tecnologia_agroresilia: e.target.value })} />
            </div>
            <div>
              <Label>Cultivo principal beneficiado</Label>
              <input className={cn(inputBase, inputOk)}
                value={data.cultivo_beneficiado || ""}
                onChange={(e) => setData({ cultivo_beneficiado: e.target.value })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  activo, onToggle, label, children,
}: {
  activo: boolean; onToggle: (v: boolean) => void; label: string; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <label className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
        <button
          type="button"
          onClick={() => onToggle(!activo)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            activo ? "bg-fieldcredit-green" : "bg-slate-300 dark:bg-slate-600",
          )}
        >
          <span className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
            activo ? "translate-x-5" : "translate-x-1",
          )} />
        </button>
      </label>
      {children}
    </div>
  );
}

/* ============================================================
   SECCIÓN 5 — Fiador
   ============================================================ */
function Seccion5({
  data, setData, errores,
}: { data: SolicitudData; setData: (p: Partial<SolicitudData>) => void; errores: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">5. Fiador</h2>
      <ToggleRow
        activo={!!data.aplica_fiador}
        onToggle={(v) => setData({ aplica_fiador: v })}
        label="¿Aplica fiador?"
      />
      {!data.aplica_fiador ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
          Esta sección no aplica. Puede continuar.
        </p>
      ) : (
        <>
          <div>
            <Label req>Relación del fiador con el deudor</Label>
            <select
              className={cn(inputBase, errores.relacion_fiador ? inputErr : inputOk)}
              value={data.relacion_fiador || ""}
              onChange={(e) => setData({ relacion_fiador: e.target.value })}
            >
              <option value="">Seleccione...</option>
              {relacionesFiador.map((r) => <option key={r}>{r}</option>)}
            </select>
            <ErrorText msg={errores.relacion_fiador} />
          </div>
          <p className="rounded-md bg-fieldcredit-teal-pale p-3 text-xs text-fieldcredit-teal-dark dark:bg-slate-900/50 dark:text-fieldcredit-teal">
            📋 Los datos completos del fiador se llenarán en el módulo "Perfil del Fiador" del expediente, después de completar esta solicitud.
          </p>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SECCIÓN 6 — Garantías
   ============================================================ */
function Seccion6({
  data, setData, errores,
}: { data: SolicitudData; setData: (p: Partial<SolicitudData>) => void; errores: Record<string, string> }) {
  const seleccion = data.tipos_garantia || [];
  const toggle = (id: string) => {
    const s = seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id];
    setData({ tipos_garantia: s });
  };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">6. Garantías</h2>
      <ToggleRow
        activo={!!data.aplica_garantia}
        onToggle={(v) => setData({ aplica_garantia: v })}
        label="¿El crédito requiere garantía?"
      />
      {data.aplica_garantia && (
        <>
          <div className="space-y-2">
            {tiposGarantia.map((g) => {
              const checked = seleccion.includes(g.id);
              return (
                <label key={g.id} className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                  checked
                    ? "border-fieldcredit-green bg-fieldcredit-green-pale dark:bg-slate-900/60"
                    : "border-slate-200 bg-white hover:border-fieldcredit-green dark:border-slate-700 dark:bg-slate-800",
                )}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(g.id)}
                    className="mt-0.5 accent-fieldcredit-green" />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{g.label}</div>
                    {checked && (
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{g.nota}</div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <ErrorText msg={errores.tipos_garantia} />
          <p className="rounded-md bg-fieldcredit-amber-light p-3 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            ⚠️ El detalle completo de garantías se registra en el módulo "Análisis de Garantías" del expediente.
          </p>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SECCIÓN 7 — Declaración y firma
   ============================================================ */
function Seccion7({
  data, setData, errores,
}: { data: SolicitudData; setData: (p: Partial<SolicitudData>) => void; errores: Record<string, string> }) {
  const nombre = [data.primer_nombre, data.segundo_nombre, data.primer_apellido, data.segundo_apellido]
    .filter(Boolean).join(" ") || "—";
  const producto = productosCredito.find((p) => p.id === data.producto)?.nombre || "—";
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">7. Declaración y firma</h2>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/50">
        <div className="grid gap-1 sm:grid-cols-2">
          <p><span className="text-slate-500">Solicitante:</span> <b>{nombre}</b></p>
          <p><span className="text-slate-500">Cédula:</span> <b>{data.cedula || "—"}</b></p>
          <p><span className="text-slate-500">Producto:</span> <b>{producto}</b></p>
          <p><span className="text-slate-500">Monto:</span> <b>C$ {(data.monto || 0).toLocaleString("es-NI")}</b></p>
          <p><span className="text-slate-500">Plazo:</span> <b>{data.plazo || "—"} meses</b></p>
          <p><span className="text-slate-500">Frecuencia:</span> <b>{data.frecuencia_pago || "—"}</b></p>
        </div>
      </div>

      <p className="rounded-md bg-fieldcredit-green-pale p-3 text-sm italic text-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
        Yo, <b>{nombre}</b>, con cédula <b>{data.cedula || "—"}</b>, declaro que toda la información
        proporcionada es verídica y completa. Autorizo a MiCrédito a verificar los datos y consultar
        mi historial crediticio.
      </p>

      <div>
        <Label req>Firma digital</Label>
        <SignaturePad
          valorInicial={data.firma_digital}
          onChange={(v) => setData({ firma_digital: v || undefined })}
        />
        <ErrorText msg={errores.firma_digital} />
      </div>
    </div>
  );
}
