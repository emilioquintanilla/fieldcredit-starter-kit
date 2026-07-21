// Módulo Perfil del Fiador — 4 subsecciones con guardado automático
import { useEffect, useMemo, useState } from "react";
import { Trash2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CedulaScanner } from "@/components/CedulaScanner";
import { Stepper } from "@/components/Stepper";
import {
  useExpedientes,
  type FiadorData,
} from "@/stores/expedientes";
import { departamentos, municipiosPorDepartamento } from "@/data/municipios";
import {
  estadosCiviles, escolaridades, tiposVivienda, relacionesFiador,
} from "@/data/catalogos";
import {
  tiposActividadFiador, tiposIngresoFiador, tiposEgresoFiador,
} from "@/data/fiador-garantias";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmtC = (n: number) => `C$ ${n.toLocaleString("es-NI")}`;
const cedulaOk = (c?: string) => !!c && /^\d{3}-\d{6}-\d{4}[A-Z]$/i.test(c);
const edad = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(+d)) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 86400_000));
};

interface Props {
  expedienteId: string;
  cuotaDeudor: number;
}

export function FiadorModule({ expedienteId, cuotaDeudor }: Props) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const actualizarFiador = useExpedientes((s) => s.actualizarFiador);
  const agregarIngreso = useExpedientes((s) => s.agregarIngresoFiador);
  const eliminarIngreso = useExpedientes((s) => s.eliminarIngresoFiador);
  const agregarEgreso = useExpedientes((s) => s.agregarEgresoFiador);
  const eliminarEgreso = useExpedientes((s) => s.eliminarEgresoFiador);
  const adjuntar = useExpedientes((s) => s.adjuntarDocumento);
  const [paso, setPaso] = useState(0);

  const fiador: FiadorData = exp?.fiador ?? { ingresos: [], egresos: [] };

  // Autoguardado cada 30s (mera notificación — Zustand ya persiste in-memory)
  useEffect(() => {
    const t = setInterval(() => {
      if (exp?.fiador) toast.success("Fiador — guardado automático", { duration: 1200 });
    }, 30000);
    return () => clearInterval(t);
  }, [exp?.fiador]);

  const set = (patch: Partial<FiadorData>) => actualizarFiador(expedienteId, patch);
  const marcarEditado = (campo: string) =>
    actualizarFiador(expedienteId, { auto_campos: { [campo]: "editado" } });

  const municipios = fiador.departamento ? municipiosPorDepartamento[fiador.departamento] ?? [] : [];

  // Totales ingresos / egresos
  const totalIngresos = fiador.ingresos.reduce((a, x) => a + (x.monto || 0), 0);
  const totalEgresos = fiador.egresos.reduce((a, x) => a + (x.monto || 0), 0);
  const ingresoNeto = totalIngresos - totalEgresos;
  const indice = cuotaDeudor > 0 ? (ingresoNeto / cuotaDeudor) * 100 : 0;

  const semaforo = useMemo(() => {
    if (indice >= 150) return { cls: "bg-fieldcredit-green-light text-fieldcredit-green-dark dark:bg-green-900/40 dark:text-green-200", label: "Capacidad suficiente", icon: "✅" };
    if (indice >= 100) return { cls: "bg-fieldcredit-amber-light text-fieldcredit-amber dark:bg-amber-900/40 dark:text-amber-300", label: "Capacidad ajustada — revisar en comité", icon: "⚠️" };
    return { cls: "bg-fieldcredit-red-light text-fieldcredit-red dark:bg-red-900/40 dark:text-red-300", label: "Capacidad insuficiente", icon: "❌" };
  }, [indice]);

  if (!exp?.data.aplica_fiador) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        El fiador no aplica para esta solicitud.
      </div>
    );
  }

  const secciones = ["Datos personales", "Actividad económica", "Ingresos", "Egresos"];
  const errores = [
    !(fiador.primer_apellido && fiador.primer_nombre && cedulaOk(fiador.cedula) && fiador.fecha_nacimiento && fiador.sexo && fiador.estado_civil && fiador.departamento && fiador.direccion && fiador.relacion_deudor),
    !(fiador.tipo_actividad && (fiador.descripcion_actividad?.length ?? 0) >= 15),
    !(fiador.ingresos.some((i) => i.monto > 0)),
    !(fiador.egresos.some((e) => e.monto > 0)),
  ];
  const pasosStepper = secciones.map((nombre, i) => ({
    num: i,
    nombre,
    completado: !errores[i],
    conError: false,
  }));
  const progreso = Math.round((pasosStepper.filter((p) => p.completado).length / pasosStepper.length) * 100);

  return (
    <div className="space-y-4">
      <Stepper
        pasos={pasosStepper}
        activo={paso}
        onIr={setPaso}
        progreso={progreso}
      />


      {paso === 0 && (
        <DatosPersonales
          fiador={fiador}
          set={set}
          marcarEditado={marcarEditado}
          municipios={municipios}
          onOcr={(campos, lado) => {
            const patch: Partial<FiadorData> = {};
            const auto: Record<string, "auto" | "editado"> = {};
            const map: Record<string, keyof FiadorData> = {
              cedula: "cedula", fechaNacimiento: "fecha_nacimiento", sexo: "sexo",
              primerApellido: "primer_apellido", segundoApellido: "segundo_apellido",
              primerNombre: "primer_nombre", segundoNombre: "segundo_nombre",
              direccionRegistrada: "direccion", departamentoRegistrado: "departamento",
            };
            for (const [k, v] of Object.entries(campos)) {
              const target = map[k];
              if (target && v != null) {
                (patch as Record<string, unknown>)[target] = v;
                auto[target] = "auto";
              }
            }
            void lado;
            set({ ...patch, auto_campos: auto });
          }}
          onFoto={(base64, lado) => {
            adjuntar(expedienteId, {
              tipo: `cedula_fiador_${lado}`,
              nombre: `Cédula fiador — ${lado}`,
              base64, mimeType: "image/jpeg", fechaCaptura: new Date().toISOString(),
            });
          }}
        />
      )}

      {paso === 1 && <ActividadEconomica fiador={fiador} set={set} />}

      {paso === 2 && (
        <IngresosSection
          items={fiador.ingresos}
          onAdd={(x) => agregarIngreso(expedienteId, x)}
          onDel={(id) => eliminarIngreso(expedienteId, id)}
          total={totalIngresos}
        />
      )}

      {paso === 3 && (
        <EgresosSection
          items={fiador.egresos}
          onAdd={(x) => agregarEgreso(expedienteId, x)}
          onDel={(id) => eliminarEgreso(expedienteId, id)}
          total={totalEgresos}
        />
      )}

      {/* Panel de capacidad — visible siempre que haya ingresos o egresos */}
      {(totalIngresos > 0 || totalEgresos > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Resumen de capacidad del fiador
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Row k="Total ingresos/mes" v={fmtC(totalIngresos)} />
            <Row k="Total egresos/mes" v={fmtC(totalEgresos)} />
            <Row k="Ingreso neto" v={fmtC(ingresoNeto)} strong />
            <Row k="Cuota del deudor" v={fmtC(cuotaDeudor)} />
          </dl>
          <div className={cn("mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold", semaforo.cls)}>
            <span>Índice de cobertura</span>
            <span>{indice.toFixed(0)}% {semaforo.icon}</span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{semaforo.label}</p>
          {indice < 150 && (
            <div className="mt-3 flex gap-2 rounded-lg bg-fieldcredit-amber-light p-3 text-xs text-fieldcredit-amber dark:bg-amber-900/30 dark:text-amber-200">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>El índice de cobertura del fiador es menor al 150% recomendado. El comité de crédito evaluará si es suficiente para respaldar el crédito.</span>
            </div>
          )}
        </div>
      )}

      <DocumentosFiador expedienteId={expedienteId} tipoActividad={fiador.tipo_actividad} />
    </div>
  );
}

/* -------- Subsecciones -------- */

function DatosPersonales({
  fiador, set, marcarEditado, municipios, onOcr, onFoto,
}: {
  fiador: FiadorData;
  set: (p: Partial<FiadorData>) => void;
  marcarEditado: (campo: string) => void;
  municipios: string[];
  onOcr: (campos: Record<string, unknown>, lado: "anverso" | "reverso") => void;
  onFoto: (base64: string, lado: "anverso" | "reverso") => void;
}) {
  const auto = fiador.auto_campos || {};
  const badge = (c: string) =>
    auto[c] === "auto" ? (
      <span className="ml-2 rounded-full bg-fieldcredit-green-light px-1.5 py-0.5 text-[10px] font-semibold text-fieldcredit-green-dark dark:bg-green-900/40 dark:text-green-200">Auto ✓</span>
    ) : auto[c] === "editado" ? (
      <span className="ml-2 rounded-full bg-fieldcredit-amber-light px-1.5 py-0.5 text-[10px] font-semibold text-fieldcredit-amber dark:bg-amber-900/40 dark:text-amber-200">Editado</span>
    ) : null;

  const onChange = (campo: keyof FiadorData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    set({ [campo]: e.target.value } as Partial<FiadorData>);
    if (auto[campo] === "auto") marcarEditado(campo as string);
  };

  return (
    <div className="space-y-4">
      <CedulaScanner
        onCamposDetectados={onOcr}
        onFotoCapturada={onFoto}
        onLlenarManual={() => {}}
      />

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800">
        <Field label={<>Primer apellido {badge("primer_apellido")}</>}>
          <input className={inp} value={fiador.primer_apellido || ""} onChange={onChange("primer_apellido")} />
        </Field>
        <Field label="Segundo apellido">
          <input className={inp} value={fiador.segundo_apellido || ""} onChange={onChange("segundo_apellido")} />
        </Field>
        <Field label={<>Primer nombre {badge("primer_nombre")}</>}>
          <input className={inp} value={fiador.primer_nombre || ""} onChange={onChange("primer_nombre")} />
        </Field>
        <Field label="Segundo nombre">
          <input className={inp} value={fiador.segundo_nombre || ""} onChange={onChange("segundo_nombre")} />
        </Field>
        <Field label={<>Cédula {badge("cedula")}</>} error={fiador.cedula && !cedulaOk(fiador.cedula) ? "Formato 000-000000-0000X" : undefined}>
          <input className={inp} placeholder="000-000000-0000X" value={fiador.cedula || ""} onChange={onChange("cedula")} />
        </Field>
        <Field label={<>Fecha de nacimiento {badge("fecha_nacimiento")} {edad(fiador.fecha_nacimiento) != null && <span className="ml-1 text-xs text-slate-500">({edad(fiador.fecha_nacimiento)} años)</span>}</>}>
          <input type="date" className={inp} value={fiador.fecha_nacimiento || ""} onChange={onChange("fecha_nacimiento")} />
        </Field>
        <Field label={<>Sexo {badge("sexo")}</>}>
          <div className="flex gap-3 pt-1 text-sm">
            {["M", "F"].map((s) => (
              <label key={s} className="flex items-center gap-1">
                <input type="radio" name="sexo_f" checked={fiador.sexo === s} onChange={() => set({ sexo: s as "M" | "F" })} />
                {s === "M" ? "Masculino" : "Femenino"}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Estado civil">
          <select className={inp} value={fiador.estado_civil || ""} onChange={onChange("estado_civil")}>
            <option value="">Seleccionar…</option>
            {estadosCiviles.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Escolaridad">
          <select className={inp} value={fiador.escolaridad || ""} onChange={onChange("escolaridad")}>
            <option value="">Seleccionar…</option>
            {escolaridades.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Teléfono principal">
          <input className={inp} value={fiador.telefono || ""} onChange={onChange("telefono")} />
        </Field>
        <Field label="Teléfono alternativo (opcional)">
          <input className={inp} value={fiador.telefono_alt || ""} onChange={onChange("telefono_alt")} />
        </Field>
        <Field label="Correo (opcional)">
          <input type="email" className={inp} value={fiador.correo || ""} onChange={onChange("correo")} />
        </Field>
        <Field label={<>Departamento {badge("departamento")}</>}>
          <select className={inp} value={fiador.departamento || ""} onChange={(e) => set({ departamento: e.target.value, municipio: "" })}>
            <option value="">Seleccionar…</option>
            {departamentos.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Municipio">
          <select className={inp} value={fiador.municipio || ""} onChange={onChange("municipio")} disabled={!municipios.length}>
            <option value="">Seleccionar…</option>
            {municipios.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Dirección domiciliar" full>
          <textarea rows={2} className={inp} value={fiador.direccion || ""} onChange={onChange("direccion")} />
        </Field>
        <Field label="Tipo de vivienda">
          <div className="flex gap-3 pt-1 text-sm">
            {tiposVivienda.map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="radio" name="viv_f" checked={fiador.tipo_vivienda === t} onChange={() => set({ tipo_vivienda: t })} />
                {t}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Dependientes económicos">
          <input type="number" min={0} max={20} className={inp} value={fiador.dependientes ?? ""} onChange={(e) => set({ dependientes: Number(e.target.value) })} />
        </Field>
        <Field label="Relación con el deudor">
          <select className={inp} value={fiador.relacion_deudor || ""} onChange={onChange("relacion_deudor")}>
            <option value="">Seleccionar…</option>
            {relacionesFiador.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
    </div>
  );
}

function ActividadEconomica({ fiador, set }: { fiador: FiadorData; set: (p: Partial<FiadorData>) => void }) {
  const esAsalariado = fiador.tipo_actividad === "Asalariado" || fiador.tipo_actividad === "Pensionado";
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800">
      <Field label="Tipo de actividad">
        <select className={inp} value={fiador.tipo_actividad || ""} onChange={(e) => set({ tipo_actividad: e.target.value })}>
          <option value="">Seleccionar…</option>
          {tiposActividadFiador.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Nombre del negocio / empleador">
        <input className={inp} value={fiador.nombre_negocio || ""} onChange={(e) => set({ nombre_negocio: e.target.value })} />
      </Field>
      <Field label="Descripción de la actividad (mín. 15 chars)" full
        error={fiador.descripcion_actividad && fiador.descripcion_actividad.length < 15 ? "Mínimo 15 caracteres" : undefined}>
        <textarea rows={2} className={inp} value={fiador.descripcion_actividad || ""} onChange={(e) => set({ descripcion_actividad: e.target.value })} />
      </Field>
      <Field label="Antigüedad — años">
        <input type="number" min={0} className={inp} value={fiador.antiguedad_anios ?? ""} onChange={(e) => set({ antiguedad_anios: Number(e.target.value) })} />
      </Field>
      <Field label="Antigüedad — meses">
        <input type="number" min={0} max={11} className={inp} value={fiador.antiguedad_meses ?? ""} onChange={(e) => set({ antiguedad_meses: Number(e.target.value) })} />
      </Field>
      <Field label="Dirección del trabajo / negocio" full>
        <textarea rows={2} className={inp} value={fiador.direccion_trabajo || ""} onChange={(e) => set({ direccion_trabajo: e.target.value })} />
      </Field>
      {esAsalariado && (
        <>
          <Field label="Cargo o puesto">
            <input className={inp} value={fiador.cargo || ""} onChange={(e) => set({ cargo: e.target.value })} />
          </Field>
          <Field label="Salario / pensión mensual (C$)">
            <input type="number" className={inp} value={fiador.salario ?? ""} onChange={(e) => set({ salario: Number(e.target.value) })} />
          </Field>
          <Field label="Tiempo de laborar — años">
            <input type="number" min={0} className={inp} value={fiador.laborar_anios ?? ""} onChange={(e) => set({ laborar_anios: Number(e.target.value) })} />
          </Field>
          <Field label="Tiempo de laborar — meses">
            <input type="number" min={0} max={11} className={inp} value={fiador.laborar_meses ?? ""} onChange={(e) => set({ laborar_meses: Number(e.target.value) })} />
          </Field>
        </>
      )}
    </div>
  );
}

function IngresosSection({
  items, onAdd, onDel, total,
}: {
  items: { id: string; tipo: string; descripcion: string; monto: number }[];
  onAdd: (x: { tipo: string; descripcion: string; monto: number }) => void;
  onDel: (id: string) => void;
  total: number;
}) {
  return (
    <TablaMontos
      titulo="Ingresos del fiador"
      nota="💡 Registra TODOS los ingresos del fiador, no solo el principal. Esto determina su capacidad real de respaldo al crédito."
      colTipo="Tipo de ingreso"
      opciones={tiposIngresoFiador as readonly string[]}
      items={items}
      onAdd={onAdd}
      onDel={onDel}
      totalLabel="Total ingresos mensuales del fiador"
      total={total}
      totalCls="bg-fieldcredit-green-pale dark:bg-slate-800"
    />
  );
}

function EgresosSection({
  items, onAdd, onDel, total,
}: {
  items: { id: string; tipo: string; descripcion: string; monto: number }[];
  onAdd: (x: { tipo: string; descripcion: string; monto: number }) => void;
  onDel: (id: string) => void;
  total: number;
}) {
  return (
    <TablaMontos
      titulo="Egresos del fiador"
      nota="Registra todos los egresos habituales del fiador (mensuales)."
      colTipo="Tipo de egreso"
      opciones={tiposEgresoFiador as readonly string[]}
      items={items}
      onAdd={onAdd}
      onDel={onDel}
      totalLabel="Total egresos mensuales del fiador"
      total={total}
      totalCls="bg-fieldcredit-amber-light dark:bg-slate-800"
    />
  );
}

function TablaMontos({
  titulo, nota, colTipo, opciones, items, onAdd, onDel, totalLabel, total, totalCls,
}: {
  titulo: string;
  nota: string;
  colTipo: string;
  opciones: readonly string[];
  items: { id: string; tipo: string; descripcion: string; monto: number }[];
  onAdd: (x: { tipo: string; descripcion: string; monto: number }) => void;
  onDel: (id: string) => void;
  totalLabel: string;
  total: number;
  totalCls: string;
}) {
  const [tipo, setTipo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState<number | "">("");

  const agregar = () => {
    if (!tipo || !monto || Number(monto) <= 0) {
      toast.error("Complete tipo y monto (> 0)");
      return;
    }
    onAdd({ tipo, descripcion, monto: Number(monto) });
    setTipo(""); setDescripcion(""); setMonto("");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</h3>
      <p className="mb-3 mt-1 text-xs text-slate-600 dark:text-slate-400">{nota}</p>

      {/* Filas guardadas */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-1 pr-2">{colTipo}</th>
              <th className="py-1 pr-2">Descripción</th>
              <th className="py-1 pr-2 text-right">C$/mes</th>
              <th className="py-1 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-2 pr-2">{x.tipo}</td>
                <td className="py-2 pr-2 text-slate-600 dark:text-slate-300">{x.descripcion || "—"}</td>
                <td className="py-2 pr-2 text-right font-medium">{fmtC(x.monto)}</td>
                <td className="py-2">
                  <button onClick={() => onDel(x.id)} className="rounded p-1 text-fieldcredit-red hover:bg-fieldcredit-red-light dark:hover:bg-red-900/30" aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={4} className="py-3 text-center text-xs text-slate-500">Sin registros aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Fila nueva */}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1.2fr_1.5fr_120px_auto]">
        <select className={inp} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Seleccionar tipo…</option>
          {opciones.map((o) => <option key={o}>{o}</option>)}
        </select>
        <input className={inp} placeholder="Descripción (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        <input type="number" className={inp} placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value === "" ? "" : Number(e.target.value))} />
        <button onClick={agregar} className="inline-flex items-center justify-center gap-1 rounded-lg bg-fieldcredit-green px-3 py-2 text-sm font-semibold text-white hover:bg-fieldcredit-green-dark">
          <Plus size={14} /> Agregar
        </button>
      </div>

      <div className={cn("mt-4 flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100", totalCls)}>
        <span>{totalLabel}</span>
        <span>{fmtC(total)}</span>
      </div>
    </div>
  );
}

function DocumentosFiador({ expedienteId, tipoActividad }: { expedienteId: string; tipoActividad?: string }) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const adjuntar = useExpedientes((s) => s.adjuntarDocumento);
  const docs = exp?.documentos ?? [];
  const tiene = (tipo: string) => docs.some((d) => d.tipo === tipo);

  const sugerencia =
    tipoActividad === "Asalariado" || tipoActividad === "Pensionado"
      ? "Colilla de pago o constancia salarial"
      : tipoActividad === "Comercio"
      ? "Declaración notarial o estados de cuenta"
      : tipoActividad === "Agropecuaria"
      ? "Declaración notarial o comprobante de venta"
      : "Comprobante que respalde ingresos del fiador";

  const onFile = (tipo: string, nombre: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
    });
    adjuntar(expedienteId, { tipo, nombre, base64: b64, mimeType: f.type, fechaCaptura: new Date().toISOString() });
    toast.success(`${nombre} adjuntado`);
    e.target.value = "";
  };

  const Item = ({ tipo, label, accept }: { tipo: string; label: string; accept: string }) => (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
      {tiene(tipo) ? <CheckCircle2 size={16} className="text-fieldcredit-green" /> : <span className="inline-block h-4 w-4 rounded border border-slate-300 dark:border-slate-600" />}
      <span className="flex-1">{label}</span>
      <label className="cursor-pointer rounded-lg bg-fieldcredit-teal-light px-3 py-1 text-xs font-semibold text-fieldcredit-teal-dark hover:bg-fieldcredit-teal hover:text-white dark:bg-teal-900/40 dark:text-teal-200">
        📷 Tomar / Subir
        <input type="file" accept={accept} capture="environment" className="hidden" onChange={onFile(tipo, label)} />
      </label>
    </li>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">📎 Documentos del fiador</h3>
      <ul className="space-y-2">
        <Item tipo="cedula_fiador_anverso" label="Cédula — Anverso" accept="image/*" />
        <Item tipo="cedula_fiador_reverso" label="Cédula — Reverso" accept="image/*" />
        <Item tipo="comprobante_ingresos_fiador" label={`Comprobante de ingresos — ${sugerencia}`} accept="image/*,application/pdf" />
        <Item tipo="buro_fiador" label="Buró de Crédito" accept="image/*,application/pdf" />
      </ul>
    </div>
  );
}

/* -------- Helpers UI -------- */

const inp = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-fieldcredit-green focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

function Field({ label, children, full, error }: { label: React.ReactNode; children: React.ReactNode; full?: boolean; error?: string }) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-fieldcredit-red">{error}</p>}
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
