// Búsqueda de clientes con mapa mini y enlaces de navegación
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { MapaMini } from "@/components/geo/MapaMini";
import { StatusBadge } from "@/components/StatusBadge";
import { MenuAccionesExpediente } from "@/components/MenuAccionesExpediente";
import { useExpedientes } from "@/stores/expedientes";


export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — FieldCredit" },
      { name: "description", content: "Buscar clientes por nombre, cédula o expediente y navegar a su ubicación." },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const expedientes = useExpedientes((s) => s.expedientes);
  const [busqueda, setBusqueda] = useState("");
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);


  const resultados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const lista = Object.values(expedientes);
    if (!term) return lista;
    const soloDigitos = term.replace(/-/g, "");
    return lista.filter((exp) => {
      const d = exp.data;
      const nombre = [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const cedula = (d.cedula || "").replace(/-/g, "");
      const codigo = (d.numero_solicitud || exp.id || "").toLowerCase();
      return nombre.includes(term) || cedula.includes(soloDigitos) || codigo.includes(term);
    });
  }, [expedientes, busqueda]);

  return (
    <AppLayout>
      <PageHeader title="Buscar clientes" subtitle="Nombre, cédula o número de expediente" />

      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="search"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-fieldcredit-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      {resultados.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {busqueda ? `Sin resultados para "${busqueda}"` : "Aún no hay expedientes registrados."}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {resultados.map((exp) => (
            <TarjetaClienteBusqueda key={exp.id} expediente={exp} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function TarjetaClienteBusqueda({
  expediente,
}: {
  expediente: ReturnType<typeof useExpedientes.getState>["expedientes"][string];
}) {
  const geo = expediente.geolocalizacion;
  const domicilio = geo?.domicilioDeudor;
  const negocio = geo?.negocioDeudor;
  const tieneUbicacion = !!(domicilio?.lat || negocio?.lat);
  const d = expediente.data;
  const nombre =
    [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido].filter(Boolean).join(" ") || "Sin nombre";
  const estado = expediente.estado === "completada" ? "en_revision" : "borrador";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{nombre}</p>
          <p className="text-xs text-slate-500">
            {expediente.id} · {d.tipo_actividad || "—"}
          </p>
        </div>
        <StatusBadge status={estado} />
      </div>

      {tieneUbicacion && (
        <div className="mb-3 overflow-hidden rounded-xl" style={{ height: "130px" }}>
          <MapaMini
            lat={(domicilio?.lat || negocio?.lat) as number}
            lng={(domicilio?.lng || negocio?.lng) as number}
          />
        </div>
      )}

      <div className="mb-2 grid grid-cols-2 gap-2">
        {domicilio?.lat ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${domicilio.lat},${domicilio.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-lg bg-fieldcredit-green py-2 text-xs font-bold text-white no-underline"
          >
            🏠 Ir al domicilio
          </a>
        ) : (
          <span className="rounded-lg border border-dashed border-slate-200 py-2 text-center text-xs text-slate-400 dark:border-slate-600">
            🏠 Sin domicilio
          </span>
        )}
        {negocio?.lat ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${negocio.lat},${negocio.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-lg bg-fieldcredit-teal py-2 text-xs font-bold text-white no-underline"
          >
            🏪 Ir al negocio
          </a>
        ) : (
          <span className="rounded-lg border border-dashed border-slate-200 py-2 text-center text-xs text-slate-400 dark:border-slate-600">
            🏪 Sin negocio
          </span>
        )}
      </div>

      {!tieneUbicacion && (
        <p className="mb-2 py-1 text-center text-xs italic text-slate-400">📍 Sin ubicación GPS registrada</p>
      )}

      <Link
        to="/expedientes/$id"
        params={{ id: expediente.id }}
        className="block w-full rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
      >
        📋 Ver expediente completo →
      </Link>
    </div>
  );
}
