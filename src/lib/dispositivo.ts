// Detección de dispositivo (modelo, SO, navegador) e IP pública del cliente.
// Se usa para la auditoría de inicio de sesión.

export interface InfoDispositivo {
  modelo: string;
  tipo: "móvil" | "tablet" | "escritorio";
  so: string;
  navegador: string;
  pantalla: string;
  userAgent: string;
}

function detectarModelo(ua: string): string {
  const patrones: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/\((iPhone)[^)]*\)/i, () => "Apple iPhone"],
    [/\((iPad)[^)]*\)/i, () => "Apple iPad"],
    [/Macintosh/i, () => "Apple Mac"],
    [/Android[^;]*;\s*([^;)]+?)\s*(?:Build|\))/i, (m) => m[1].trim()],
    [/Windows NT 10\.0/i, () => "PC Windows 10/11"],
    [/Windows NT ([\d.]+)/i, (m) => `PC Windows NT ${m[1]}`],
    [/CrOS/i, () => "Chromebook"],
    [/Linux/i, () => "PC Linux"],
  ];
  for (const [re, fmt] of patrones) {
    const m = ua.match(re);
    if (m) return fmt(m);
  }
  return "Desconocido";
}

function detectarSO(ua: string): string {
  const m =
    ua.match(/Android\s+([\d.]+)/i) ||
    ua.match(/(?:iPhone )?OS\s+([\d_]+)\s+like Mac/i);
  if (m) return /Android/i.test(ua) ? `Android ${m[1]}` : `iOS ${m[1].replace(/_/g, ".")}`;
  if (/Mac OS X ([\d_]+)/i.test(ua)) return `macOS ${RegExp.$1.replace(/_/g, ".")}`;
  if (/Windows NT 10\.0/i.test(ua)) return "Windows 10/11";
  if (/Windows NT ([\d.]+)/i.test(ua)) return `Windows NT ${RegExp.$1}`;
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Desconocido";
}

function detectarNavegador(ua: string): string {
  const m =
    ua.match(/(Edg|EdgA)\/([\d.]+)/) ||
    ua.match(/(OPR|Opera)\/([\d.]+)/) ||
    ua.match(/(Chrome)\/([\d.]+)/) ||
    ua.match(/(Firefox)\/([\d.]+)/) ||
    ua.match(/Version\/([\d.]+).*(Safari)/);
  if (!m) return "Desconocido";
  const nombre = (m[1] === "Edg" || m[1] === "EdgA" ? "Edge" : m[1] === "OPR" ? "Opera" : m[2] === "Safari" ? "Safari" : m[1]) as string;
  const version = m[2] === "Safari" ? m[1] : m[2];
  return `${nombre} ${version.split(".")[0]}`;
}

export function obtenerDispositivo(): InfoDispositivo {
  if (typeof navigator === "undefined") {
    return {
      modelo: "Servidor",
      tipo: "escritorio",
      so: "-",
      navegador: "-",
      pantalla: "-",
      userAgent: "-",
    };
  }
  const ua = navigator.userAgent;
  const esTablet = /iPad|Tablet|Nexus 7|SM-T/i.test(ua);
  const esMovil = !esTablet && /Mobi|Android|iPhone/i.test(ua);
  return {
    modelo: detectarModelo(ua),
    tipo: esTablet ? "tablet" : esMovil ? "móvil" : "escritorio",
    so: detectarSO(ua),
    navegador: detectarNavegador(ua),
    pantalla: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
    userAgent: ua,
  };
}

/** IP pública del cliente (best effort, no bloquea el login). */
export async function obtenerIpCliente(): Promise<string | null> {
  try {
    const res = await fetch("/api/public/ip", { cache: "no-store" });
    if (res.ok) {
      const { ip } = (await res.json()) as { ip: string | null };
      if (ip) return ip;
    }
  } catch {
    /* ignorar */
  }
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (res.ok) {
      const { ip } = (await res.json()) as { ip?: string };
      return ip ?? null;
    }
  } catch {
    /* ignorar */
  }
  return null;
}

export function describirDispositivo(d: InfoDispositivo): string {
  return `${d.modelo} (${d.tipo}) · ${d.so} · ${d.navegador}`;
}
