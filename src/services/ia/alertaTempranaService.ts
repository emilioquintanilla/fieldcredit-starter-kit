/**
 * Motor de alerta temprana de mora.
 *
 * Produce un ranking de riesgo de los créditos activos usando señales
 * heurísticas (sin ML por ahora — ese es el siguiente paso cuando exista
 * el loan tape del core). Cada crédito recibe un score de 0-100 donde
 * 100 = riesgo máximo de caer en mora en los próximos 30 días.
 *
 * Variables usadas:
 *   - Días de atraso actual
 *   - Cuotas vencidas sin pagar
 *   - Severidad de alertas climáticas en la zona del cliente
 *   - Estacionalidad del rubro (si hay cosecha próxima, baja el riesgo)
 *   - Saldo relativo (créditos con mayor saldo pesan más en el PAR)
 *
 * Ruta: src/services/ia/alertaTempranaService.ts
 */
import type { CreditoCartera, ExposicionClimatica } from "@/services/core/tipos";

export type NivelRiesgo = "critico" | "alto" | "medio" | "bajo";

export interface CreditoEnRiesgo {
  credito: CreditoCartera;
  scoreRiesgo: number;        // 0-100, mayor = más riesgo
  nivel: NivelRiesgo;
  factores: string[];         // razones legibles por el asesor
  accionSugerida: string;
}

// Mes actual → estacionalidad por rubro
const MES_COSECHA: Record<string, number[]> = {
  "Frijol":    [7, 8, 11, 12],  // primera (jul-ago) y postrera (nov-dic)
  "Maíz":      [7, 8, 11, 12],
  "Café":      [11, 12, 1, 2],  // cosecha oct-feb
  "Sorgo":     [3, 4, 9, 10],
  "Ganado":    [],               // flujo relativamente continuo
  "Hortalizas":[1, 2, 5, 6, 9, 10],
};

function mesActual(): number {
  return new Date().getMonth() + 1;
}

function mesProximo(): number {
  return (mesActual() % 12) + 1;
}

function proximaCosecha(rubro?: string | null): boolean {
  if (!rubro) return false;
  const meses = MES_COSECHA[rubro] ?? [];
  return meses.includes(mesActual()) || meses.includes(mesProximo());
}

function tieneAlertaClimatica(
  credito: CreditoCartera,
  alertas: ExposicionClimatica[],
): ExposicionClimatica | undefined {
  return alertas.find(
    (a) =>
      a.departamento === credito.departamento &&
      (!a.municipio || a.municipio === credito.municipio),
  );
}

export function calcularRiesgoMora(
  creditos: CreditoCartera[],
  alertasClimaticas: ExposicionClimatica[],
): CreditoEnRiesgo[] {
  const mes = mesActual();
  const resultados: CreditoEnRiesgo[] = [];

  for (const c of creditos) {
    if (c.estado !== "vigente" && c.estado !== "reestructurado") continue;
    if (c.bucket_mora === "par_90_mas") continue; // ya en mora pesada

    let score = 0;
    const factores: string[] = [];

    // Factor 1: días de atraso actual (peso: 40 puntos máx)
    const dias = c.dias_atraso ?? 0;
    if (dias === 0) {
      score += 0;
    } else if (dias <= 7) {
      score += 15;
      factores.push(`${dias} días de atraso`);
    } else if (dias <= 15) {
      score += 25;
      factores.push(`${dias} días de atraso`);
    } else if (dias <= 30) {
      score += 35;
      factores.push(`${dias} días de atraso (en PAR 30)`);
    } else {
      score += 40;
      factores.push(`${dias} días de atraso (PAR 31-90)`);
    }

    // Factor 2: cuotas vencidas acumuladas (peso: 20 puntos máx)
    const cv = c.cuotas_vencidas ?? 0;
    if (cv === 1) { score += 10; factores.push("1 cuota vencida"); }
    else if (cv === 2) { score += 15; factores.push("2 cuotas vencidas"); }
    else if (cv >= 3) { score += 20; factores.push(`${cv} cuotas vencidas`); }

    // Factor 3: alerta climática activa en la zona (peso: 25 puntos máx)
    const alerta = tieneAlertaClimatica(c, alertasClimaticas);
    if (alerta) {
      const puntosClima: Record<string, number> = {
        critica: 25, alta: 18, media: 10, baja: 3,
      };
      const pts = puntosClima[alerta.severidad] ?? 0;
      score += pts;
      if (pts >= 10) {
        factores.push(
          `Alerta climática ${alerta.severidad}: "${alerta.titulo}" en ${alerta.departamento}`,
        );
      }
      // Descuento si tiene microseguro
      if (c.microseguro) {
        score -= Math.round(pts * 0.4);
        factores.push("Microseguro paramétrico activo (-riesgo)");
      }
    }

    // Factor 4: estacionalidad del rubro (peso: -10 si hay cosecha próxima)
    if (proximaCosecha(c.rubro)) {
      score -= 10;
      factores.push(`Cosecha de ${c.rubro} próxima — flujo esperado (+)`);
    }

    // Factor 5: saldo relativo alto aumenta prioridad de visita
    if (c.saldo_capital > 100_000) {
      score += 5;
      factores.push("Saldo alto — prioridad de seguimiento");
    }

    // Clamp 0-100
    score = Math.min(100, Math.max(0, score));

    // Solo incluir créditos con riesgo real
    if (score < 5 && dias === 0) continue;

    const nivel: NivelRiesgo =
      score >= 60 ? "critico" :
      score >= 35 ? "alto"    :
      score >= 15 ? "medio"   : "bajo";

    const accionSugerida =
      nivel === "critico"
        ? "Visita de campo urgente. Contactar al cliente hoy."
        : nivel === "alto"
        ? "Llamada de seguimiento en las próximas 48 horas."
        : nivel === "medio"
        ? "Monitoreo preventivo. Agendar llamada esta semana."
        : "Seguimiento rutinario al próximo vencimiento.";

    resultados.push({ credito: c, scoreRiesgo: score, nivel, factores, accionSugerida });
  }

  // Ordenar por score descendente
  resultados.sort((a, b) => b.scoreRiesgo - a.scoreRiesgo);
  return resultados;
}

/** Top N créditos en riesgo para el dashboard del asesor */
export function topEnRiesgo(
  creditos: CreditoCartera[],
  alertas: ExposicionClimatica[],
  limite = 5,
): CreditoEnRiesgo[] {
  return calcularRiesgoMora(creditos, alertas).slice(0, limite);
}
