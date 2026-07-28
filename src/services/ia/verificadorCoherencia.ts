/**
 * Verificador de coherencia de datos del expediente.
 *
 * Detecta declaraciones inverosímiles ANTES de que el expediente llegue al comité.
 * Compara lo declarado por el asesor contra rendimientos típicos de Nicaragua
 * (fuentes: INTA, MAG, INIDE ENIA 2023 — valores referenciales, no normativos).
 *
 * El verificador no bloquea — alerta al asesor para que confirme o corrija.
 * La decisión final siempre es humana.
 *
 * Ruta: src/services/ia/verificadorCoherencia.ts
 */
import type { ExpedienteBorrador } from "@/stores/expedientes";

export type SeveridadAlerta = "info" | "advertencia" | "critica";

export interface AlertaCoherencia {
  id: string;
  severidad: SeveridadAlerta;
  campo: string;
  mensaje: string;
  valorDeclarado?: string;
  referenciaUso?: string;
  sugerencia?: string;
}

// ── Rendimientos y precios de referencia Nicaragua ──────────────────────────
// Fuente: INTA 2023, MAGFOR, INIDE ENIA. Valores orientativos.
const REF = {
  frijol:      { qqMzMin: 5,   qqMzMax: 35,  precioMin: 600,  precioMax: 2500 },
  maiz:        { qqMzMin: 20,  qqMzMax: 100, precioMin: 200,  precioMax: 600  },
  cafe:        { qqMzMin: 6,   qqMzMax: 40,  precioMin: 1800, precioMax: 6000 },
  sorgo:       { qqMzMin: 30,  qqMzMax: 120, precioMin: 180,  precioMax: 450  },
  arroz:       { qqMzMin: 40,  qqMzMax: 150, precioMin: 350,  precioMax: 700  },
  hortaliza:   { qqMzMin: 100, qqMzMax: 800, precioMin: 150,  precioMax: 1200 },
  ganado:      { rendLecheMin: 3, rendLecheMax: 25 },     // litros/vaca/día
  comercio:    { margenMin: 0.05, margenMax: 0.60 },
  asalariado:  { salarioMinMensual: 6000, salarioMaxMensual: 80000 },
};

const CONSUMO_FAM_MIN_MENSUAL = 3000;   // C$/mes mínimo razonable Nicaragua rural
const CONSUMO_FAM_MAX_MENSUAL = 80000;  // C$/mes máximo razonable para microfinanzas
const MANZANA_MIN = 0.25;
const MANZANA_MAX = 100;

// ── Función principal ────────────────────────────────────────────────────────
export function verificarCoherencia(
  exp: ExpedienteBorrador | undefined,
): AlertaCoherencia[] {
  if (!exp) return [];
  const alertas: AlertaCoherencia[] = [];
  const d = exp.data || {};
  const flujo = exp.flujo;
  const fv = flujo?.valores ?? {};
  const plazo = flujo?.plazoMeses || d.plazo || 12;
  const mzanas = d.hectareas ?? 0; // el campo se llama hectareas pero almacena manzanas

  const suma = (key: string) =>
    (fv[key] ?? []).reduce((s, n) => s + (n || 0), 0);
  const promMensual = (key: string) =>
    plazo > 0 ? suma(key) / plazo : 0;
  const ingMensual = (key: string) => promMensual(key);

  // ── 1. Consumo familiar ──────────────────────────────────────────────────
  const consumoKeys = ["gastoHogar","alimentacion","educacion","salud","servicios","otrosHogar"];
  const consumoMensual = consumoKeys.reduce((s, k) => s + promMensual(k), 0);
  if (consumoMensual > 0 && consumoMensual < CONSUMO_FAM_MIN_MENSUAL) {
    alertas.push({
      id: "consumo_bajo",
      severidad: "advertencia",
      campo: "Gastos del hogar",
      mensaje: "El consumo familiar declarado parece muy bajo para Nicaragua rural.",
      valorDeclarado: `C$ ${Math.round(consumoMensual).toLocaleString("es-NI")}/mes`,
      referenciaUso: `Mínimo referencial: C$ ${CONSUMO_FAM_MIN_MENSUAL.toLocaleString("es-NI")}/mes`,
      sugerencia: "Confirmar si incluye alimentación, servicios básicos y educación de dependientes.",
    });
  }
  if (consumoMensual > CONSUMO_FAM_MAX_MENSUAL) {
    alertas.push({
      id: "consumo_alto",
      severidad: "advertencia",
      campo: "Gastos del hogar",
      mensaje: "El consumo familiar declarado es inusualmente alto para el segmento microfinanzas.",
      valorDeclarado: `C$ ${Math.round(consumoMensual).toLocaleString("es-NI")}/mes`,
      referenciaUso: `Máximo habitual: C$ ${CONSUMO_FAM_MAX_MENSUAL.toLocaleString("es-NI")}/mes`,
      sugerencia: "Verificar que no se duplicaron gastos del negocio y del hogar.",
    });
  }

  // ── 2. Área de terreno ───────────────────────────────────────────────────
  if (mzanas > 0) {
    if (mzanas < MANZANA_MIN) {
      alertas.push({
        id: "area_minima",
        severidad: "info",
        campo: "Área de terreno",
        mensaje: "Área declarada menor a un cuarto de manzana.",
        valorDeclarado: `${mzanas} mz`,
        sugerencia: "Confirmar unidad: ¿son manzanas o metros cuadrados?",
      });
    }
    if (mzanas > MANZANA_MAX) {
      alertas.push({
        id: "area_grande",
        severidad: "info",
        campo: "Área de terreno",
        mensaje: "Área declarada muy grande para el segmento de microfinanzas.",
        valorDeclarado: `${mzanas} mz`,
        sugerencia: "Verificar si corresponde a la parcela financiada o a toda la propiedad.",
      });
    }
  }

  // ── 3. Frijol ────────────────────────────────────────────────────────────
  const ingresoFrijolP  = suma("cosechaFrijolP")  + suma("cosechaArP");
  const ingresoFrijolPo = suma("cosechaFrijolPo") + suma("cosechaArPo");
  const tieneActivFrijol = (d.cultivos ?? "").toLowerCase().includes("frijol") ||
    (d.descripcion_actividad ?? "").toLowerCase().includes("frijol");

  if (tieneActivFrijol && mzanas > 0 && ingresoFrijolP > 0) {
    const ingPorMz = ingresoFrijolP / mzanas;
    const r = REF.frijol;
    // Estimando precio promedio ~1200 C$/qq → ingreso min/max por mz
    const ingresoMinRefMz = r.qqMzMin * 800;
    const ingresoMaxRefMz = r.qqMzMax * 2500;
    if (ingPorMz < ingresoMinRefMz * 0.5) {
      alertas.push({
        id: "frijol_ingreso_bajo",
        severidad: "advertencia",
        campo: "Cosecha de frijol",
        mensaje: `Ingreso por manzana de frijol parece bajo (${Math.round(ingPorMz).toLocaleString("es-NI")} C$/mz).`,
        referenciaUso: `Rango habitual: C$ ${ingresoMinRefMz.toLocaleString("es-NI")} – ${ingresoMaxRefMz.toLocaleString("es-NI")}/mz`,
        sugerencia: "Confirmar rendimiento (qq/mz) y precio de venta declarados.",
      });
    }
    if (ingPorMz > ingresoMaxRefMz * 1.5) {
      alertas.push({
        id: "frijol_ingreso_alto",
        severidad: "critica",
        campo: "Cosecha de frijol",
        mensaje: `Ingreso por manzana de frijol excede el máximo referencial (${Math.round(ingPorMz).toLocaleString("es-NI")} C$/mz).`,
        referenciaUso: `Máximo referencial: C$ ${ingresoMaxRefMz.toLocaleString("es-NI")}/mz`,
        sugerencia: "Verificar precio de venta. El precio máximo referencial de frijol es C$ 2,500/qq.",
      });
    }
  }

  // ── 4. Café ──────────────────────────────────────────────────────────────
  const ingresoCafe = suma("cosechaCafe");
  const tieneActifCafe = (d.cultivos ?? "").toLowerCase().includes("café") ||
    (d.cultivos ?? "").toLowerCase().includes("cafe") ||
    (d.descripcion_actividad ?? "").toLowerCase().includes("café");

  if (tieneActifCafe && mzanas > 0 && ingresoCafe > 0) {
    const ingPorMz = ingresoCafe / mzanas;
    const ingresoMaxRefMz = REF.cafe.qqMzMax * REF.cafe.precioMax;
    if (ingPorMz > ingresoMaxRefMz * 1.3) {
      alertas.push({
        id: "cafe_ingreso_alto",
        severidad: "critica",
        campo: "Cosecha de café",
        mensaje: `Ingreso por manzana de café parece excesivo (${Math.round(ingPorMz).toLocaleString("es-NI")} C$/mz).`,
        referenciaUso: `Máximo referencial: C$ ${ingresoMaxRefMz.toLocaleString("es-NI")}/mz (40 qq/mz × C$ 6,000)`,
        sugerencia: "Confirmar si el precio es uva, pergamino u oro. Son diferentes unidades.",
      });
    }
  }

  // ── 5. Salario asalariado ────────────────────────────────────────────────
  const salario = d.salario ?? 0;
  if (d.tipo_actividad === "Asalariado" && salario > 0) {
    if (salario < REF.asalariado.salarioMinMensual) {
      alertas.push({
        id: "salario_bajo",
        severidad: "info",
        campo: "Salario",
        mensaje: `Salario neto declarado inferior al salario mínimo legal (${salario.toLocaleString("es-NI")} C$/mes).`,
        referenciaUso: `Salario mínimo agropecuario 2024: ~C$ 6,000/mes`,
        sugerencia: "Confirmar si es neto o bruto, o si hay ingresos adicionales.",
      });
    }
    if (salario > REF.asalariado.salarioMaxMensual) {
      alertas.push({
        id: "salario_alto",
        severidad: "advertencia",
        campo: "Salario",
        mensaje: `Salario neto inusualmente alto para el segmento (${salario.toLocaleString("es-NI")} C$/mes).`,
        sugerencia: "Solicitar colilla de pago o constancia salarial.",
      });
    }
  }

  // ── 6. Coherencia flujo vs. Estado de Resultados ─────────────────────────
  const er = exp.estadoResultados;
  if (er && flujo) {
    const ingTotalFlujo = Object.values(fv).reduce(
      (s, arr) => s + arr.reduce((a, b) => a + (b || 0), 0), 0
    );
    const erV = er.valores ?? {};
    const erIngTotal = Object.values(erV).reduce(
      (s, v) => s + (typeof v === "object" && v !== null && "valor" in v ? (v as {valor:number}).valor : 0), 0
    );
    if (ingTotalFlujo > 0 && erIngTotal > 0) {
      const ratioFlujoER = ingTotalFlujo / (erIngTotal * (flujo.plazoMeses || 12));
      if (ratioFlujoER > 2.5 || ratioFlujoER < 0.4) {
        alertas.push({
          id: "flujo_er_discrepancia",
          severidad: "advertencia",
          campo: "Coherencia Flujo ↔ Estado de Resultados",
          mensaje: `Los totales del flujo de efectivo y el Estado de Resultados difieren significativamente (ratio: ${ratioFlujoER.toFixed(1)}x).`,
          sugerencia: "Revisar que los mismos rubros estén ingresados en ambos módulos. El motor de sincronización debería haberlos igualado.",
        });
      }
    }
  }

  // ── 7. Deudas vs. capacidad de pago ─────────────────────────────────────
  if (d.tiene_deudas && d.deudas && d.deudas.length > 0) {
    const cuotasExternas = d.deudas.reduce(
      (s, deu) => s + (deu.cuota ?? 0), 0
    );
    const cuotaNueva = flujo?.cuotaEstimada ?? 0;
    const ingMensualTotal = plazo > 0
      ? Object.values(fv).reduce(
          (s, arr) => s + arr.reduce((a, b) => a + (b || 0), 0), 0
        ) / plazo
      : 0;
    if (ingMensualTotal > 0 && (cuotasExternas + cuotaNueva) / ingMensualTotal > 0.85) {
      alertas.push({
        id: "sobreendeudamiento",
        severidad: "critica",
        campo: "Nivel de endeudamiento",
        mensaje: `Las cuotas totales (existentes + nueva) representan más del 85% de los ingresos mensuales.`,
        valorDeclarado: `Cuotas externas: C$ ${cuotasExternas.toLocaleString("es-NI")}/mes | Cuota nueva: C$ ${cuotaNueva.toLocaleString("es-NI")}/mes`,
        sugerencia: "Analizar cuidadosamente la capacidad de pago real. Considerar restructura de pasivos.",
      });
    }
  }

  return alertas;
}

/** Cuenta alertas por severidad */
export function resumenAlertas(alertas: AlertaCoherencia[]) {
  return {
    criticas:     alertas.filter((a) => a.severidad === "critica").length,
    advertencias: alertas.filter((a) => a.severidad === "advertencia").length,
    infos:        alertas.filter((a) => a.severidad === "info").length,
    total:        alertas.length,
  };
}
