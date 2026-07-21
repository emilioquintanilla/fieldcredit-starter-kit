// Hook para capturar ubicación GPS + geocodificación inversa con Nominatim
import { useState } from "react";

export interface UbicacionCapturada {
  lat: number;
  lng: number;
  precision: number;
  precisionBaja: boolean;
  direccionNominatim?: string | null;
  departamento?: string | null;
  municipio?: string | null;
  timestamp: string;
  metodo: "gps" | "manual";
}

export type EstadoCaptura = "idle" | "capturando" | "geocodificando" | "listo" | "error";

export function useCapturarGPS() {
  const [estado, setEstado] = useState<EstadoCaptura>("idle");
  const [error, setError] = useState<string | null>(null);

  const capturar = (onExito: (u: UbicacionCapturada) => void, onError?: (msg: string) => void) => {
    setEstado("capturando");
    setError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const msg = "Este dispositivo no soporta GPS";
      setError(msg);
      setEstado("error");
      onError?.(msg);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        setEstado("geocodificando");
        const precisionBaja = accuracy > 50;

        let direccionNominatim: string | null = null;
        let departamento: string | null = null;
        let municipio: string | null = null;

        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es&addressdetails=1`,
            { headers: { "Accept-Language": "es" } },
          );
          const data = await resp.json();
          if (data?.display_name) {
            direccionNominatim = data.display_name;
            departamento = data.address?.state ?? null;
            municipio =
              data.address?.county ??
              data.address?.city ??
              data.address?.town ??
              data.address?.village ??
              null;
          }
        } catch (e) {
          console.warn("Nominatim no disponible:", e);
        }

        setEstado("listo");
        onExito({
          lat,
          lng,
          precision: accuracy,
          precisionBaja,
          direccionNominatim,
          departamento,
          municipio,
          timestamp: new Date().toISOString(),
          metodo: "gps",
        });
      },
      (err) => {
        const mensajes: Record<number, string> = {
          1: "Permiso de ubicación denegado. Ve a Ajustes y activa el GPS para esta app.",
          2: "No se pudo obtener la ubicación. Verifica que el GPS esté activado.",
          3: "Tiempo de espera agotado. Intenta en un lugar más abierto.",
        };
        const msg = mensajes[err.code] || "Error al obtener la ubicación";
        setError(msg);
        setEstado("error");
        onError?.(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const reset = () => {
    setEstado("idle");
    setError(null);
  };

  return { capturar, estado, error, reset };
}
