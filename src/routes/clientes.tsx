// Módulo de clientes mejorado con filtros, badge ARS y estadísticas
// Ruta: src/routes/clientes.tsx
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { MapaMini } from "@/components/geo/MapaMini";
import { StatusBadge } from "@/components/StatusBadge";
import { MenuAccionesExpediente } from "@/components/MenuAccionesExpediente";
import { useExpedientes, type EstadoExpediente, type ExpedienteBorrador, type SolicitudData } from "@/stores/expedientes";
import { useExpedientesRemote } from "@/stores/expedientesRemote";
import { useExpedientesSync } from "@/hooks/useExpedientesSync";
import { obtenerSolicitudesDe } from "@/services/expedientesService";
import { useRolActivo } from "@/stores/app";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — FieldCredit" },
      { name: "description", content: "Buscar y gestionar clientes por nombre, cédula o expediente." },
    ],
  }),
  component: ClientesPage,
});

const ARS_NIVELES = {
  verde_preferencial: { label: "Verde preferencial", color: "#5eb837", bg: "bg-green-100", text: "text-green-700" },
  verde_estandar:     { label: "Verde estándar",     color: "#3d7a21", bg: "bg-green-100", text: "text-green-800" },
  amarillo:           { label: "Amarillo",            color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
  rojo:               { label: "Rojo",                color: "#dc2626", bg: "bg-red-100",   text: "text-red-700"   },
} as const;

const ESTADOS_FILTRO = [
  { value: "todos",      label: "Todos" },
  { value: "borrador",   label: "Borrador" },
  { value: "en_revision",label: "En revisión" },
  { value: "en_comite",  label: "En comité" },
  { value: "aprobado",   label: "Aprobado" },
];

const PRODUCTOS_FILTRO = [
  { value: "todos",       label: "Todos" },
  { value: "agroresilia", label: "AgroResilia 🌿" },
  { value: "otro",        label: "Tradicional" },
];

// Vista unificada: cabecera + solicitud desde Supabase (fuente de verdad),
// enriquecida con los módulos locales (geo, comité) cuando existen.
export type ClienteVista = {
  id: string;
  codigo: string;
  data: SolicitudData;
  estado: EstadoExpediente;
  geolocalizacion?: ExpedienteBorrador["geolocalizacion"];
  comite?: ExpedienteBorrador["comite"];
};

function ClientesPage() {
  useExpedientesSync();
  const remotos = useExpedientesRemote((s) => s.expedientes);
  const cargandoRemoto = useExpedientesRemote((s) => s.cargando);
  const locales = useExpedientes((s) => s.expedientes);
  const [solicitudes, setSolicitudes] = useState<Record<number, Record<string, unknown>>>({});
  const rol = useRolActivo();

  const idsRemotos = useMemo(() => remotos.map((e) => e.id).join(","), [remotos]);
  useEffect(() => {
    const ids = idsRemotos ? idsRemotos.split(",").map(Number) : [];
    if (ids.length === 0) { setSolicitudes({}); return; }
    let vivo = true;
    void obtenerSolicitudesDe(ids).then((m) => { if (vivo) setSolicitudes(m); });
    return () => { vivo = false; };
  }, [idsRemotos]);

  const localPorSupabaseId = useMemo(() => {
    const m: Record<number, ExpedienteBorrador> = {};
    Object.values(locales).forEach((e) => {
      if (e.supabaseId) m[e.supabaseId] = e;
    });
    return m;
  }, [locales]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroProducto, setFiltroProducto] = useState("todos");
  const [vistaLista, setVistaLista] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  const lista: ClienteVista[] = useMemo(
    () =>
      remotos.map((r) => {
        const local = localPorSupabaseId[r.id];
        const remota = (solicitudes[r.id] as SolicitudData | undefined) ?? {};
        const nombreRemoto = (r.cliente ?? "").split(" ").filter(Boolean);
        const data: SolicitudData = {
          primer_nombre: nombreRemoto[0],
          segundo_nombre: nombreRemoto.length > 2 ? nombreRemoto[1] : undefined,
          primer_apellido: nombreRemoto.length > 2 ? nombreRemoto[2] : nombreRemoto[1],
          segundo_apellido: nombreRemoto[3],
          cedula: r.cedula ?? undefined,
          producto: r.tipo_producto ?? undefined,
          monto: r.monto_solicitado ?? undefined,
          plazo: r.plazo_meses ?? undefined,
          tipo_actividad: r.actividad ?? undefined,
          ...remota,
          numero_solicitud: r.codigo,
        };
        return {
          id: String(r.id),
          codigo: r.codigo,
          data,
          estado: (r.estado === "archivado" ? "borrador" : r.estado) as EstadoExpediente,
          geolocalizacion: local?.geolocalizacion,
          comite: local?.comite,
        };
      }),
    [remotos, solicitudes, localPorSupabaseId],
  );

  const resultados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const soloDigitos = term.replace(/-/g, "");
    return lista.filter((exp) => {
      const d = exp.data;
      const nombre = [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
        .filter(Boolean).join(" ").toLowerCase();
      const cedula = (d.cedula || "").replace(/-/g, "");
      const codigo = (exp.codigo || d.numero_solicitud || "").toLowerCase();

      const pasaBusqueda = !term ||
        nombre.includes(term) || cedula.includes(soloDigitos) || codigo.includes(term);

      const estadoReal = exp.estado;
      const pasaEstado = filtroEstado === "todos" || estadoReal === filtroEstado;

      const esVerde = d.producto === "agroresilia";
      const pasaProducto = filtroProducto === "todos" ||
        (filtroProducto === "agroresilia" && esVerde) ||
        (filtroProducto === "otro" && !esVerde);

      return pasaBusqueda && pasaEstado && pasaProducto;
    });
  }, [lista, busqueda, filtroEstado, filtroProducto]);

  // Estadísticas rápidas
  const stats = useMemo(() => ({
    total: lista.length,
    verdes: lista.filter((e) => e.data.producto === "agroresilia").length,
    enComite: lista.filter((e) => e.estado === "en_comite").length,
    aprobados: lista.filter((e) => e.estado === "aprobado").length,
  }), [lista]);

  return (
    <AppLayout>
      <PageHeader
        title="Clientes"
        subtitle={cargandoRemoto ? "Sincronizando…" : `${resultados.length} de ${stats.total} expedientes`}
      />

      {/* Estadísticas rápidas */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { label: "Total", valor: stats.total, color: "text-slate-700 dark:text-slate-200" },
          { label: "🌿 Verdes", valor: stats.verdes, color: "text-fieldcredit-green" },
          { label: "En comité", valor: stats.enComite, color: "text-fieldcredit-teal" },
          { label: "Aprobados", valor: stats.aprobados, color: "text-fieldcredit-green-dark" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
            <p className={`text-xl font-bold ${s.color}`}>{s.valor}</p>
            <p className="text-[10px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buscador y filtros */}
      <div className="mt-3 space-y-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="search"
            placeholder="Buscar por nombre, cédula o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-fieldcredit-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="flex gap-1">
            {ESTADOS_FILTRO.map((f) => (
              <button key={f.value} onClick={() => setFiltroEstado(f.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroEstado === f.value
                    ? "bg-fieldcredit-green text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px shrink-0 bg-slate-300 dark:bg-slate-600" />
          <div className="flex gap-1">
            {PRODUCTOS_FILTRO.map((f) => (
              <button key={f.value} onClick={() => setFiltroProducto(f.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroProducto === f.value
                    ? "bg-fieldcredit-teal text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setVistaLista(!vistaLista)}
            className="ml-auto shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 dark:border-slate-600"
            title="Cambiar vista">
            {vistaLista ? "⊞ Tarjetas" : "≡ Lista"}
          </button>
        </div>
      </div>

      {resultados.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {busqueda || filtroEstado !== "todos" || filtroProducto !== "todos"
            ? "Sin resultados para los filtros aplicados."
            : "Aún no hay expedientes registrados."}
        </p>
      ) : vistaLista ? (
        <VistaLista resultados={resultados} rol={rol} />
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {resultados.map((exp) => (
            <TarjetaCliente
              key={exp.id}
              expediente={exp}
              menuAbierto={menuAbierto === exp.id}
              onToggleMenu={() => setMenuAbierto((v) => (v === exp.id ? null : exp.id))}
              onCerrarMenu={() => setMenuAbierto(null)}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

// ── Vista lista compacta ─────────────────────────────────────────────────────
function VistaLista({
  resultados, rol,
}: {
  resultados: ClienteVista[];
  rol: string;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50">
          <tr>
            <th className="px-4 py-2.5">Cliente</th>
            <th className="px-4 py-2.5 hidden sm:table-cell">Cédula</th>
            <th className="px-4 py-2.5">Monto</th>
            <th className="px-4 py-2.5">Estado</th>
            <th className="px-4 py-2.5 hidden md:table-cell">ARS</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {resultados.map((exp) => {
            const d = exp.data;
            const nombre = [d.primer_nombre, d.primer_apellido, d.segundo_apellido].filter(Boolean).join(" ") || "—";
            const estado = exp.estado;
            const ars = exp.comite?.dictamenIA?.scoreARS;
            return (
              <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{nombre}</p>
                  <p className="text-slate-400">{exp.codigo}</p>
                </td>
                <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">{d.cedula || "—"}</td>
                <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                  {d.monto ? `C$ ${d.monto.toLocaleString("es-NI")}` : "—"}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={estado} /></td>
                <td className="hidden px-4 py-2.5 md:table-cell">
                  {ars ? <ArsBadge nivel={ars.nivel} score={ars.score} /> : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link to="/expedientes/$id" params={{ id: exp.id }}
                    className="rounded px-2 py-1 text-xs font-medium text-fieldcredit-green hover:underline">
                    Ver →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tarjeta de cliente (vista grid) ──────────────────────────────────────────
function TarjetaCliente({
  expediente, menuAbierto, onToggleMenu, onCerrarMenu,
}: {
  expediente: ClienteVista;
  menuAbierto: boolean;
  onToggleMenu: () => void;
  onCerrarMenu: () => void;
}) {
  const geo = expediente.geolocalizacion;
  const domicilio = geo?.domicilioDeudor;
  const negocio = geo?.negocioDeudor;
  const tieneUbicacion = !!(domicilio?.lat || negocio?.lat);
  const d = expediente.data;
  const nombre = [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
    .filter(Boolean).join(" ") || "Sin nombre";
  const estado = expediente.estado;
  const ars = expediente.comite?.dictamenIA?.scoreARS;
  const esVerde = d.producto === "agroresilia";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {esVerde && <span className="text-sm">🌿</span>}
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{nombre}</p>
          </div>
          <p className="text-xs text-slate-500">
            {expediente.codigo}
            {d.tipo_actividad ? ` · ${d.tipo_actividad}` : ""}
          </p>
          {d.cedula && <p className="text-xs text-slate-400">{d.cedula}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge status={estado} />
          <MenuAccionesExpediente
            expedienteId={expediente.id}
            codigoVisible={expediente.codigo}
            abierto={menuAbierto}
            onToggle={onToggleMenu}
            onCerrar={onCerrarMenu}
          />
        </div>
      </div>

      {/* ARS Badge */}
      {ars && (
        <div className="mb-3">
          <ArsBadge nivel={ars.nivel} score={ars.score} full />
        </div>
      )}

      {/* Monto y plazo */}
      {(d.monto || d.plazo) && (
        <div className="mb-3 flex gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
          {d.monto && (
            <div>
              <p className="text-[10px] text-slate-400">Monto</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                C$ {d.monto.toLocaleString("es-NI")}
              </p>
            </div>
          )}
          {d.plazo && (
            <div>
              <p className="text-[10px] text-slate-400">Plazo</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{d.plazo} meses</p>
            </div>
          )}
          {d.departamento_residencia && (
            <div className="ml-auto">
              <p className="text-[10px] text-slate-400">Zona</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{d.departamento_residencia}</p>
            </div>
          )}
        </div>
      )}

      {/* Mapa mini */}
      {tieneUbicacion && (
        <div className="mb-3 overflow-hidden rounded-xl" style={{ height: "120px" }}>
          <MapaMini
            lat={(domicilio?.lat || negocio?.lat) as number}
            lng={(domicilio?.lng || negocio?.lng) as number}
          />
        </div>
      )}

      {/* Botones de navegación GPS */}
      <div className="mb-2 grid grid-cols-2 gap-2">
        {domicilio?.lat ? (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${domicilio.lat},${domicilio.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-lg bg-fieldcredit-green py-2 text-xs font-bold text-white">
            🏠 Ir al domicilio
          </a>
        ) : (
          <span className="rounded-lg border border-dashed border-slate-200 py-2 text-center text-xs text-slate-400 dark:border-slate-600">
            🏠 Sin domicilio
          </span>
        )}
        {negocio?.lat ? (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${negocio.lat},${negocio.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-lg bg-fieldcredit-teal py-2 text-xs font-bold text-white">
            🏪 Ir al negocio
          </a>
        ) : (
          <span className="rounded-lg border border-dashed border-slate-200 py-2 text-center text-xs text-slate-400 dark:border-slate-600">
            🏪 Sin negocio
          </span>
        )}
      </div>

      <Link to="/expedientes/$id" params={{ id: expediente.id }}
        className="block w-full rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-600 transition-colors hover:border-fieldcredit-green hover:text-fieldcredit-green dark:border-slate-600 dark:text-slate-300">
        📋 Ver expediente completo →
      </Link>
    </div>
  );
}

// ── Badge ARS reutilizable ────────────────────────────────────────────────────
function ArsBadge({
  nivel, score, full = false,
}: {
  nivel: keyof typeof ARS_NIVELES; score: number; full?: boolean;
}) {
  const n = ARS_NIVELES[nivel] ?? ARS_NIVELES.amarillo;
  if (full) {
    return (
      <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${n.bg} dark:bg-opacity-20`}>
        <span className="text-sm">🌿</span>
        <div className="flex-1">
          <p className={`text-xs font-bold ${n.text}`}>ARS: {score}/100</p>
          <p className={`text-[10px] ${n.text} opacity-80`}>{n.label}</p>
        </div>
        <div className="h-8 w-8 shrink-0">
          <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke={n.color} strokeWidth="3"
              strokeDasharray={`${(score / 100) * 88} 88`} strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${n.bg} ${n.text}`}>
      🌿 ARS {score}
    </span>
  );
}
