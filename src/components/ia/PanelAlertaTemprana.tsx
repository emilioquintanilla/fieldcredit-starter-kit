/**
 * Panel de alerta temprana de mora para el dashboard del asesor/coordinador.
 * Muestra los créditos con mayor riesgo de caer en mora en los próximos 30 días.
 *
 * Ruta: src/components/ia/PanelAlertaTemprana.tsx
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Phone, MapPin, TrendingUp } from "lucide-react";
import { getFuenteCore } from "@/services/core";
import { topEnRiesgo, type CreditoEnRiesgo, type NivelRiesgo } from "@/services/ia/alertaTempranaService";
import { useApp } from "@/stores/app";
import { useRolActivo } from "@/stores/app";

const fmtC$ = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;

const NIVEL_STYLE: Record<NivelRiesgo, { bg: string; text: string; badge: string; label: string }> = {
  critico: { bg: "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/40", text: "text-red-700 dark:text-red-300", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", label: "Crítico" },
  alto:    { bg: "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/40", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", label: "Alto" },
  medio:   { bg: "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800/40", text: "text-blue-700 dark:text-blue-300", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", label: "Medio" },
  bajo:    { bg: "border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700", text: "text-slate-600 dark:text-slate-300", badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", label: "Bajo" },
};

interface Props {
  limite?: number;
  soloSucursal?: boolean; // coordinador ve su sucursal; asesor ve sus créditos
}

export function PanelAlertaTemprana({ limite = 5, soloSucursal = false }: Props) {
  const usuario = useApp((s) => s.usuario);
  const rol = useRolActivo();
  const [items, setItems] = useState<CreditoEnRiesgo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      setCargando(true);
      try {
        const core = await getFuenteCore();
        const filtros = soloSucursal && usuario?.sucursal_id
          ? { sucursalId: usuario.sucursal_id }
          : rol === "asesor" && usuario?.id
          ? { asesorId: usuario.id }
          : {};
        const [creditos, alertas] = await Promise.all([
          core.obtenerCartera(filtros),
          core.obtenerExposicionClimatica(),
        ]);
        if (vivo) {
          setItems(topEnRiesgo(creditos, alertas, limite));
          setCargando(false);
        }
      } catch (e) {
        console.error("[PanelAlertaTemprana]", e);
        if (vivo) setCargando(false);
      }
    };
    void cargar();
    return () => { vivo = false; };
  }, [limite, soloSucursal, usuario, rol]);

  if (cargando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-amber-500" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Alerta temprana de mora</p>
        </div>
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />)}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800/40 dark:bg-green-900/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-sm font-bold text-green-800 dark:text-green-200">Sin créditos en riesgo inmediato</p>
            <p className="text-xs text-green-600 dark:text-green-400">La cartera monitorizada no muestra señales de alerta temprana.</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-green-500 dark:text-green-500">
          Los datos de cartera son sintéticos. Conectar la API del core para análisis real.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-amber-500" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Alerta temprana de mora
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {items.length} crédito{items.length > 1 ? "s" : ""} en seguimiento
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const s = NIVEL_STYLE[item.nivel];
          return (
            <div key={item.credito.id} className={`rounded-lg border p-3 ${s.bg}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${s.badge}`}>
                      {s.label}
                    </span>
                    <p className={`truncate text-xs font-bold ${s.text}`}>
                      {item.credito.cliente}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {item.credito.codigo}  ·  {item.credito.rubro ?? "—"}
                    {item.credito.municipio ? `  ·  ${item.credito.municipio}` : ""}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                    {item.factores.slice(0, 2).join("  |  ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {fmtC$(item.credito.saldo_capital)}
                  </p>
                  <p className="text-[9px] text-slate-400">saldo</p>
                </div>
              </div>

              {/* Acción sugerida */}
              <div className="mt-2 flex items-center gap-2">
                <p className="flex-1 text-[10px] text-slate-600 dark:text-slate-300 italic">
                  💡 {item.accionSugerida}
                </p>
                {item.credito.lat && item.credito.lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${item.credito.lat},${item.credito.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded p-1 text-fieldcredit-teal hover:bg-fieldcredit-teal-pale dark:hover:bg-teal-900/20"
                    title="Navegar a la finca"
                  >
                    <MapPin size={13} />
                  </a>
                )}
              </div>

              {/* Barra de riesgo */}
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                <div
                  className={`h-1 rounded-full transition-all ${
                    item.nivel === "critico" ? "bg-red-500" :
                    item.nivel === "alto"    ? "bg-amber-500" :
                    item.nivel === "medio"   ? "bg-blue-400" : "bg-slate-300"
                  }`}
                  style={{ width: `${item.scoreRiesgo}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-slate-400">
        Score heurístico basado en días de atraso, cuotas vencidas, alertas climáticas y
        estacionalidad del rubro. Versión 1.0 — sin modelo ML. Datos sintéticos de demostración.
      </p>
    </div>
  );
}
