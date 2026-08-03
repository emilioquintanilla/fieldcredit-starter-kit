// src/routes/admin/documentos.tsx
// Panel de administración para cargar e indexar los manuales normativos.
// Solo visible para usuarios con rol gerente o admin.
// El asesor pega el texto del PDF aquí — sin parseo de archivos.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Zap, CheckCircle2, XCircle, ArrowLeft, FileText } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { procesarDocumento } from "@/services/ia/ragNormativo";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/documentos")({
  head: () => ({ meta: [{ title: "Documentos normativos — FieldCredit Admin" }] }),
  component: AdminDocumentos,
});

type DocRow = {
  id              : string;
  nombre          : string;
  descripcion     : string | null;
  tipo            : string;
  procesado       : boolean;
  fragmentos_count: number;
  subido_en       : string;
};

type FormState = {
  nombre     : string;
  descripcion: string;
  tipo       : "manual" | "reglamento" | "circular" | "tabla";
  texto      : string;
};

const TIPO_LABEL: Record<string, string> = {
  manual    : "Manual",
  reglamento: "Reglamento",
  circular  : "Circular",
  tabla     : "Tabla / Tarifario",
};

function AdminDocumentos() {
  const [docs,        setDocs]        = useState<DocRow[]>([]);
  const [cargandoDocs, setCargandoDocs] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [indexando,   setIndexando]   = useState<string | null>(null);
  const [eliminando,  setEliminando]  = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    nombre     : "",
    descripcion: "",
    tipo       : "manual",
    texto      : "",
  });
  const [guardando, setGuardando] = useState(false);

  // Cargar documentos
  async function cargarDocs() {
    setCargandoDocs(true);
    const { data } = await supabase
      .from("documentos_normativos")
      .select("id, nombre, descripcion, tipo, procesado, fragmentos_count, subido_en")
      .order("subido_en", { ascending: false });
    setDocs((data as DocRow[]) || []);
    setCargandoDocs(false);
  }

  useEffect(() => { cargarDocs(); }, []);

  // Guardar nuevo documento
  async function handleGuardar() {
    if (!form.nombre.trim() || !form.texto.trim()) {
      toast.error("El nombre y el texto del documento son obligatorios.");
      return;
    }
    setGuardando(true);
    try {
      const { error } = await supabase.from("documentos_normativos").insert({
        nombre         : form.nombre.trim(),
        descripcion    : form.descripcion.trim() || null,
        tipo           : form.tipo,
        contenido_texto: form.texto.trim(),
        procesado      : false,
      });
      if (error) throw error;

      toast.success(`"${form.nombre}" guardado. Ahora indexa el documento.`);
      setForm({ nombre: "", descripcion: "", tipo: "manual", texto: "" });
      setMostrarForm(false);
      await cargarDocs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  }

  // Indexar documento (chunking + embeddings)
  async function handleIndexar(doc: DocRow) {
    setIndexando(doc.id);
    try {
      const result = await procesarDocumento(doc.id);
      toast.success(result.mensaje);
      await cargarDocs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al indexar.");
    } finally {
      setIndexando(null);
    }
  }

  // Eliminar documento
  async function handleEliminar(doc: DocRow) {
    if (!confirm(`¿Eliminar "${doc.nombre}" y todos sus fragmentos?`)) return;
    setEliminando(doc.id);
    try {
      const { error } = await supabase
        .from("documentos_normativos")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
      toast.success(`"${doc.nombre}" eliminado.`);
      await cargarDocs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setEliminando(null);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Documentos normativos"
        subtitle="Base de conocimiento del Copiloto Normativo"
      />

      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
      >
        <ArrowLeft size={12} /> Volver al inicio
      </Link>

      {/* Aviso */}
      <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs text-teal-800 dark:border-teal-800/40 dark:bg-teal-900/10 dark:text-teal-200">
        <strong>¿Cómo funciona?</strong> Pega el texto de cada manual (desde el PDF) en el formulario. Después de guardarlo, haz clic en <strong>Indexar</strong> para que el sistema genere los embeddings. El proceso tarda ~30 segundos por documento.
      </div>

      {/* Lista de documentos */}
      <div className="mb-4 space-y-3">
        {cargandoDocs ? (
          <div className="flex justify-center py-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-fieldcredit-teal border-t-transparent" />
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
            <FileText size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">No hay documentos cargados.</p>
            <p className="text-xs text-slate-400">Agrega el primer manual para activar el Copiloto Normativo.</p>
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {doc.nombre}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700">
                      {TIPO_LABEL[doc.tipo] ?? doc.tipo}
                    </span>
                    {doc.procesado ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle2 size={10} />
                        {doc.fragmentos_count} fragmentos
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <XCircle size={10} />
                        Sin indexar
                      </span>
                    )}
                  </div>
                  {doc.descripcion && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{doc.descripcion}</p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(doc.subido_en).toLocaleDateString("es-NI")}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleIndexar(doc)}
                    disabled={indexando === doc.id}
                    className="flex items-center gap-1.5 rounded-lg bg-fieldcredit-teal px-3 py-1.5
                               text-xs font-semibold text-white transition-colors hover:bg-fieldcredit-teal-dark
                               disabled:opacity-60"
                  >
                    {indexando === doc.id ? (
                      <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    ) : (
                      <Zap size={12} />
                    )}
                    {doc.procesado ? "Re-indexar" : "Indexar"}
                  </button>
                  <button
                    onClick={() => handleEliminar(doc)}
                    disabled={eliminando === doc.id}
                    className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50
                               disabled:opacity-60 dark:border-red-800/40 dark:hover:bg-red-900/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Botón agregar */}
      {!mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed
                     border-fieldcredit-teal py-3 text-sm font-semibold text-fieldcredit-teal
                     transition-colors hover:bg-fieldcredit-teal-pale"
        >
          <Plus size={16} />
          Agregar documento normativo
        </button>
      )}

      {/* Formulario nuevo documento */}
      {mostrarForm && (
        <div className="rounded-xl border border-fieldcredit-teal/40 bg-teal-50/50 p-4 dark:bg-teal-900/10">
          <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">
            Nuevo documento normativo
          </h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Nombre del documento *
              </label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Manual de Políticas de Crédito 2024"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                           focus:border-fieldcredit-teal focus:outline-none focus:ring-1 focus:ring-fieldcredit-teal
                           dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tipo
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as FormState["tipo"] }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                             focus:border-fieldcredit-teal focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  {Object.entries(TIPO_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Descripción (opcional)
                </label>
                <input
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Versión, fecha, alcance..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                             focus:border-fieldcredit-teal focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Texto del documento * <span className="text-slate-400">(pega el contenido del PDF)</span>
              </label>
              <textarea
                value={form.texto}
                onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
                rows={10}
                placeholder="Pega aquí el texto extraído del manual. Puedes copiar directamente desde el PDF..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                           focus:border-fieldcredit-teal focus:outline-none focus:ring-1 focus:ring-fieldcredit-teal
                           dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {form.texto && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {form.texto.length.toLocaleString("es-NI")} caracteres ·
                  ~{Math.ceil(form.texto.split(/\s+/).length / 500)} fragmentos estimados
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-fieldcredit-teal py-2 text-sm font-semibold
                           text-white transition-colors hover:bg-fieldcredit-teal-dark disabled:opacity-60"
              >
                {guardando ? "Guardando…" : "Guardar documento"}
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600
                           hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
