// Módulo Expediente Digital de Documentos — Tab 📄 Docs
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useExpedientes, type ArchivoSoporte, type ExpedienteBorrador } from "@/stores/expedientes";
import { cn } from "@/lib/utils";

interface DocDef {
  id: string;
  label: string;
  obligatorio: boolean;
  acepta: string;
  multiple?: boolean;
  soloSiFiador?: boolean;
  descripcionLibre?: boolean;
}
interface CategoriaDef {
  id: string;
  icono: string;
  titulo: string;
  docs: DocDef[];
}

const CATEGORIAS: CategoriaDef[] = [
  {
    id: "identidad",
    icono: "🪪",
    titulo: "Identidad",
    docs: [
      { id: "cedula_deudor_anverso", label: "Cédula del deudor — anverso", obligatorio: true, acepta: "image/*" },
      { id: "cedula_deudor_reverso", label: "Cédula del deudor — reverso", obligatorio: true, acepta: "image/*" },
      { id: "cedula_fiador_anverso", label: "Cédula del fiador — anverso", obligatorio: true, acepta: "image/*", soloSiFiador: true },
      { id: "cedula_fiador_reverso", label: "Cédula del fiador — reverso", obligatorio: true, acepta: "image/*", soloSiFiador: true },
      { id: "foto_deudor_cedula", label: "Foto del deudor con cédula", obligatorio: false, acepta: "image/*" },
    ],
  },
  {
    id: "negocio",
    icono: "🏪",
    titulo: "Negocio y actividad",
    docs: [
      { id: "negocio_fachada", label: "Foto del negocio — fachada", obligatorio: true, acepta: "image/*" },
      { id: "negocio_interior", label: "Foto del negocio — interior", obligatorio: true, acepta: "image/*" },
      { id: "negocio_rotulo", label: "Foto del negocio — rótulo", obligatorio: false, acepta: "image/*" },
      { id: "matricula_alcaldia", label: "Matrícula de la alcaldía", obligatorio: false, acepta: "image/*,application/pdf" },
      { id: "permiso_operacion", label: "Permiso de operación", obligatorio: false, acepta: "image/*,application/pdf" },
      { id: "registro_sanitario", label: "Registro sanitario", obligatorio: false, acepta: "image/*,application/pdf" },
    ],
  },
  {
    id: "ingresos",
    icono: "💰",
    titulo: "Soporte de ingresos",
    docs: [
      { id: "foto_efectivo_caja", label: "Foto de efectivo / caja", obligatorio: false, acepta: "image/*" },
      { id: "facturas_venta", label: "Facturas de venta", obligatorio: false, acepta: "image/*,application/pdf", multiple: true },
      { id: "estado_cuenta_banco", label: "Estado de cuenta bancaria", obligatorio: false, acepta: "image/*,application/pdf" },
      { id: "colilla_pago", label: "Colilla de pago / salario", obligatorio: false, acepta: "image/*,application/pdf" },
      { id: "comprobante_remesas", label: "Comprobante de remesas", obligatorio: false, acepta: "image/*,application/pdf" },
      { id: "declaracion_notarial", label: "Declaración notarial de ingresos", obligatorio: false, acepta: "image/*,application/pdf" },
    ],
  },
  {
    id: "inventario",
    icono: "📦",
    titulo: "Inventario y activos",
    docs: [
      { id: "foto_inventario", label: "Foto del inventario", obligatorio: false, acepta: "image/*", multiple: true },
      { id: "foto_maquinaria", label: "Foto de maquinaria / equipos", obligatorio: false, acepta: "image/*", multiple: true },
      { id: "foto_ganado", label: "Foto de ganado / animales", obligatorio: false, acepta: "image/*", multiple: true },
      { id: "proforma_cotizacion", label: "Proforma o cotización", obligatorio: false, acepta: "image/*,application/pdf" },
    ],
  },
  {
    id: "buro",
    icono: "🏦",
    titulo: "Buró de Crédito",
    docs: [
      { id: "buro_deudor", label: "Buró de Crédito — deudor", obligatorio: true, acepta: "image/*,application/pdf" },
      { id: "buro_fiador", label: "Buró de Crédito — fiador", obligatorio: true, acepta: "image/*,application/pdf", soloSiFiador: true },
    ],
  },
  {
    id: "otros",
    icono: "📋",
    titulo: "Otros documentos",
    docs: [
      { id: "otro_1", label: "Documento adicional 1", obligatorio: false, acepta: "image/*,application/pdf", descripcionLibre: true },
      { id: "otro_2", label: "Documento adicional 2", obligatorio: false, acepta: "image/*,application/pdf", descripcionLibre: true },
      { id: "otro_3", label: "Documento adicional 3", obligatorio: false, acepta: "image/*,application/pdf", descripcionLibre: true },
    ],
  },
];

// IDs de docs obligatorios base (para el indicador del tab)
export const DOCS_OBLIGATORIOS_BASE = [
  "cedula_deudor_anverso",
  "cedula_deudor_reverso",
  "negocio_fachada",
  "negocio_interior",
  "buro_deudor",
];
export const DOCS_OBLIGATORIOS_FIADOR = ["cedula_fiador_anverso", "cedula_fiador_reverso", "buro_fiador"];

export function estadoDocsSoporte(exp?: ExpedienteBorrador): "pendiente" | "progreso" | "completo" {
  if (!exp) return "pendiente";
  const aplicaFiador = !!exp.data?.aplica_fiador;
  const ids = [...DOCS_OBLIGATORIOS_BASE, ...(aplicaFiador ? DOCS_OBLIGATORIOS_FIADOR : [])];
  const docs = exp.documentosSoporte ?? {};
  const subidos = ids.filter((k) => (docs[k]?.length ?? 0) > 0).length;
  if (subidos === 0) return "pendiente";
  if (subidos === ids.length) return "completo";
  return "progreso";
}

export function DocsExpedientePage({ expedienteId }: { expedienteId: string }) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const guardarDocsSoporte = useExpedientes((s) => s.guardarDocsSoporte);
  const aplicaFiador = !!exp?.data?.aplica_fiador;
  const docsSubidos: Record<string, ArchivoSoporte[]> = exp?.documentosSoporte ?? {};

  const [visor, setVisor] = useState<ArchivoSoporte | null>(null);
  const [categoriaOpen, setCategoriaOpen] = useState<string | null>("identidad");
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const todosObligatorios = CATEGORIAS.flatMap((c) =>
    c.docs.filter((d) => d.obligatorio && (!d.soloSiFiador || aplicaFiador)),
  );
  const obligatoriosSubidos = todosObligatorios.filter((d) => (docsSubidos[d.id]?.length ?? 0) > 0);
  const progreso =
    todosObligatorios.length > 0
      ? Math.round((obligatoriosSubidos.length / todosObligatorios.length) * 100)
      : 100;

  const manejarSubida = async (docId: string, files: FileList | null, multiple = false) => {
    if (!files || files.length === 0) return;
    setSubiendo(docId);
    try {
      const nuevos = await Promise.all(
        Array.from(files).map(
          (file) =>
            new Promise<ArchivoSoporte>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) =>
                resolve({
                  id: `${docId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  nombre: file.name,
                  tipo: file.type,
                  tamano: file.size,
                  base64: e.target?.result as string,
                  fechaSubida: new Date().toISOString(),
                });
              reader.readAsDataURL(file);
            }),
        ),
      );
      const actuales = docsSubidos[docId] ?? [];
      const actualizados = multiple ? [...actuales, ...nuevos] : [nuevos[0]];
      guardarDocsSoporte(expedienteId, docId, actualizados);
    } finally {
      setSubiendo(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Encabezado con progreso */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              📄 Expediente digital de soporte
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Documentos obligatorios: {obligatoriosSubidos.length} de {todosObligatorios.length} subidos
            </p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "text-2xl font-black",
                progreso === 100
                  ? "text-fieldcredit-green"
                  : progreso >= 50
                    ? "text-fieldcredit-amber"
                    : "text-rose-500",
              )}
            >
              {progreso}%
            </p>
            <p className="text-xs text-slate-400">completado</p>
          </div>
        </div>

        <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-600">
          <div
            className={cn(
              "h-2.5 rounded-full transition-all duration-500",
              progreso === 100
                ? "bg-fieldcredit-green"
                : progreso >= 50
                  ? "bg-fieldcredit-amber"
                  : "bg-rose-500",
            )}
            style={{ width: `${progreso}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> Obligatorio pendiente
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-fieldcredit-green" /> Subido
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-300" /> Opcional
          </span>
        </div>
      </div>

      {/* Acordeón */}
      {CATEGORIAS.map((categoria) => {
        const docsVisibles = categoria.docs.filter((d) => !d.soloSiFiador || aplicaFiador);
        if (docsVisibles.length === 0) return null;
        const subidosEnCat = docsVisibles.filter((d) => (docsSubidos[d.id]?.length ?? 0) > 0).length;
        const abierta = categoriaOpen === categoria.id;

        return (
          <div
            key={categoria.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <button
              onClick={() => setCategoriaOpen(abierta ? null : categoria.id)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{categoria.icono}</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {categoria.titulo}
                  </p>
                  <p className="text-xs text-slate-400">
                    {subidosEnCat} de {docsVisibles.length} documentos subidos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {subidosEnCat === docsVisibles.length && docsVisibles.length > 0 && (
                  <span className="rounded-full bg-fieldcredit-green-pale px-2 py-0.5 text-xs font-bold text-fieldcredit-green">
                    ✓ Completo
                  </span>
                )}
                <span
                  className={cn(
                    "text-slate-400 transition-transform duration-200",
                    abierta && "rotate-180",
                  )}
                >
                  ▼
                </span>
              </div>
            </button>

            {abierta && (
              <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                {docsVisibles.map((doc) => {
                  const archivos = docsSubidos[doc.id] ?? [];
                  return (
                    <FilaDocumento
                      key={doc.id}
                      doc={doc}
                      archivos={archivos}
                      estaSubiendo={subiendo === doc.id}
                      onSubir={(files) => manejarSubida(doc.id, files, doc.multiple)}
                      onVer={(a) => setVisor(a)}
                      onEliminar={(archivoId) => {
                        const actualizados = archivos.filter((a) => a.id !== archivoId);
                        guardarDocsSoporte(expedienteId, doc.id, actualizados);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {visor && <VisorDocumento archivo={visor} onCerrar={() => setVisor(null)} />}
    </div>
  );
}

function FilaDocumento({
  doc,
  archivos,
  estaSubiendo,
  onSubir,
  onVer,
  onEliminar,
}: {
  doc: DocDef;
  archivos: ArchivoSoporte[];
  estaSubiendo: boolean;
  onSubir: (files: FileList | null) => void;
  onVer: (a: ArchivoSoporte) => void;
  onEliminar: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tieneArchivo = archivos.length > 0;

  return (
    <div
      className={cn(
        "p-4",
        tieneArchivo
          ? "bg-fieldcredit-green-pale/60 dark:bg-green-900/10"
          : doc.obligatorio
            ? "bg-rose-50/60 dark:bg-rose-900/10"
            : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={cn(
              "mt-1 h-3 w-3 shrink-0 rounded-full",
              tieneArchivo
                ? "bg-fieldcredit-green"
                : doc.obligatorio
                  ? "bg-rose-400"
                  : "bg-slate-300",
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {doc.label}
              {doc.obligatorio && <span className="ml-1 text-xs text-rose-500">*</span>}
            </p>

            {archivos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {archivos.map((archivo) => (
                  <div key={archivo.id} className="group relative">
                    {archivo.tipo?.startsWith("image/") ? (
                      <img
                        src={archivo.base64}
                        alt={archivo.nombre}
                        onClick={() => onVer(archivo)}
                        className="h-14 w-14 cursor-pointer rounded-lg border-2 border-fieldcredit-green object-cover transition-opacity hover:opacity-90"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onVer(archivo)}
                        className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-blue-300 bg-blue-50 text-2xl transition-colors hover:bg-blue-100 dark:bg-blue-900/20"
                      >
                        📄
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEliminar(archivo.id);
                      }}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-sm font-bold leading-none text-white shadow-md ring-2 ring-white transition-transform hover:scale-110 active:scale-95 dark:ring-slate-800"
                      aria-label={`Eliminar ${archivo.nombre}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tieneArchivo && (
              <p className="mt-1 text-xs font-semibold text-fieldcredit-green">
                ✓ {archivos.length} archivo{archivos.length > 1 ? "s" : ""} subido
                {archivos.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept={doc.acepta}
            multiple={doc.multiple}
            capture="environment"
            className="hidden"
            onChange={(e) => onSubir(e.target.files)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={estaSubiendo}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50",
              tieneArchivo
                ? "border border-fieldcredit-green bg-fieldcredit-green-pale text-fieldcredit-green"
                : doc.obligatorio
                  ? "bg-fieldcredit-green text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
            )}
          >
            {estaSubiendo ? (
              <>
                <span className="animate-spin">⏳</span> Subiendo…
              </>
            ) : tieneArchivo ? (
              <>📎 Agregar más</>
            ) : (
              <>📷 Subir</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function VisorDocumento({ archivo, onCerrar }: { archivo: ArchivoSoporte; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between bg-black/50 p-4">
        <p className="max-w-xs truncate text-sm font-semibold text-white">{archivo.nombre}</p>
        <button
          onClick={onCerrar}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl text-white hover:bg-white/30"
          aria-label="Cerrar visor"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {archivo.tipo?.startsWith("image/") ? (
          <img
            src={archivo.base64}
            alt={archivo.nombre}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="text-center text-white">
            <div className="mb-4 text-6xl">📄</div>
            <p className="mb-2 font-semibold">{archivo.nombre}</p>
            <a
              href={archivo.base64}
              download={archivo.nombre}
              className="mt-2 inline-block rounded-xl bg-fieldcredit-green px-4 py-2 text-sm font-bold text-white"
            >
              ⬇ Descargar
            </a>
          </div>
        )}
      </div>
      <div className="bg-black/50 p-4 text-center">
        <p className="text-xs text-slate-400">
          Subido: {new Date(archivo.fechaSubida).toLocaleString("es-NI")}
          {archivo.tamano ? ` · ${(archivo.tamano / 1024).toFixed(1)} KB` : ""}
        </p>
      </div>
    </div>
  );
}
