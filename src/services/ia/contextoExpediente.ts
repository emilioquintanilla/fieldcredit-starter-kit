/**
 * Construye el contexto analítico completo del expediente para el Copiloto IA.
 *
 * ANTES: La IA recibía "Estado de resultados: capturado" y un total global del flujo.
 * AHORA: Recibe todos los ratios calculados, los números reales de cada estado financiero,
 * el detalle de flujo por bloque, garantías valoradas y banderas automáticas de política.
 *
 * Principio: la IA no debe calcular nada que podamos calcularle nosotros.
 * Su trabajo es interpretar, detectar incoherencias y redactar el dictamen.
 *
 * Ruta: src/services/ia/contextoExpediente.ts
 */
import type { ExpedienteBorrador } from "@/stores/expedientes";
import {
  CUENTAS_INGRESOS,
  CUENTAS_COSTOS,
  CUENTAS_GASTOS_OPERACION,
  CUENTAS_CONSUMO_FAMILIAR,
  CUENTAS_ACTIVOS,
  CUENTAS_PASIVOS,
} from "@/data/cuentasFinancieras";
import {
  resolverTipoActividad,
  getRubrosParaActividad,
} from "@/data/rubrosFlujoPorActividad";

// ── Formateadores ────────────────────────────────────────────────────────────
const fmtC$ = (n?: number | null) =>
  n != null && isFinite(n) && n !== 0
    ? `C$ ${Math.round(n).toLocaleString("es-NI")}`
    : "—";
const fmtPct = (n?: number | null, dec = 1) =>
  n != null && isFinite(n) ? `${n.toFixed(dec)}%` : "—";
const na = (v?: string | number | null) =>
  v != null && v !== "" ? String(v) : "—";

// ── Helper: sumar valores de cuentas ────────────────────────────────────────
function sumCuentas(
  valores: Record<string, { valor: number }>,
  cuentas: Array<{ id: string }>,
): number {
  return cuentas.reduce((s, c) => s + (valores[c.id]?.valor ?? 0), 0);
}

// ── Constructor principal ────────────────────────────────────────────────────
export function construirContextoExpediente(
  exp: ExpedienteBorrador | undefined,
): string {
  if (!exp) return "SIN EXPEDIENTE CARGADO.";

  const d = exp.data || {};
  const nombre =
    [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
      .filter(Boolean)
      .join(" ") || "—";

  const esAR = d.producto === "agroresilia";
  const tipo = resolverTipoActividad(esAR ? "AgroResilia" : d.tipo_actividad);
  const rubros = getRubrosParaActividad(tipo);

  // ── 1. FLUJO DE EFECTIVO ─────────────────────────────────────────────────
  const flujo = exp.flujo;
  const plazo = flujo?.plazoMeses || d.plazo || 12;
  const fv = flujo?.valores ?? {};
  const cuotaEst = flujo?.cuotaEstimada ?? 0;

  const bloqueTotal = (bloque: "A" | "B" | "C" | "D" | "F" | "E") =>
    rubros[bloque]
      .filter((r) => flujo?.rubrosActivos?.[r.key])
      .reduce((s, r) => s + (fv[r.key]?.reduce((a, b) => a + (b || 0), 0) ?? 0), 0);

  const ingFijos    = bloqueTotal("A");
  const ingEstac    = bloqueTotal("B");
  const gastosHogar = bloqueTotal("C");
  const costosProd  = bloqueTotal("D");
  const gastosOp    = bloqueTotal("F");
  const otrasDeudas = bloqueTotal("E");
  const totalIngresos = ingFijos + ingEstac;
  const totalEgresos  = gastosHogar + costosProd + gastosOp + otrasDeudas;
  const excMensual    = plazo > 0 ? (totalIngresos - totalEgresos) / plazo : 0;
  const excNeto       = excMensual - cuotaEst;
  const capPagoPct    = excMensual > 0 ? (cuotaEst / excMensual) * 100 : 0;

  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const mesesDeficit: string[] = [];
  if (flujo && plazo > 0) {
    const mStart = parseInt((flujo.mesInicio || "2025-01").split("-")[1] || "1", 10);
    for (let i = 0; i < plazo; i++) {
      let ing = 0; let egr = 0;
      [...rubros.A, ...rubros.B]
        .filter((r) => flujo.rubrosActivos?.[r.key])
        .forEach((r) => { ing += fv[r.key]?.[i] ?? 0; });
      [...rubros.C, ...rubros.D, ...rubros.F, ...rubros.E]
        .filter((r) => flujo.rubrosActivos?.[r.key])
        .forEach((r) => { egr += fv[r.key]?.[i] ?? 0; });
      if (egr + cuotaEst > ing)
        mesesDeficit.push(MESES[((mStart - 1 + i) % 12)]);
    }
  }

  // ── 2. ESTADO DE RESULTADOS ──────────────────────────────────────────────
  const er  = exp.estadoResultados;
  const erV = er?.valores ?? {};
  const erIng  = sumCuentas(erV, CUENTAS_INGRESOS[tipo] ?? []);
  const erCos  = sumCuentas(erV, CUENTAS_COSTOS[tipo] ?? []);
  const erGop  = sumCuentas(erV, CUENTAS_GASTOS_OPERACION);
  const erCon  = sumCuentas(erV, CUENTAS_CONSUMO_FAMILIAR);
  const erUB   = erIng - erCos;
  const erUO   = erUB - erGop;
  const erExc  = erUO - erCon;
  const erNeto = erExc - cuotaEst;
  const erMB   = erIng > 0 ? (erUB / erIng) * 100 : 0;
  const erCP   = erExc > 0 ? (cuotaEst / erExc) * 100 : 0;

  // ── 3. SITUACIÓN FINANCIERA ──────────────────────────────────────────────
  const sf  = exp.situacionFinanciera;
  const sfV = sf?.valores ?? {};
  const actCte  = sumCuentas(sfV, [
    ...CUENTAS_ACTIVOS.corriente.base,
    ...(CUENTAS_ACTIVOS.corriente.porActividad[tipo] ?? []),
  ]);
  const actFijo = sumCuentas(sfV, [
    ...CUENTAS_ACTIVOS.fijo.base,
    ...(CUENTAS_ACTIVOS.fijo.porActividad[tipo] ?? []),
  ]);
  const actInm  = sumCuentas(sfV, CUENTAS_ACTIVOS.inmueble.base);
  const totalAct = actCte + actFijo + actInm;
  const pasCte   = sumCuentas(sfV, CUENTAS_PASIVOS.corriente);
  const pasLP    = sumCuentas(sfV, CUENTAS_PASIVOS.largo_plazo);
  const totalPas = pasCte + pasLP;
  const patrimonio = totalAct - totalPas;
  const idxEndeuda = totalAct > 0 ? (totalPas / totalAct) * 100 : 0;
  const razonLiq   = pasCte > 0 ? actCte / pasCte : null;

  // ── 4. GARANTÍAS ────────────────────────────────────────────────────────
  const gar = exp.garantias;
  const valorPrendas  = gar?.bienes?.reduce((s, b) => s + (b.valor_mercado ?? 0), 0) ?? 0;
  const valorInmueble = gar?.inmueble?.valor_mercado ?? 0;
  const valorGar = valorPrendas + valorInmueble;
  const cobGar   = d.monto && d.monto > 0 ? (valorGar / d.monto) * 100 : 0;

  // ── 5. FIADOR ───────────────────────────────────────────────────────────
  const fiad    = exp.fiador;
  const ingFiad = fiad?.ingresos?.reduce((s, i) => s + (i.monto || 0), 0) ?? 0;
  const egrFiad = fiad?.egresos?.reduce((s, e) => s + (e.monto || 0), 0) ?? 0;
  const excFiad = ingFiad - egrFiad;
  const cobFiad = excFiad > 0 ? (cuotaEst / excFiad) * 100 : null;

  // ── 6. BANDERAS AUTOMÁTICAS ─────────────────────────────────────────────
  const banderas: string[] = [];
  if (excNeto < 0)
    banderas.push(`🔴 Excedente neto NEGATIVO después de cuota: ${fmtC$(excNeto)}/mes`);
  if (capPagoPct > 70 && excMensual > 0)
    banderas.push(`⚠️ Capacidad de pago excede política: ${fmtPct(capPagoPct)} (límite: 70%)`);
  else if (capPagoPct > 0)
    banderas.push(`✅ Capacidad de pago dentro de política: ${fmtPct(capPagoPct)}`);
  if (erIng > 0 && erCP > 70)
    banderas.push(`⚠️ Estado de Resultados confirma cap. pago en ${fmtPct(erCP)}`);
  if (d.aplica_garantia && valorGar > 0 && cobGar < 100)
    banderas.push(`⚠️ Cobertura de garantías insuficiente: ${fmtPct(cobGar)} (mínimo: 100%)`);
  if (d.aplica_garantia && valorGar > 0 && cobGar >= 100)
    banderas.push(`✅ Cobertura de garantías adecuada: ${fmtPct(cobGar)}`);
  if (d.aplica_garantia && valorGar === 0)
    banderas.push(`🔴 Garantía requerida pero no valorada`);
  if (totalAct > 0 && idxEndeuda > 60)
    banderas.push(`⚠️ Índice de endeudamiento elevado: ${fmtPct(idxEndeuda)} (prudencial: <60%)`);
  if (razonLiq !== null && razonLiq < 1)
    banderas.push(`⚠️ Razón de liquidez baja: ${razonLiq.toFixed(2)}`);
  if (mesesDeficit.length > 0)
    banderas.push(`⚠️ Meses con déficit proyectado: ${mesesDeficit.join(", ")}`);
  if (d.aplica_fiador && fiad?.primer_nombre && cobFiad !== null)
    banderas.push(cobFiad <= 70
      ? `✅ Fiador con capacidad adecuada: cuota = ${fmtPct(cobFiad)} del excedente (${fmtC$(excFiad)}/mes)`
      : `⚠️ Cuota = ${fmtPct(cobFiad)} del excedente del fiador (límite: 70%)`);
  if (d.aplica_fiador && !fiad?.primer_nombre)
    banderas.push(`⚠️ Fiador requerido pero no capturado`);
  if (d.tiene_deudas && (d.deudas?.length ?? 0) > 0)
    banderas.push(`ℹ️ Reporta ${d.deudas!.length} institución(es) con deuda vigente`);
  if (banderas.length === 0)
    banderas.push("✅ Sin banderas críticas detectadas.");

  // ── 7. GEOLOCALIZACIÓN ──────────────────────────────────────────────────
  const geo = exp.geolocalizacion || {};
  const geoItems = [
    geo.domicilioDeudor?.lat
      ? `Domicilio deudor ✅ (${geo.domicilioDeudor.departamento ?? ""})`
      : "Domicilio deudor ⚠️ no capturado",
    geo.negocioDeudor?.lat
      ? `Negocio/finca ✅ (${geo.negocioDeudor.departamento ?? ""})`
      : "Negocio/finca ⚠️ no capturado",
    d.aplica_fiador
      ? geo.domicilioFiador?.lat
        ? "Domicilio fiador ✅"
        : "Domicilio fiador ⚠️ no capturado"
      : null,
  ]
    .filter(Boolean)
    .join("  |  ");

  // ── 8. TEXTO FINAL ──────────────────────────────────────────────────────
  return `
═══════════════════════════════════════════════════════
  EXPEDIENTE PARA DICTAMEN — FIELDCREDIT / MICREDITO
═══════════════════════════════════════════════════════

▌ CLIENTE
Nombre        : ${nombre}
Cédula        : ${na(d.cedula)}  |  Sexo: ${na(d.sexo)}  |  Nac.: ${na(d.fecha_nacimiento)}
Estado civil  : ${na(d.estado_civil)}  |  Dependientes: ${na(d.dependientes)}  |  Escolaridad: ${na(d.escolaridad)}
Ubicación     : ${na(d.departamento_residencia)} / ${na(d.municipio_residencia)}
Vivienda      : ${na(d.tipo_vivienda)}  |  Teléfono: ${na(d.telefono)}

▌ ACTIVIDAD ECONÓMICA
Tipo          : ${na(d.tipo_actividad)}${esAR ? " — AgroResilia" : ""}
Descripción   : ${na(d.descripcion_actividad)}
Negocio       : ${na(d.nombre_negocio)}  |  Antigüedad: ${d.antiguedad_anios ?? 0}a ${d.antiguedad_meses ?? 0}m
Destino       : ${na(d.destino)}
${d.cultivos ? `Cultivos      : ${d.cultivos}  |  Área: ${na(d.hectareas)} mz` : ""}
${d.empleador ? `Empleador     : ${d.empleador}  |  Cargo: ${d.cargo}  |  Salario: ${fmtC$(d.salario)}` : ""}

▌ CRÉDITO SOLICITADO
Producto      : ${na(d.producto)}
Monto         : ${fmtC$(d.monto)}
Plazo         : ${plazo} meses
Cuota estimada: ${fmtC$(cuotaEst)}/mes
Frecuencia    : ${na(d.frecuencia_pago)}
Fiador        : ${d.aplica_fiador ? `Sí — ${na(d.relacion_fiador)}` : "No aplica"}
Garantía      : ${d.aplica_garantia ? (d.tipos_garantia || []).join(", ") : "No aplica"}
Deudas previas: ${d.tiene_deudas && d.deudas?.length
    ? d.deudas.map((x) => `${x.institucion}: saldo ${fmtC$(x.saldo)}, cuota ${fmtC$(x.cuota)}`).join(" | ")
    : "No reporta"}

▌ FLUJO DE EFECTIVO (período ${plazo} meses)
Ingresos fijos acum.          : ${fmtC$(ingFijos)}   → ${fmtC$(plazo > 0 ? ingFijos / plazo : 0)}/mes
Ingresos estacionales acum.   : ${fmtC$(ingEstac)}   → ${fmtC$(plazo > 0 ? ingEstac / plazo : 0)}/mes
TOTAL INGRESOS                : ${fmtC$(totalIngresos)}   → ${fmtC$(plazo > 0 ? totalIngresos / plazo : 0)}/mes
Costos de producción          : ${fmtC$(costosProd)}
Gastos del hogar familiar     : ${fmtC$(gastosHogar)}
Gastos operativos del negocio : ${fmtC$(gastosOp)}
Otras deudas / cuotas         : ${fmtC$(otrasDeudas)}
TOTAL EGRESOS                 : ${fmtC$(totalEgresos)}   → ${fmtC$(plazo > 0 ? totalEgresos / plazo : 0)}/mes
──────────────────────────────────────────────────────
Excedente mensual (pre-cuota) : ${fmtC$(excMensual)}
Cuota estimada                : ${fmtC$(cuotaEst)}/mes
Excedente NETO (post-cuota)   : ${fmtC$(excNeto)}
CAPACIDAD DE PAGO             : ${fmtPct(capPagoPct)} del excedente  [política: ≤ 70%]
Meses con déficit proyectado  : ${mesesDeficit.length > 0 ? mesesDeficit.join(", ") : "Ninguno ✅"}

▌ ESTADO DE RESULTADOS (mensual promedio)
${er && erIng > 0 ? `Ingresos totales       : ${fmtC$(erIng)}
Costos de producción   : ${fmtC$(erCos)}
Utilidad bruta         : ${fmtC$(erUB)}   (margen bruto: ${fmtPct(erMB)})
Gastos operativos      : ${fmtC$(erGop)}
Utilidad operativa     : ${fmtC$(erUO)}
Consumo familiar       : ${fmtC$(erCon)}
Excedente familiar     : ${fmtC$(erExc)}
Excedente neto (−cuota): ${fmtC$(erNeto)}
Capacidad de pago (ER) : ${fmtPct(erCP)}  [política: ≤ 70%]`
  : "⚠️ No capturado — análisis incompleto."}

▌ SITUACIÓN FINANCIERA (balance patrimonial)
${sf && totalAct > 0 ? `Activo corriente       : ${fmtC$(actCte)}
Activo fijo            : ${fmtC$(actFijo)}
Activo inmueble        : ${fmtC$(actInm)}
TOTAL ACTIVOS          : ${fmtC$(totalAct)}
Pasivo corriente       : ${fmtC$(pasCte)}
Pasivo largo plazo     : ${fmtC$(pasLP)}
TOTAL PASIVOS          : ${fmtC$(totalPas)}
PATRIMONIO NETO        : ${fmtC$(patrimonio)}
Índice endeudamiento   : ${fmtPct(idxEndeuda)}  [prudencial: < 60%]
Razón de liquidez      : ${razonLiq !== null ? razonLiq.toFixed(2) : "—"}  [mínimo: 1.0]`
  : "⚠️ No capturada o sin activos declarados."}

▌ GARANTÍAS
${gar && (gar.bienes?.length || gar.inmueble) ? `Bienes prendarios      : ${gar.bienes?.length ?? 0} bien(es) — valor ${fmtC$(valorPrendas)}
Bien hipotecario       : ${gar.inmueble ? `${gar.inmueble.tipo_inmueble ?? "inmueble"} — valor mercado ${fmtC$(valorInmueble)}` : "No aplica"}
VALOR TOTAL GARANTÍAS  : ${fmtC$(valorGar)}
COBERTURA              : ${fmtPct(cobGar)} del monto  [mínimo: 100%]`
  : d.aplica_garantia ? "⚠️ Garantía requerida pero no valorada."
  : "No aplica garantía real."}

▌ FIADOR
${fiad && fiad.primer_nombre ? `Nombre                 : ${fiad.primer_nombre ?? ""} ${fiad.primer_apellido ?? ""}
Actividad              : ${na(fiad.tipo_actividad)}  |  Negocio: ${na(fiad.nombre_negocio)}
Ingresos mensuales     : ${fmtC$(ingFiad)}
Egresos mensuales      : ${fmtC$(egrFiad)}
Excedente fiador       : ${fmtC$(excFiad)}
Cuota / excedente      : ${cobFiad !== null ? fmtPct(cobFiad) : "—"}  [política: ≤ 70%]`
  : d.aplica_fiador ? "⚠️ Requiere fiador pero no capturado."
  : "No aplica fiador."}

▌ GEOLOCALIZACIÓN
${geoItems}

▌ BANDERAS AUTOMÁTICAS DE POLÍTICA
${banderas.map((b) => `  ${b}`).join("\n")}

▌ ESTADO DEL EXPEDIENTE
Estado: ${exp.estado}  |  Actualizado: ${exp.updated_at ?? "—"}
`.trim();
}
