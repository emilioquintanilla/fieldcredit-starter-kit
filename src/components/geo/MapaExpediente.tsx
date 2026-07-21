// Mapa interactivo Leaflet + OpenStreetMap (solo cliente)
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { UbicacionGeo, TipoUbicacion } from "@/stores/expedientes";

// Fix íconos de Leaflet con Vite
type IconDefaultProto = L.Icon.Default & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as IconDefaultProto)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const crearIcono = (color: string, emoji: string) =>
  L.divIcon({
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">${emoji}</span></div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

const ICONOS: Record<TipoUbicacion, L.DivIcon> = {
  domicilioDeudor: crearIcono("#5eb837", "🏠"),
  negocioDeudor: crearIcono("#45ada2", "🏪"),
  domicilioFiador: crearIcono("#f59e0b", "🏠"),
  negocioFiador: crearIcono("#f97316", "🏪"),
};

const TITULOS: Record<TipoUbicacion, string> = {
  domicilioDeudor: "Domicilio del deudor",
  negocioDeudor: "Negocio del deudor",
  domicilioFiador: "Domicilio del fiador",
  negocioFiador: "Negocio del fiador",
};

interface Punto extends UbicacionGeo {
  tipo: TipoUbicacion;
}

function AjustarVista({ puntos }: { puntos: Punto[] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    if (puntos.length === 1) {
      map.setView([puntos[0].lat, puntos[0].lng], 16);
      return;
    }
    const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [puntos, map]);
  return null;
}

interface Props {
  ubicaciones: Partial<Record<TipoUbicacion, UbicacionGeo | null>>;
}

export default function MapaExpediente({ ubicaciones }: Props) {
  const puntos: Punto[] = (Object.entries(ubicaciones) as [TipoUbicacion, UbicacionGeo | null | undefined][])
    .filter(([, u]) => !!u?.lat && !!u?.lng)
    .map(([tipo, u]) => ({ tipo, ...(u as UbicacionGeo) }));

  return (
    <MapContainer
      center={[12.8654, -85.2072]}
      zoom={7}
      style={{ width: "100%", height: "100%", minHeight: "400px", borderRadius: "12px" }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <AjustarVista puntos={puntos} />
      {puntos.map((p) => (
        <Marker key={p.tipo} position={[p.lat, p.lng]} icon={ICONOS[p.tipo]}>
          <Popup>
            <div className="min-w-48 p-1">
              <p className="mb-1 text-sm font-bold">{TITULOS[p.tipo]}</p>
              {p.direccionTextual && <p className="mb-1 text-xs text-gray-600">📝 {p.direccionTextual}</p>}
              {p.direccionNominatim && <p className="mb-2 text-xs text-gray-500">🗺 {p.direccionNominatim}</p>}
              <p className="mb-3 font-mono text-xs text-gray-400">
                {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-lg bg-fieldcredit-teal py-2 text-center text-xs font-bold text-white no-underline"
              >
                🧭 Navegar con Google Maps
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
