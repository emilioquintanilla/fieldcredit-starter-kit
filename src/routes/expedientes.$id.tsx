// Detalle de expediente — muestra documentos adjuntos (fotos de cédula, etc.)
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileImage, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useExpedientes } from "@/stores/expedientes";
import { productosCredito } from "@/data/catalogos";

export const Route = createFileRoute("/expedientes/$id")({
  head: () => ({ meta: [{ title: "Detalle de expediente — FieldCredit" }] }),
  component: ExpedienteDetalle,
});

function ExpedienteDetalle() {
  const { id } = Route.useParams();
  const exp = useExpedientes((s) => s.expedientes[id]);

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

  const d = exp.data;
  const nombre = [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
    .filter(Boolean).join(" ") || "—";
  const producto = productosCredito.find((p) => p.id === d.producto)?.nombre || "—";
  const estado = exp.estado === "completada" ? "en_revision" : "borrador";

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

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
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
            <FileImage size={14} /> Documentos adjuntos
          </h2>
          {exp.documentos.length === 0 ? (
            <p className="text-xs text-slate-500">Sin documentos.</p>
          ) : (
            <ul className="space-y-2">
              {exp.documentos.map((doc) => (
                <li key={doc.tipo} className="flex items-center gap-3 rounded-md border border-slate-200 p-2 dark:border-slate-700">
                  <img src={doc.base64} alt={doc.nombre} className="h-14 w-20 shrink-0 rounded object-cover" />
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
          {d.firma_digital && (
            <div className="mt-4">
              <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Firma</div>
              <img src={d.firma_digital} alt="Firma" className="h-20 w-full rounded border border-slate-200 bg-white object-contain dark:border-slate-700" />
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function Info({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="text-sm text-slate-900 dark:text-slate-100">{v || "—"}</dd>
    </div>
  );
}
