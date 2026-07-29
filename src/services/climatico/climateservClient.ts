/**
 * Cliente ClimateSERV — datos climáticos gratuitos de NASA SERVIR.
 * Sin API key, sin costo. Cobertura global incluyendo Nicaragua.
 *
 * Datasets para el ARS:
 *   datatype 0:   CHIRPS Rainfall (diario, 1981-presente, mm/día)
 *   datatype 29:  ESI 4-week (semanal, 2000-presente, estrés vegetativo)
 *
 * La API es asíncrona: submit → poll → get results.
 * Ruta: src/services/climatico/climateservClient.ts
 */

const BASE = "https://climateserv.servirglobal.net/api";

export interface DatosClimaticos { fecha: string; valor: number; }

export interface ResumenClimatico {
  dataset: string;
  periodo: { inicio: string; fin: string };
  datos: DatosClimaticos[];
  promedio: number;
  acumulado: number;
  minimo: number;
  maximo: number;
}

export type DatasetId = 0 | 29;

const DATASET_NOMBRE: Record<DatasetId, string> = {
  0:  "CHIRPS Precipitación",
  29: "ESI Estrés Vegetativo (4 semanas)",
};

function crearPoligono(lat: number, lng: number, bufferKm = 0.5): string {
  const dLat = bufferKm / 111;
  const dLng = bufferKm / (111 * Math.cos((lat * Math.PI) / 180));
  return JSON.stringify({
    type: "Polygon",
    coordinates: [[[lng-dLng,lat-dLat],[lng+dLng,lat-dLat],[lng+dLng,lat+dLat],[lng-dLng,lat+dLat],[lng-dLng,lat-dLat]]],
  });
}

function fmtFecha(d: Date): string {
  return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`;
}

async function fetchT(url: string, ms = 15000): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { signal: c.signal }); }
  finally { clearTimeout(t); }
}

export async function consultarClimateSERV(
  lat: number, lng: number, datatype: DatasetId, diasAtras: number, operacion = 5,
): Promise<ResumenClimatico | null> {
  const ahora = new Date();
  const inicio = new Date(ahora);
  inicio.setDate(inicio.getDate() - diasAtras);

  const params = new URLSearchParams({
    datatype: String(datatype), begintime: fmtFecha(inicio), endtime: fmtFecha(ahora),
    intervaltype: "0", operationtype: String(operacion),
    dateType_Category: "default", isZip_CurrentDataType: "false",
    geometry: crearPoligono(lat, lng),
  });

  try {
    const submitRes = await fetchT(`${BASE}/submitDataRequest/?${params}`);
    const submitText = await submitRes.text();
    const jobId = submitText.replace(/[\[\]"]/g, "").trim();
    if (!jobId || jobId.length < 10) return null;

    let progreso = 0; let intentos = 0;
    while (progreso < 100 && intentos < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      intentos++;
      try {
        const pRes = await fetchT(`${BASE}/getDataRequestProgress/?id=${jobId}`);
        progreso = parseFloat((await pRes.text()).replace(/[\[\]]/g, ""));
        if (progreso < 0) return null;
      } catch { /* timeout poll */ }
    }
    if (progreso < 100) return null;

    const dataRes = await fetchT(`${BASE}/getDataFromRequest/?id=${jobId}`, 30000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataJson = await dataRes.json() as any;
    if (!dataJson.data?.length) return null;

    const opKey = operacion === 5 ? "avg" : operacion === 0 ? "max" : "sum";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datos: DatosClimaticos[] = dataJson.data
      .map((d: any) => ({ fecha: d.date, valor: d.value[opKey] ?? Object.values(d.value)[0] ?? 0 }))
      .filter((d: DatosClimaticos) => d.valor !== -9999 && isFinite(d.valor));
    if (!datos.length) return null;

    const vals = datos.map((d) => d.valor);
    return {
      dataset: DATASET_NOMBRE[datatype], periodo: { inicio: fmtFecha(inicio), fin: fmtFecha(ahora) },
      datos, promedio: vals.reduce((s,v)=>s+v,0)/vals.length, acumulado: vals.reduce((s,v)=>s+v,0),
      minimo: Math.min(...vals), maximo: Math.max(...vals),
    };
  } catch (e) { console.error("[ClimateSERV]", e); return null; }
}

// ── Perfil climático completo para una parcela ──────────────────────────────
export interface PerfilClimaticoParcela {
  lat: number; lng: number;
  chirps90: ResumenClimatico | null;
  chirps30: ResumenClimatico | null;
  esi: ResumenClimatico | null;
  alertaSequia: boolean;
  alertaExceso: boolean;
  scoreClimatico: number;
  resumenTexto: string;
}

const PRECIP_REF_90D: Record<string, { min: number; promedio: number; max: number }> = {
  "Boaco":      { min: 180, promedio: 340, max: 520 },
  "Estelí":     { min: 200, promedio: 380, max: 580 },
  "Jinotega":   { min: 250, promedio: 420, max: 650 },
  "Matagalpa":  { min: 230, promedio: 400, max: 600 },
  "Chinandega": { min: 200, promedio: 360, max: 540 },
  "León":       { min: 190, promedio: 350, max: 530 },
  "Managua":    { min: 160, promedio: 300, max: 480 },
  "Rivas":      { min: 220, promedio: 390, max: 570 },
  "default":    { min: 200, promedio: 360, max: 550 },
};

export async function obtenerPerfilClimatico(
  lat: number, lng: number, departamento?: string,
): Promise<PerfilClimaticoParcela> {
  const [chirps90, chirps30, esi] = await Promise.all([
    consultarClimateSERV(lat, lng, 0, 90, 5),
    consultarClimateSERV(lat, lng, 0, 30, 5),
    consultarClimateSERV(lat, lng, 29, 28, 5),
  ]);

  const ref = PRECIP_REF_90D[departamento ?? ""] ?? PRECIP_REF_90D["default"];
  const precipAcum90 = chirps90?.acumulado ?? 0;
  const alertaSequia = precipAcum90 > 0 && precipAcum90 < ref.min * 0.7;
  const alertaExceso = precipAcum90 > ref.max * 1.3;
  const esiProm = esi?.promedio ?? 0;
  const estres = esiProm < -1.5;

  let score = 70;
  if (precipAcum90 > 0) {
    const ratio = precipAcum90 / ref.promedio;
    if (ratio >= 0.8 && ratio <= 1.3) score += 15;
    else if (ratio >= 0.5) score -= 10;
    else if (ratio < 0.5) score -= 30;
    if (ratio > 1.6) score -= 20;
    else if (ratio > 1.3) score -= 5;
  }
  if (estres) score -= 15;
  if (esiProm > 0.5) score += 10;
  score = Math.min(100, Math.max(0, score));

  const partes: string[] = [];
  if (chirps90 && precipAcum90 > 0)
    partes.push(`Precipitación 90d: ${Math.round(precipAcum90)}mm (${Math.round((precipAcum90/ref.promedio)*100)}% del promedio histórico).`);
  if (chirps30)
    partes.push(`Lluvia 30d: ${chirps30.promedio.toFixed(1)}mm/día promedio.`);
  if (esi)
    partes.push(`ESI 4sem: ${esiProm.toFixed(2)}${estres ? " — ESTRÉS DETECTADO" : ""}.`);
  if (alertaSequia) partes.push("⚠️ Déficit hídrico significativo.");
  if (alertaExceso) partes.push("⚠️ Precipitación excesiva.");
  if (!partes.length) partes.push("Sin datos climáticos disponibles.");

  return { lat, lng, chirps90, chirps30, esi, alertaSequia, alertaExceso, scoreClimatico: score, resumenTexto: partes.join(" ") };
}
