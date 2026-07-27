// Alertas climáticas con mapa visual de cobertura geográfica
// Ruta: src/routes/alertas.tsx
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { obtenerExposicionClimatica, fmtC$corto, fmtNum, type ExposicionClimatica } from "@/services/institucional";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas climáticas — FieldCredit" },
      { name: "description", content: "Monitoreo de riesgo climático sobre cartera activa." },
    ],
  }),
  component: AlertasPage,
});

const COLOR_SEV: Record<string, { bg: string; border: string; text: string; hex: string; icon: string }> = {
  critica: { bg: "bg-red-50 dark:bg-red-900/10", border: "border-red-400", text: "text-red-700 dark:text-red-300", hex: "#dc2626", icon: "🚨" },
  alta:    { bg: "bg-red-50 dark:bg-red-900/10", border: "border-red-300", text: "text-red-600 dark:text-red-300", hex: "#ef4444", icon: "⚠️" },
  media:   { bg: "bg-amber-50 dark:bg-amber-900/10", border: "border-amber-400", text: "text-amber-700 dark:text-amber-300", hex: "#f59e0b", icon: "🟡" },
  baja:    { bg: "bg-teal-50 dark:bg-teal-900/10", border: "border-teal-300", text: "text-teal-700 dark:text-teal-300", hex: "#45ada2", icon: "ℹ️" },
};

const TIPO_ICON: Record<string, string> = {
  sequia: "🏜️", exceso_lluvia: "🌧️", plaga: "🦗", huracan: "🌀", helada: "🌨️", incendio: "🔥",
};

// Coordenadas referenciales de departamentos de Nicaragua
const GEO_DEPTS: Record<string, { lat: number; lng: number }> = {
  "Boaco": { lat: 12.47, lng: -85.66 },
  "Carazo": { lat: 11.73, lng: -86.20 },
  "Chinandega": { lat: 12.63, lng: -87.12 },
  "Chontales": { lat: 12.00, lng: -85.17 },
  "Estelí": { lat: 13.09, lng: -86.36 },
  "Granada": { lat: 11.93, lng: -85.96 },
  "Jinotega": { lat: 13.09, lng: -85.99 },
  "León": { lat: 12.43, lng: -86.88 },
  "Madriz": { lat: 13.47, lng: -86.46 },
  "Managua": { lat: 12.13, lng: -86.29 },
  "Masaya": { lat: 11.97, lng: -86.09 },
  "Matagalpa": { lat: 12.92, lng: -85.92 },
  "Nueva Segovia": { lat: 13.76, lng: -86.49 },
  "RAAN": { lat: 13.72, lng: -84.46 },
  "RAAS": { lat: 12.01, lng: -83.76 },
  "Río San Juan": { lat: 11.45, lng: -84.77 },
  "Rivas": { lat: 11.44, lng: -85.84 },
};

function AlertasPage() {
  const [alertas, setAlertas] = useState<ExposicionClimatica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<string>("todas");

  useEffect(() => {
    void obtenerExposicionClimatica().then((data) => {
      setAlertas(data);
      setCargando(false);
      if (data.length > 0) setSeleccionada(data[0].alerta_id);
    });
  }, []);

  const alertasFiltradas = filtro === "todas"
    ? alertas
    : alertas.filter((a) => a.severidad === filtro);

  const alertaActiva = alertas.find((a) => a.alerta_id === seleccionada);

  const totalExpuesto = alertas.reduce((s, a) => s + Number(a.saldo_expuesto), 0);
  const totalAsegurado = alertas.reduce((s, a) => s + Number(a.saldo_asegurado), 0);
  const pctCobertura = totalExpuesto > 0 ? Math.round((totalAsegurado / totalExpuesto) * 100) : 0;

  return (
    <AppLayout>
      <PageHeader
        title="Alertas climáticas"
        subtitle="Monitoreo de riesgo sobre cartera activa"
      />

      {/* KPIs rápidos */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xl font-bold text-amber-500">{alertas.length}</p>
          <p className="text-[10px] text-slate-500">Alertas activas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xl font-bold text-fieldcredit-green">{fmtC$corto(totalExpuesto)}</p>
          <p className="text-[10px] text-slate-500">Saldo expuesto</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xl font-bold text-fieldcredit-teal">{pctCobertura}%</p>
          <p className="text-[10px] text-slate-500">Con microseguro</p>
        </div>
      </div>

      {/* Mapa SVG de Nicaragua con marcadores */}
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Distribución geográfica de alertas</p>
          <p className="text-[10px] text-slate-400">Coordenadas referenciales por departamento</p>
        </div>
        <MapaAlertas alertas={alertas} seleccionada={seleccionada} onSeleccionar={setSeleccionada} />
      </div>

      {/* Filtros */}
      <div className="mt-3 flex gap-1 overflow-x-auto">
        {["todas", "critica", "alta", "media", "baja"].map((s) => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
              filtro === s
                ? "bg-fieldcredit-green text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
            }`}>
            {s === "todas" ? "Todas" : `${COLOR_SEV[s]?.icon ?? ""} ${s}`}
          </button>
        ))}
      </div>

      {/* Lista de alertas */}
      {cargando ? (
        <div className="mt-3 space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : alertasFiltradas.length === 0 ? (
        <div className="mt-6 py-8 text-center text-sm text-slate-400">
          {alertas.length === 0
            ? "No hay alertas climáticas activas. ✅"
            : "No hay alertas con la severidad seleccionada."}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {alertasFiltradas.map((a) => {
            const c = COLOR_SEV[a.severidad] ?? COLOR_SEV.baja;
            const tipoIcon = TIPO_ICON[a.tipo] ?? "🌍";
            const activa = seleccionada === a.alerta_id;
            const pctSeg = Number(a.saldo_expuesto) > 0
              ? Math.round((Number(a.saldo_asegurado) / Number(a.saldo_expuesto)) * 100)
              : 0;
            return (
              <div key={a.alerta_id}
                onClick={() => setSeleccionada(a.alerta_id)}
                className={`cursor-pointer rounded-xl border-l-4 border p-4 transition-all ${c.bg} ${c.border} ${
                  activa ? "ring-2 ring-fieldcredit-green ring-offset-1" : ""
                }`}>
                {/* Encabezado */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{tipoIcon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white`}
                          style={{ background: c.hex }}>
                          {a.severidad}
                        </span>
                        <h3 className={`text-sm font-bold ${c.text}`}>{a.titulo}</h3>
                      </div>
                      <p className="text-xs text-slate-500">
                        {a.municipio ? `${a.municipio}, ` : ""}{a.departamento}
                        {" · "}{a.fecha_inicio}
                        {a.fecha_fin ? ` → ${a.fecha_fin}` : ""}
                      </p>
                    </div>
                  </div>
                  {a.creditos_expuestos > 0 && (
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {fmtC$corto(a.saldo_expuesto)}
                      </p>
                      <p className="text-xs text-slate-500">{fmtNum(a.creditos_expuestos)} créditos</p>
                    </div>
                  )}
                </div>

                {/* Barra de cobertura de microseguro */}
                {a.creditos_expuestos > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>Cobertura microseguro</span>
                      <span className="font-bold">{pctSeg}% ({fmtNum(a.creditos_con_microseguro)} créditos)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-2 rounded-full bg-fieldcredit-teal transition-all"
                        style={{ width: `${Math.min(pctSeg, 100)}%` }} />
                    </div>
                  </div>
                )}

                {/* Recomendación */}
                {a.recomendacion && (
                  <div className="mt-3 rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-800/60">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong>Acción: </strong>{a.recomendacion}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

// ── Mapa SVG simplificado de Nicaragua ───────────────────────────────────────
function MapaAlertas({
  alertas, seleccionada, onSeleccionar,
}: {
  alertas: ExposicionClimatica[];
  seleccionada: number | null;
  onSeleccionar: (id: number) => void;
}) {
  // Bounds aprox Nicaragua: lat 10.7-15.0, lng -87.7-(-82.9)
  const toX = (lng: number) => Math.round(((lng + 87.7) / 4.8) * 340 + 10);
  const toY = (lat: number) => Math.round(((15.0 - lat) / 4.3) * 200 + 10);

  const puntos = alertas.map((a) => {
    const geo = GEO_DEPTS[a.departamento];
    if (!geo) return null;
    return { ...a, x: toX(geo.lng), y: toY(geo.lat) };
  }).filter(Boolean) as (ExposicionClimatica & { x: number; y: number })[];

  return (
    <div className="relative bg-slate-50 dark:bg-slate-900">
      <svg viewBox="0 0 360 220" className="w-full" style={{ maxHeight: 200 }}>
        {/* Fondo referencial */}
        <rect width="360" height="220" fill="transparent" />
        <text x="180" y="115" textAnchor="middle" fontSize="11" fill="#94a3b8" opacity="0.6">Nicaragua</text>

        {/* Marcadores */}
        {puntos.map((p) => {
          const c = COLOR_SEV[p.severidad] ?? COLOR_SEV.baja;
          const activo = seleccionada === p.alerta_id;
          return (
            <g key={p.alerta_id} style={{ cursor: "pointer" }}
              onClick={() => onSeleccionar(p.alerta_id)}>
              <circle cx={p.x} cy={p.y} r={activo ? 14 : 10}
                fill={c.hex} fillOpacity={0.25} stroke={c.hex} strokeWidth={2} />
              <circle cx={p.x} cy={p.y} r={activo ? 6 : 4}
                fill={c.hex} />
              {activo && (
                <circle cx={p.x} cy={p.y} r={18}
                  fill="none" stroke={c.hex} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6}>
                  <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <text x={p.x} y={p.y - 16} textAnchor="middle" fontSize="9" fill="#475569">
                {p.departamento.substring(0, 8)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="px-4 pb-2 text-[10px] text-slate-400">
        Toca un marcador para ver el detalle de la alerta. Posiciones referenciales por departamento.
      </p>
    </div>
  );
}
