// Mini mapa estático (imagen) — sin API key, con fallback
import { useState } from "react";

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
}

export function MapaMini({ lat, lng, zoom = 15 }: Props) {
  const [error, setError] = useState(false);
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=400x150&markers=${lat},${lng},red-pushpin`;

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400 dark:bg-slate-700 dark:text-slate-500">
        🗺 Ver en mapa →
      </div>
    );
  }
  return (
    <img
      src={url}
      alt="Ubicación en el mapa"
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}
