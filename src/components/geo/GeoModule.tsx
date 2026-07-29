// Módulo de geolocalización: captura y visualización de ubicaciones del expediente
import { lazy, Suspense, useState } from "react";
import { useExpedientes, type TipoUbicacion, type UbicacionGeo } from "@/stores/expedientes";
import { useApp } from "@/stores/app";
import { useCapturarGPS } from "@/hooks/useCapturarGPS";
import { TarjetaUbicacion } from "./TarjetaUbicacion";
import { cn } from "@/lib/utils";

// Leaflet solo en el cliente
const MapaExpediente = lazy(() => import("./MapaExpediente"));

type Estado = "pendiente" | "progreso" | "completo" | "alerta";

// Estado del módulo geo — usado por la barra de tabs
import { PerfilClimatico } from "@/components/climatico/PerfilClimatico";

export function estadoGeoStatus(exp: { geolocalizacion?: Partial<Record<TipoUbicacion, UbicacionGeo | null>> } | undefined): Estado {
  const g = exp?.geolocalizacion;
  if (!g) return "pendiente";
  const dom = !!g.domicilioDeudor?.lat;
  const neg = !!g.negocioDeudor?.lat;
  if (dom && neg) return "completo";
  if (dom || neg || g.domicilioFiador?.lat || g.negocioFiador?.lat) return "progreso";
  return "pendiente";
}

const navegarConGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener,noreferrer");
};
const abrirEnOSM = (lat: number, lng: number) => {
  window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`, "_blank", "noopener,noreferrer");
};

interface Props {
  expedienteId: string;
  aplicaFiador: boolean;
  fiadorTieneNegocio?: boolean;
}

export function GeoModule({ expedienteId, aplicaFiador, fiadorTieneNegocio }: Props) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);
  const guardarUbicacion = useExpedientes((s) => s.guardarUbicacion);
  const actualizarDireccionTexto = useExpedientes((s) => s.actualizarDireccionTexto);
  const usuario = useApp((s) => s.usuario);
  const { capturar, estado, error, reset } = useCapturarGPS();
  const [modoManual, setModoManual] = useState<TipoUbicacion | null>(null);
  const [latManual, setLatManual] = useState("");
  const [lngManual, setLngManual] = useState("");
  const [vistaMovil, setVistaMovil] = useState<"captura" | "mapa">("captura");

  const geo = exp?.geolocalizacion ?? {};
  const nombreAsesor = usuario?.nombre ?? "Asesor";

  const handleCapturar = (tipo: TipoUbicacion) => {
    capturar((u) => {
      guardarUbicacion(expedienteId, tipo, { ...u, capturadoPor: nombreAsesor });
    });
  };

  const handleTexto = (tipo: TipoUbicacion, texto: string) => {
    actualizarDireccionTexto(expedienteId, tipo, texto);
  };

  const guardarManual = () => {
    if (!modoManual) return;
    const lat = parseFloat(latManual);
    const lng = parseFloat(lngManual);
    if (!isFinite(lat) || !isFinite(lng)) return;
    guardarUbicacion(expedienteId, modoManual, {
      lat,
      lng,
      precision: 0,
      precisionBaja: false,
      timestamp: new Date().toISOString(),
      metodo: "manual",
      capturadoPor: nombreAsesor,
    });
    setModoManual(null);
    setLatManual("");
    setLngManual("");
    reset();
  };

  const tarjetas: { tipo: TipoUbicacion; titulo: string; subtitulo: string; visible: boolean }[] = [
    { tipo: "domicilioDeudor", titulo: "📍 Domicilio del deudor", subtitulo: "Vivienda principal del solicitante", visible: true },
    { tipo: "negocioDeudor", titulo: "🏪 Negocio del deudor", subtitulo: "Lugar de trabajo o unidad productiva", visible: true },
    { tipo: "domicilioFiador", titulo: "📍 Domicilio del fiador", subtitulo: "Vivienda del garante", visible: aplicaFiador },
    { tipo: "negocioFiador", titulo: "🏪 Negocio del fiador", subtitulo: "Lugar de trabajo del garante", visible: aplicaFiador && !!fiadorTieneNegocio },
  ];

  const leyenda: { tipo: TipoUbicacion; label: string; color: string; visible: boolean }[] = [
    { tipo: "domicilioDeudor", label: "Domicilio del deudor", color: "#5eb837", visible: true },
    { tipo: "negocioDeudor", label: "Negocio del deudor", color: "#45ada2", visible: true },
    { tipo: "domicilioFiador", label: "Domicilio del fiador", color: "#f59e0b", visible: aplicaFiador },
    { tipo: "negocioFiador", label: "Negocio del fiador", color: "#f97316", visible: aplicaFiador && !!fiadorTieneNegocio },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs móviles */}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 lg:hidden dark:border-slate-700 dark:bg-slate-800">
        <button
          onClick={() => setVistaMovil("captura")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            vistaMovil === "captura" ? "bg-fieldcredit-green text-white" : "text-slate-600 dark:text-slate-300",
          )}
        >
          📍 Capturar
        </button>
        <button
          onClick={() => setVistaMovil("mapa")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            vistaMovil === "mapa" ? "bg-fieldcredit-green text-white" : "text-slate-600 dark:text-slate-300",
          )}
        >
          🗺 Ver mapa
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Panel captura */}
        <div className={cn("space-y-3", vistaMovil === "mapa" && "hidden lg:block")}>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">⚠️ No se pudo capturar la ubicación</p>
              <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={reset}
                className="rounded-lg border border-red-300 px-3 py-1 text-xs font-bold text-red-600 dark:text-red-400"
              >
                Cerrar
              </button>
            </div>
          )}

          {modoManual && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="mb-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                ✏ Ingreso manual de coordenadas
              </p>
              <div className="mb-2 flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Latitud</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="12.8654"
                    value={latManual}
                    onChange={(e) => setLatManual(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Longitud</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="-86.3621"
                    value={lngManual}
                    onChange={(e) => setLngManual(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <p className="mb-3 text-[11px] text-slate-400">
                💡 Puedes obtener las coordenadas abriendo Google Maps, tocando el punto y copiando los números.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={guardarManual}
                  className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-bold text-white"
                >
                  Guardar coordenadas
                </button>
                <button
                  onClick={() => setModoManual(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Deudor
          </div>
          {tarjetas
            .filter((t) => t.visible && (t.tipo === "domicilioDeudor" || t.tipo === "negocioDeudor"))
            .map((t) => (
              <TarjetaUbicacion
                key={t.tipo}
                tipo={t.tipo}
                titulo={t.titulo}
                subtitulo={t.subtitulo}
                ubicacion={geo[t.tipo]}
                onCapturar={handleCapturar}
                onActualizarTexto={handleTexto}
                onNavegar={navegarConGoogleMaps}
                onVerMapa={abrirEnOSM}
              />
            ))}

          {aplicaFiador && (
            <>
              <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Fiador
              </div>
              {tarjetas
                .filter((t) => t.visible && (t.tipo === "domicilioFiador" || t.tipo === "negocioFiador"))
                .map((t) => (
                  <TarjetaUbicacion
                    key={t.tipo}
                    tipo={t.tipo}
                    titulo={t.titulo}
                    subtitulo={t.subtitulo}
                    ubicacion={geo[t.tipo]}
                    onCapturar={handleCapturar}
                    onActualizarTexto={handleTexto}
                    onNavegar={navegarConGoogleMaps}
                    onVerMapa={abrirEnOSM}
                  />
                ))}
            </>
          )}

          <button
            onClick={() => setModoManual("domicilioDeudor")}
            className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            ✏ Ingresar coordenadas manualmente
          </button>
        </div>

        {/* Panel mapa */}
        <div className={cn("space-y-3", vistaMovil === "captura" && "hidden lg:block")}>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" style={{ height: "460px" }}>
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400 dark:bg-slate-800">
                  Cargando mapa...
                </div>
              }
            >
              <MapaExpediente ubicaciones={geo} />
            </Suspense>
          </div>

          {/* Leyenda */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Puntos del expediente</p>
            {leyenda
              .filter((l) => l.visible)
              .map(({ tipo, label, color }) => {
                const ub = geo[tipo];
                const capturado = !!ub?.lat;
                return (
                  <div
                    key={tipo}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: color }} />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    </div>
                    {capturado && ub ? (
                      <button
                        onClick={() => navegarConGoogleMaps(ub.lat, ub.lng)}
                        className="text-xs font-bold text-fieldcredit-teal underline"
                      >
                        🧭 Navegar
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">⚪ Pendiente</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Perfil climático de la parcela — datos NASA ClimateSERV */}
      {geo.negocioDeudor?.lat && geo.negocioDeudor?.lng && (
        <div className="mt-4">
          <PerfilClimatico
            lat={geo.negocioDeudor.lat}
            lng={geo.negocioDeudor.lng}
            departamento={geo.negocioDeudor.departamento ?? exp?.data?.departamento_residencia}
          />
        </div>
      )}

      {/* Overlay de captura */}
      {(estado === "capturando" || estado === "geocodificando") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-slate-800">
            {estado === "capturando" ? (
              <>
                <div className="mb-4 animate-bounce text-5xl">📡</div>
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                  Obteniendo ubicación GPS
                </h3>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  Asegúrate de estar <strong>en el lugar</strong> que vas a registrar. Puede tomar hasta 15 segundos.
                </p>
                <div className="flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-fieldcredit-green border-t-transparent" />
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 text-5xl">🗺</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  ✅ GPS capturado. Obteniendo dirección...
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
