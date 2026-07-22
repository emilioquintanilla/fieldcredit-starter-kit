// Bandeja del comité: lista de expedientes por dictaminar.
import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ProveedorBadge } from "@/components/ia/ProveedorBadge";
import { useExpedientes } from "@/stores/expedientes";
import { productosCredito } from "@/data/catalogos";

export const Route = createFileRoute("/comite")({
  head: () => ({
    meta: [
      { title: "Comité de crédito — FieldCredit" },
      { name: "description", content: "Expedientes pendientes de dictamen del Copiloto IA y decisión del comité." },
      { property: "og:title", content: "Comité de crédito — FieldCredit" },
      { property: "og:description", content: "Dictamen automático con IA y decisión final humana en apego a CONAMI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComitePage,
});

function ComitePage() {
  const expedientes = useExpedientes((s) =>
    Object.values(s.expedientes).filter((e) => e.estado === "en_comite" || e.comite?.dictamenIA),
  );
  expedientes.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  const pendientes = expedientes.filter((e) => !e.comite?.decision).length;

  return (
    <AppLayout>
      <PageHeader
        title="Comité de crédito"
        subtitle={
          expedientes.length === 0
            ? "Sin expedientes en comité"
            : `${pendientes} pendiente${pendientes === 1 ? "" : "s"} de resolución · ${expedientes.length} total`
        }
        actions={<ProveedorBadge />}
      />

      {expedientes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 text-5xl">✅</div>
          <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">Sin expedientes pendientes</p>
          <p className="text-sm text-slate-500">
            Envía un expediente al comité desde el tab <strong>Docs</strong> del detalle.
          </p>
          <Link
            to="/expedientes"
            className="mt-4 inline-block rounded-xl bg-fieldcredit-green px-4 py-2 text-sm font-bold text-white"
          >
            Ver expedientes
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {expedientes.map((exp) => (
            <TarjetaComite key={exp.id} exp={exp} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function TarjetaComite({ exp }: { exp: ReturnType<typeof useExpedientes.getState>["expedientes"][string] }) {
  const d = exp.data;
  const nombre =
    [d?.primer_nombre, d?.segundo_nombre, d?.primer_apellido, d?.segundo_apellido].filter(Boolean).join(" ") || "—";
  const producto = productosCredito.find((p) => p.id === d?.producto)?.nombre || d?.producto || "—";
  const dictamen = exp.comite?.dictamenIA;
  const decision = exp.comite?.decision;

  return (
    <Link
      to="/comite/$id"
      params={{ id: exp.id }}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-fieldcredit-teal hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{nombre}</p>
          <p className="text-xs text-slate-500">{exp.id} · {producto}</p>
        </div>
        <StatusBadge status={exp.estado} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-slate-500">Monto</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {d?.monto ? `C$ ${d.monto.toLocaleString("es-NI")}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Plazo</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {d?.plazo ? `${d.plazo} m` : "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Score IA</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {dictamen ? `${dictamen.score}/100` : "Sin generar"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {decision
            ? `Decisión: ${decision.decision}`
            : dictamen
            ? "Dictamen listo · Falta decisión"
            : "Analizar con Copiloto IA →"}
        </span>
        <span className="rounded-full bg-fieldcredit-teal px-3 py-1 text-xs font-bold text-white">
          {decision ? "Ver dictamen" : dictamen ? "Decidir" : "Analizar"}
        </span>
      </div>
    </Link>
  );
}
