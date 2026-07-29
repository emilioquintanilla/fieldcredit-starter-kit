/**
 * Panel de perfil climático de la parcela — integra datos de ClimateSERV.
 * Muestra precipitación CHIRPS, estrés vegetativo ESI y score climático ARS.
 * Se usa en GeoModule y en el dictamen del comité.
 *
 * Ruta: src/components/climatico/PerfilClimatico.tsx
 */
import { useEffect, useState, useCallback } from "react";
import { CloudRain, Thermometer, Leaf, RefreshCw, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  obtenerPerfilClimatico,
  type PerfilClimaticoParcela,
} from "@/services/climatico/climateservClient";

interface Props {
  lat: number;
  lng: number;
  departamento?: string;
  modoCompacto?: boolean;
}

const fmtMm = (n: number) => `${n.toFixed(1)} mm`;

export function PerfilClimatico({ lat, lng, departamento, modoCompacto = false }: Props) {
  const [perfil, setPerfil] = useState<PerfilClimaticoParcela | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!lat || !lng) return;
    setCargando(true);
    setError(null);
    try {
      const resultado = await obtenerPerfilClimatico(lat, lng, departamento);
      setPerfil(resultado);
    } catch (e) {
      setError("No se pudieron obtener datos climáticos. Verificá la conexión a internet.");
      console.error("[PerfilClimatico]", e);
    } finally {
      setCargando(false);
    }
  }, [lat, lng, departamento]);

  useEffect(() => { void cargar(); }, [cargar]);

  if (!lat || !lng) return null;

  if (cargando) {
    return (
      <div className="rounded-xl border border-fieldcredit-teal/30 bg-white p-4 dark:border-teal-700/30 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin text-fieldcredit-teal" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Consultando datos climáticos de NASA ClimateSERV para esta parcela...
          </p>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          Coordenadas: {lat.toFixed(4)}, {lng.toFixed(4)} · Puede tomar hasta 60 segundos.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/30 dark:bg-amber-900/10">
        <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>
        <button onClick={cargar}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-fieldcredit-teal hover:underline">
          <RefreshCw size={12} /> Reintentar
        </button>
      </div>
    );
  }

  if (!perfil) return null;

  const scoreColor =
    perfil.scoreClimatico >= 70 ? "text-green-600 dark:text-green-400" :
    perfil.scoreClimatico >= 40 ? "text-amber-600 dark:text-amber-400" :
    "text-red-600 dark:text-red-400";

  const scoreBg =
    perfil.scoreClimatico >= 70 ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/40" :
    perfil.scoreClimatico >= 40 ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/40" :
    "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/40";

  // Datos para el gráfico de precipitación
  const datosGrafico = perfil.chirps90?.datos
    .filter((_, i) => i % 3 === 0) // cada 3 días para no saturar
    .map((d) => ({
      fecha: d.fecha.split("/").slice(0, 2).join("/"),
      mm: Math.round(d.valor * 100) / 100,
    })) ?? [];

  if (modoCompacto) {
    return (
      <div className={`flex items-center gap-3 rounded-lg border p-3 ${scoreBg}`}>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/60 dark:bg-slate-800/60">
          <Leaf size={18} className={scoreColor} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Score climático ARS: <span className={scoreColor}>{perfil.scoreClimatico}/100</span>
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {perfil.resumenTexto.substring(0, 120)}
            {perfil.resumenTexto.length > 120 ? "..." : ""}
          </p>
        </div>
        {(perfil.alertaSequia || perfil.alertaExceso) && (
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-fieldcredit-teal/30 bg-white p-4 dark:border-teal-700/30 dark:bg-slate-800">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf size={16} className="text-fieldcredit-teal" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Perfil climático de la parcela
          </h3>
        </div>
        <button onClick={cargar}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
          <RefreshCw size={14} />
        </button>
      </div>

      <p className="mb-3 text-[10px] text-slate-400">
        Fuente: NASA SERVIR ClimateSERV · CHIRPS + ESI · Coord: {lat.toFixed(4)}, {lng.toFixed(4)}
        {departamento ? ` · ${departamento}` : ""}
      </p>

      {/* Score y alertas */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className={`rounded-lg border p-3 text-center ${scoreBg}`}>
          <p className="text-[10px] text-slate-500">Score climático</p>
          <p className={`text-2xl font-bold ${scoreColor}`}>{perfil.scoreClimatico}</p>
          <p className="text-[10px] text-slate-400">/100</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
          <CloudRain size={16} className="mx-auto mb-1 text-blue-400" />
          <p className="text-[10px] text-slate-500">Precip. 90 días</p>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {perfil.chirps90 ? `${Math.round(perfil.chirps90.acumulado)} mm` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
          <Thermometer size={16} className="mx-auto mb-1 text-amber-400" />
          <p className="text-[10px] text-slate-500">ESI (estrés)</p>
          <p className={`text-sm font-bold ${
            perfil.esi && perfil.esi.promedio < -1.5
              ? "text-red-600 dark:text-red-400"
              : "text-slate-700 dark:text-slate-200"
          }`}>
            {perfil.esi ? perfil.esi.promedio.toFixed(2) : "—"}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {(perfil.alertaSequia || perfil.alertaExceso) && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg border p-3 ${
          perfil.alertaSequia ? "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/10" :
          "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10"
        }`}>
          <AlertTriangle size={14} className={perfil.alertaSequia ? "text-red-500" : "text-amber-500"} />
          <p className={`text-xs ${perfil.alertaSequia ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
            {perfil.alertaSequia
              ? "Déficit hídrico significativo detectado. La precipitación acumulada está muy por debajo del promedio histórico. Considerar reprogramar cuotas o evaluar cobertura de microseguro."
              : "Precipitación excesiva detectada. Riesgo de pérdida de cosecha por exceso de humedad, plagas y acceso a caminos."}
          </p>
        </div>
      )}

      {/* Gráfico de precipitación */}
      {datosGrafico.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            Precipitación diaria — últimos 90 días (CHIRPS)
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={datosGrafico}>
              <defs>
                <linearGradient id="gradLluvia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#45ada2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#45ada2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}mm`} />
              <Tooltip formatter={(v: number) => fmtMm(v)}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="mm" stroke="#45ada2" strokeWidth={1.5}
                fill="url(#gradLluvia)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resumen textual */}
      <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
        <p className="text-xs text-slate-600 dark:text-slate-300">{perfil.resumenTexto}</p>
      </div>

      <p className="mt-2 text-[10px] text-slate-400">
        Datos de referencia: CHIRPS (Climate Hazards Group, UCSB) y ESI (USDA). Los promedios
        históricos son orientativos. El score climático es una variable del AgroResilia Score, no
        un dictamen. Fuente gratuita, sin costo de API.
      </p>
    </div>
  );
}
