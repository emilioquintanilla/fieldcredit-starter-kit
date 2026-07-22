// Parseo robusto del dictamen que devuelve la IA. Tolera fences ```json y texto extra.
import type { DictamenIA } from "@/stores/expedientes";

export function parsearDictamenIA(texto: string): DictamenIA {
  const limpio = texto.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Intenta parsear todo, si falla busca el primer bloque { ... }.
  const intentar = (s: string): DictamenIA | null => {
    try {
      return JSON.parse(s) as DictamenIA;
    } catch {
      return null;
    }
  };

  let parsed = intentar(limpio);
  if (!parsed) {
    const primerBrace = limpio.indexOf("{");
    const ultimoBrace = limpio.lastIndexOf("}");
    if (primerBrace !== -1 && ultimoBrace > primerBrace) {
      parsed = intentar(limpio.slice(primerBrace, ultimoBrace + 1));
    }
  }

  if (parsed && typeof parsed.score === "number" && parsed.semaforo) {
    return {
      score: Math.max(0, Math.min(100, parsed.score)),
      semaforo: parsed.semaforo,
      resumen: parsed.resumen || "",
      banderas: Array.isArray(parsed.banderas) ? parsed.banderas : [],
      metricas: {
        capacidadPago: parsed.metricas?.capacidadPago ?? 0,
        coberturaFlujo: parsed.metricas?.coberturaFlujo ?? 0,
        indiceEndeudamiento: parsed.metricas?.indiceEndeudamiento ?? 0,
        coberturaGarantias: parsed.metricas?.coberturaGarantias ?? 0,
      },
      scoreARS: parsed.scoreARS ?? null,
      recomendacion: parsed.recomendacion ?? {
        accion: "revisar",
        texto: "",
        condiciones: [],
      },
    };
  }

  // Fallback: dictamen mínimo con el texto crudo en el resumen para no romper la UI.
  return {
    score: 60,
    semaforo: "amarillo",
    resumen: texto.slice(0, 400) || "No se pudo interpretar la respuesta de la IA.",
    banderas: [
      { tipo: "amarillo", texto: "Respuesta de la IA no vino en JSON válido. Revisar dictamen manualmente." },
    ],
    metricas: { capacidadPago: 0, coberturaFlujo: 0, indiceEndeudamiento: 0, coberturaGarantias: 0 },
    scoreARS: null,
    recomendacion: { accion: "revisar", texto: texto.slice(0, 200), condiciones: [] },
  };
}
