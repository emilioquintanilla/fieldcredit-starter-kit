// Tarjeta de captura de una ubicación (domicilio / negocio del deudor o fiador)
import type { UbicacionGeo, TipoUbicacion } from "@/stores/expedientes";
import { cn } from "@/lib/utils";

interface Props {
  tipo: TipoUbicacion;
  titulo: string;
  subtitulo: string;
  ubicacion: UbicacionGeo | null | undefined;
  onCapturar: (tipo: TipoUbicacion) => void;
  onActualizarTexto: (tipo: TipoUbicacion, texto: string) => void;
  onNavegar?: (lat: number, lng: number) => void;
  onVerMapa?: (lat: number, lng: number) => void;
}

function badgePrecision(p: number) {
  if (p <= 20) return "bg-fieldcredit-green-light text-fieldcredit-green-dark dark:bg-green-900/40 dark:text-green-200";
  if (p <= 50) return "bg-fieldcredit-amber-light text-fieldcredit-amber dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-fieldcredit-red-light text-fieldcredit-red dark:bg-red-900/40 dark:text-red-300";
}

export function TarjetaUbicacion({
  tipo,
  titulo,
  subtitulo,
  ubicacion,
  onCapturar,
  onActualizarTexto,
  onNavegar,
  onVerMapa,
}: Props) {
  const capturada = !!ubicacion?.lat;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Encabezado */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="text-xl leading-none">{capturada ? "✅" : "📍"}</span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitulo}</p>
          </div>
        </div>
        {capturada && (
          <button
            onClick={() => onCapturar(tipo)}
            className="text-xs text-fieldcredit-teal underline hover:text-fieldcredit-teal-dark"
          >
            Recapturar
          </button>
        )}
      </div>

      {/* Datos capturados */}
      {capturada && ubicacion && (
        <div className="mb-3 space-y-1.5 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span>🌐</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
            </span>
            {typeof ubicacion.precision === "number" && (
              <span className={cn("rounded-full px-2 py-0.5 font-medium", badgePrecision(ubicacion.precision))}>
                ±{Math.round(ubicacion.precision)}m{ubicacion.precision > 50 ? " ⚠" : ""}
              </span>
            )}
          </div>
          {ubicacion.direccionNominatim && (
            <p className="text-xs text-slate-600 dark:text-slate-400">🗺 {ubicacion.direccionNominatim}</p>
          )}
          <p className="text-[11px] text-slate-400">
            {new Date(ubicacion.timestamp).toLocaleString("es-NI")}
            {ubicacion.capturadoPor ? ` · ${ubicacion.capturadoPor}` : ""}
          </p>
          {ubicacion.precisionBaja && (
            <p className="text-[11px] text-fieldcredit-red">
              Precisión baja. Intenta recapturar en un lugar más abierto.
            </p>
          )}
        </div>
      )}

      {/* Dirección textual */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Dirección escrita (referencias locales)
        </label>
        <textarea
          rows={2}
          value={ubicacion?.direccionTextual ?? ""}
          onChange={(e) => onActualizarTexto(tipo, e.target.value)}
          placeholder="Ej: del parque 2 c al norte, casa esquinera azul..."
          className="w-full resize-none rounded-lg border border-slate-200 bg-yellow-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-fieldcredit-teal dark:border-slate-600 dark:bg-yellow-900/20 dark:text-slate-100"
        />
        <p className="mt-1 text-[11px] italic text-slate-400">
          💡 Las referencias locales ayudan a encontrar el lugar aunque el GPS no sea exacto
        </p>
      </div>

      {/* Botones */}
      {!capturada ? (
        <button
          onClick={() => onCapturar(tipo)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-fieldcredit-green px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-fieldcredit-green-dark"
        >
          <span>📍</span> Capturar GPS en este lugar
        </button>
      ) : ubicacion ? (
        <div className="flex gap-2">
          <button
            onClick={() => onVerMapa?.(ubicacion.lat, ubicacion.lng)}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-fieldcredit-teal bg-fieldcredit-teal-light px-3 py-2 text-xs font-bold text-fieldcredit-teal-dark dark:bg-teal-900/40"
          >
            🗺 Ver en mapa
          </button>
          <button
            onClick={() => onNavegar?.(ubicacion.lat, ubicacion.lng)}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-fieldcredit-green px-3 py-2 text-xs font-bold text-white hover:bg-fieldcredit-green-dark"
          >
            🧭 Navegar
          </button>
        </div>
      ) : null}
    </div>
  );
}
