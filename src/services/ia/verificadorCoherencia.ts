/**
 * Verificador de coherencia de datos del expediente.
 * Compara los datos declarados contra rangos referenciales (INTA/MAG 2023)
 * y genera alertas orientativas para el asesor antes del comité.
 *
 * Ruta: src/services/ia/verificadorCoherencia.ts
 */
import type { ExpedienteBorrador } from "@/stores/expedientes";

export type SeveridadAlerta = "critica" | "advertencia" | "info";

export interface AlertaCoherencia {
  id: string;
  severidad: SeveridadAlerta;
  campo: string;
  mensaje: string;
  valorDeclarado?: string;
  referenciaUso?: string;
  sugerencia?: string;
}

// ── Valores referenciales ────────────────────────────────────────────────────
const REF = {
  frijol: { qqMzMin: 10, qqMzMax: 35, precioMin: 800, precioMax: 2200 },
  cafe: { qqMzMin: 8, qqMzMax: 40, precioMin: 1500, precioMax: 4500 },
  maiz: { qqMzMin: 20, qqMzMax: 100, precioMin: 200, precioMax: 600 },
  sorgo: { qqMzMin: 30, qqMzMax: 120, precioMin: 180, precioMax: 450 },
  ganado_leche: {
    litrosVacaDiaMin: 3,
    litrosVacaDiaMax: 20,
    precioLitroMin: 12,
    precioLitroMax: 25,
    vacasMin: 1,
    vacasMax: 80,
  },
  comercio: { margenNetoMin: 0.05, margenNetoMax: 0.55 },
  area: { mzMin: 0.25, mzMax: 200 },
};

const lower = (v: unknown) => String(v ?? "").toLowerCase();

export function verificarCoherencia(
  exp: ExpedienteBorrador | undefined | null
): AlertaCoherencia[] {
  const alertas: AlertaCoherencia[] = [];
  if (!exp) return alertas;

  const d = (exp.data ?? {}) as Record<string, any>;
  const fv: Record<string, number[]> = (exp.flujo?.valores ?? {}) as Record<string, number[]>;
  const plazo = exp.flujo?.plazoMeses ?? 12;

  const suma = (rubro: string) =>
    (fv[rubro] ?? []).reduce((a, b) => a + (Number(b) || 0), 0);
  const ingMensual = (rubro: string) => (plazo > 0 ? suma(rubro) / plazo : 0);

  const mzanas = Number(d.area_manzanas ?? d.manzanas ?? d.area ?? 0) || 0;

  // ── Área declarada ─────────────────────────────────────────────────────────
  if (mzanas > 0 && mzanas > REF.area.mzMax) {
    alertas.push({
      id: "area_grande",
      severidad: "advertencia",
      campo: "Área de la finca",
      mensaje: `El área declarada (${mzanas} mz) es inusualmente grande para microcrédito.`,
      valorDeclarado: `${mzanas} mz`,
      referenciaUso: `Rango habitual: ${REF.area.mzMin} – ${REF.area.mzMax} mz`,
      sugerencia: "Confirmar si el área corresponde solo al terreno en producción.",
    });
  }

  // ── Maíz ───────────────────────────────────────────────────────────────────
  const ingresoMaiz = suma("cosechaMaiz") + suma("cosechaGrano");
  const tieneActivMaiz =
    lower(d.cultivos).includes("maíz") ||
    lower(d.cultivos).includes("maiz") ||
    lower(d.descripcion_actividad).includes("maíz");

  if (tieneActivMaiz && mzanas > 0 && ingresoMaiz > 0) {
    const ingPorMz = ingresoMaiz / mzanas;
    const ingresoMinRefMz = REF.maiz.qqMzMin * REF.maiz.precioMin;
    const ingresoMaxRefMz = REF.maiz.qqMzMax * REF.maiz.precioMax;

    if (ingPorMz < ingresoMinRefMz * 0.5) {
      alertas.push({
        id: "maiz_ingreso_bajo",
        severidad: "advertencia",
        campo: "Cosecha de maíz",
        mensaje: `Ingreso por manzana de maíz parece bajo (${Math.round(ingPorMz).toLocaleString("es-NI")} C$/mz).`,
        referenciaUso: `Rango habitual: C$ ${ingresoMinRefMz.toLocaleString("es-NI")} – ${ingresoMaxRefMz.toLocaleString("es-NI")}/mz`,
        sugerencia: "Confirmar rendimiento (qq/mz) y precio de venta en el campo.",
      });
    }

    if (ingPorMz > ingresoMaxRefMz * 1.3) {
      alertas.push({
        id: "maiz_ingreso_alto",
        severidad: "critica",
        campo: "Cosecha de maíz",
        mensaje: `Ingreso por manzana de maíz excede el máximo referencial (${Math.round(ingPorMz).toLocaleString("es-NI")} C$/mz).`,
        referenciaUso: `Máximo referencial INTA 2023: C$ ${ingresoMaxRefMz.toLocaleString("es-NI")}/mz (100 qq × C$ 600)`,
        sugerencia: "Verificar si incluye granos almacenados de ciclos anteriores.",
      });
    }
  }

  // ── Sorgo ──────────────────────────────────────────────────────────────────
  const ingresoSorgo = suma("cosechaSorgo");
  const tieneActivSorgo =
    lower(d.cultivos).includes("sorgo") || lower(d.descripcion_actividad).includes("sorgo");

  if (tieneActivSorgo && mzanas > 0 && ingresoSorgo > 0) {
    const ingPorMz = ingresoSorgo / mzanas;
    const ingresoMaxRefMz = REF.sorgo.qqMzMax * REF.sorgo.precioMax;

    if (ingPorMz > ingresoMaxRefMz * 1.3) {
      alertas.push({
        id: "sorgo_ingreso_alto",
        severidad: "critica",
        campo: "Cosecha de sorgo",
        mensaje: `Ingreso por manzana de sorgo excede el máximo referencial (${Math.round(ingPorMz).toLocaleString("es-NI")} C$/mz).`,
        referenciaUso: `Máximo referencial: C$ ${ingresoMaxRefMz.toLocaleString("es-NI")}/mz (120 qq × C$ 450)`,
        sugerencia: "Confirmar rendimiento y precio unitario. El sorgo suele venderse a granel.",
      });
    }
  }

  // ── Ganado lechero ─────────────────────────────────────────────────────────
  const ingresoLeche = suma("ventaLeche") + suma("productosPecuarios");
  const numVacas = Number(d.num_vacas ?? d.cabezas_ganado ?? 0) || 0;
  const tieneActifGanado =
    lower(d.tipo_actividad).includes("ganado") ||
    lower(d.tipo_actividad).includes("pecuar") ||
    lower(d.cultivos).includes("ganado") ||
    lower(d.descripcion_actividad).includes("leche");

  if (tieneActifGanado && ingresoLeche > 0 && numVacas > 0) {
    if (numVacas > REF.ganado_leche.vacasMax) {
      alertas.push({
        id: "ganado_hato_grande",
        severidad: "advertencia",
        campo: "Hato ganadero",
        mensaje: `Número de vacas declarado (${numVacas}) es alto para microfinanzas.`,
        referenciaUso: `Rango habitual en el segmento: 1 – ${REF.ganado_leche.vacasMax} vacas`,
        sugerencia: "Confirmar si son vacas productivas o incluye novillos/terneros.",
      });
    }

    const diasMes = 30;
    const ingMensualLeche = ingMensual("ventaLeche");
    if (ingMensualLeche > 0) {
      const litrosDiaVaca =
        ingMensualLeche / (numVacas * diasMes * REF.ganado_leche.precioLitroMin);

      if (litrosDiaVaca > REF.ganado_leche.litrosVacaDiaMax * 1.5) {
        alertas.push({
          id: "leche_produccion_alta",
          severidad: "critica",
          campo: "Producción de leche",
          mensaje: `La producción implícita por vaca (${litrosDiaVaca.toFixed(1)} lts/día) excede el máximo referencial.`,
          referenciaUso: `Máximo habitual en Nicaragua: ${REF.ganado_leche.litrosVacaDiaMax} lts/vaca/día`,
          sugerencia: "Verificar precio de venta (C$/litro) y número de vacas productivas.",
        });
      }

      if (litrosDiaVaca < REF.ganado_leche.litrosVacaDiaMin * 0.5) {
        alertas.push({
          id: "leche_produccion_baja",
          severidad: "advertencia",
          campo: "Producción de leche",
          mensaje: `La producción implícita por vaca (${litrosDiaVaca.toFixed(1)} lts/día) parece baja.`,
          referenciaUso: `Mínimo referencial: ${REF.ganado_leche.litrosVacaDiaMin} lts/vaca/día`,
          sugerencia: "Confirmar si el hato está activo o hay vacas secas en el período.",
        });
      }
    }
  }

  // ── Comercio / negocio informal ────────────────────────────────────────────
  const ventasComercio = suma("ventasNegocio") + suma("ingresosComercio");
  const comprasComercio = suma("comprasMercaderia") + suma("costosVenta");
  const tieneActifComercio =
    lower(d.tipo_actividad).includes("comerc") ||
    lower(d.tipo_actividad).includes("negocio") ||
    lower(d.tipo_actividad).includes("tiend") ||
    lower(d.tipo_actividad).includes("pulper");

  if (tieneActifComercio && ventasComercio > 0 && comprasComercio > 0) {
    const margenDeclarado = (ventasComercio - comprasComercio) / ventasComercio;

    if (margenDeclarado < REF.comercio.margenNetoMin) {
      alertas.push({
        id: "comercio_margen_bajo",
        severidad: "advertencia",
        campo: "Margen del negocio",
        mensaje: `Margen neto declarado muy bajo (${(margenDeclarado * 100).toFixed(1)}%).`,
        referenciaUso: `Mínimo referencial para comercio minorista informal: ${(REF.comercio.margenNetoMin * 100).toFixed(0)}%`,
        sugerencia:
          "Confirmar si se incluyeron todos los costos de operación o si hay mermas no declaradas.",
      });
    }

    if (margenDeclarado > REF.comercio.margenNetoMax) {
      alertas.push({
        id: "comercio_margen_alto",
        severidad: "advertencia",
        campo: "Margen del negocio",
        mensaje: `Margen neto inusualmente alto para comercio minorista (${(margenDeclarado * 100).toFixed(1)}%).`,
        referenciaUso: `Máximo habitual: ${(REF.comercio.margenNetoMax * 100).toFixed(0)}%`,
        sugerencia:
          "Verificar si los costos de compra están completos o si se trata de un producto de alto valor.",
      });
    }
  }

  // ── Ingreso total cero con actividad declarada ─────────────────────────────
  const tieneActividad = !!(d.tipo_actividad || d.cultivos || d.descripcion_actividad);
  const ingresoTotalFlujo = Object.values(fv).reduce(
    (s, arr) => s + (arr ?? []).reduce((a, b) => a + (Number(b) || 0), 0),
    0
  );

  if (tieneActividad && exp.flujo && ingresoTotalFlujo === 0) {
    alertas.push({
      id: "flujo_vacio",
      severidad: "critica",
      campo: "Flujo de caja",
      mensaje:
        "El flujo de caja no tiene ingresos registrados, aunque hay una actividad declarada.",
      sugerencia:
        "Completar el módulo de flujo antes de enviar al comité. Sin ingresos no es posible calcular la capacidad de pago.",
    });
  }

  return alertas;
}

export function resumenAlertas(alertas: AlertaCoherencia[]) {
  return {
    total: alertas.length,
    criticas: alertas.filter((a) => a.severidad === "critica").length,
    advertencias: alertas.filter((a) => a.severidad === "advertencia").length,
    infos: alertas.filter((a) => a.severidad === "info").length,
  };
}
