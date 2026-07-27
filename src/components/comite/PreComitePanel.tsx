/**
 * Panel de pre-envío a comité — muestra el estado de completitud del expediente
 * con los ratios clave calculados antes de generar el dictamen IA.
 *
 * Se integra en TabDocumentos de expedientes.$id.tsx, encima del botón "Enviar al comité".
 * Ruta: src/components/comite/PreComitePanel.tsx
 */
import { useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { useExpedientes } from "@/stores/expedientes";
import {
  CUENTAS_INGRESOS, CUENTAS_COSTOS, CUENTAS_GASTOS_OPERACION,
  CUENTAS_CONSUMO_FAMILIAR, CUENTAS_ACTIVOS, CUENTAS_PASIVOS,
} from "@/data/cuentasFinancieras";
import { resolverTipoActividad, getRubrosParaActividad } from "@/data/rubrosFlujoPorActividad";

const fmtC$ = (n: number) => `C$ ${Math.round(n).toLocaleString("es-NI")}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

interface CheckItem {
  id: string;
  label: string;
  estado: "ok" | "alerta" | "error" | "pendiente";
  detalle?: string;
}

interface Props {
  expedienteId: string;
}

export function PreComitePanel({ expedienteId }: Props) {
  const exp = useExpedientes((s) => s.expedientes[expedienteId]);

  const { checks, ratios } = useMemo(() => {
    if (!exp) return { checks: [], ratios: null };

    const d = exp.data || {};
    const tipo = resolverTipoActividad(
      d.producto === "agroresilia" ? "AgroResilia" : d.tipo_actividad
    );
    const rubros = getRubrosParaActividad(tipo);
    const flujo = exp.flujo;
    const fv = flujo?.valores ?? {};
    const plazo = flujo?.plazoMeses || d.plazo || 12;
    const cuotaEst = flujo?.cuotaEstimada ?? 0;

    // ── Calcular ratios ──────────────────────────────────────────────────────
    const bloqueTotal = (bloque: "A" | "B" | "C" | "D" | "F" | "E") => {
      return rubros[bloque]
        .filter((r) => flujo?.rubrosActivos?.[r.key])
        .reduce((s, r) => s + (fv[r.key]?.reduce((a, b) => a + (b || 0), 0) ?? 0), 0);
    };

    const ingFijos = bloqueTotal("A");
    const ingEstac = bloqueTotal("B");
    const gastosHogar = bloqueTotal("C");
    const costosProd = bloqueTotal("D");
    const gastosOp = bloqueTotal("F");
    const otrasDeudas = bloqueTotal("E");
    const totalIngresos = ingFijos + ingEstac;
    const totalEgresos = gastosHogar + costosProd + gastosOp + otrasDeudas;
    const excedenteMensual = plazo > 0 ? (totalIngresos - totalEgresos) / plazo : 0;
    const capPagoPct = excedenteMensual > 0 ? (cuotaEst / excedenteMensual) * 100 : 0;

    const sumValores = (valores: Record<string, { valor: number }>, cuentas: Array<{ id: string }>) =>
      cuentas.reduce((s, c) => s + (valores[c.id]?.valor || 0), 0);

    const er = exp.estadoResultados;
    const erV = er?.valores ?? {};
    const erIngresos = sumValores(erV, CUENTAS_INGRESOS[tipo] ?? []);
    const erExcedente = erIngresos > 0
      ? erIngresos - sumValores(erV, CUENTAS_COSTOS[tipo] ?? [])
        - sumValores(erV, CUENTAS_GASTOS_OPERACION)
        - sumValores(erV, CUENTAS_CONSUMO_FAMILIAR)
      : 0;
    const erCapPago = erExcedente > 0 ? (cuotaEst / erExcedente) * 100 : 0;

    const sf = exp.situacionFinanciera;
    const sfV = sf?.valores ?? {};
    const totalActivos = sumValores(sfV, [
      ...CUENTAS_ACTIVOS.corriente.base,
      ...(CUENTAS_ACTIVOS.corriente.porActividad[tipo] ?? []),
      ...CUENTAS_ACTIVOS.fijo.base,
      ...(CUENTAS_ACTIVOS.fijo.porActividad[tipo] ?? []),
      ...CUENTAS_ACTIVOS.inmueble.base,
    ]);
    const totalPasivos = sumValores(sfV, [
      ...CUENTAS_PASIVOS.corriente,
      ...CUENTAS_PASIVOS.largo_plazo,
    ]);
    const patrimonio = totalActivos - totalPasivos;
    const idxEndeuda = totalActivos > 0 ? (totalPasivos / totalActivos) * 100 : 0;

    const gar = exp.garantias;
    const valorGar = (gar?.bienes?.reduce((s, b) => s + (b.valor_mercado ?? 0), 0) ?? 0)
      + (gar?.inmueble?.valor_mercado ?? 0);
    const cobGar = d.monto && d.monto > 0 ? (valorGar / d.monto) * 100 : 0;

    const fiad = exp.fiador;
    const ingFiador = fiad?.ingresos?.reduce((s, i) => s + (i.monto || 0), 0) ?? 0;
    const egrFiador = fiad?.egresos?.reduce((s, e) => s + (e.monto || 0), 0) ?? 0;

    // ── Armar checks ─────────────────────────────────────────────────────────
    const items: CheckItem[] = [];

    // Información básica
    const tieneDatosBasicos = !!(d.cedula && d.fecha_nacimiento && d.telefono && d.tipo_actividad);
    items.push({
      id: "basico",
      label: "Datos personales y actividad",
      estado: tieneDatosBasicos ? "ok" : "error",
      detalle: tieneDatosBasicos ? "Cédula, fecha nac., teléfono y actividad completos" : "Faltan datos obligatorios en la solicitud",
    });

    // Producto y monto
    items.push({
      id: "credito",
      label: "Producto y condiciones del crédito",
      estado: d.producto && d.monto && d.plazo ? "ok" : "error",
      detalle: d.producto && d.monto ? `${d.producto} · ${fmtC$(d.monto ?? 0)} · ${d.plazo} meses` : "Producto, monto o plazo no definidos",
    });

    // Flujo de efectivo
    const rubrosFlujoActivos = Object.values(flujo?.rubrosActivos ?? {}).filter(Boolean).length;
    const flujoCargado = totalIngresos > 0;
    items.push({
      id: "flujo",
      label: "Flujo de efectivo",
      estado: flujoCargado ? (rubrosFlujoActivos >= 2 ? "ok" : "alerta") : "error",
      detalle: flujoCargado
        ? `${rubrosFlujoActivos} rubros activos · Ingresos ${fmtC$(plazo > 0 ? totalIngresos/plazo : 0)}/mes`
        : "No hay flujo capturado",
    });

    // Capacidad de pago
    items.push({
      id: "cap_pago",
      label: "Capacidad de pago (flujo)",
      estado: cuotaEst === 0 ? "pendiente"
        : capPagoPct <= 70 ? "ok"
        : capPagoPct <= 85 ? "alerta" : "error",
      detalle: cuotaEst === 0 ? "Cuota no calculada"
        : `Cuota ${fmtC$(cuotaEst)}/mes = ${fmtPct(capPagoPct)} del excedente (límite: 70%)`,
    });

    // Estado de resultados
    items.push({
      id: "resultados",
      label: "Estado de resultados",
      estado: er && erIngresos > 0 ? (erCapPago <= 70 ? "ok" : "alerta") : "error",
      detalle: er && erIngresos > 0
        ? `Ingresos ${fmtC$(erIngresos)}/mes · Excedente ${fmtC$(erExcedente)} · Cap. pago ${fmtPct(erCapPago)}`
        : "Estado de resultados no capturado o sin ingresos",
    });

    // Situación financiera
    items.push({
      id: "situacion",
      label: "Situación financiera (balance)",
      estado: sf && totalActivos > 0
        ? (patrimonio >= 0 && idxEndeuda <= 60 ? "ok" : "alerta")
        : "pendiente",
      detalle: sf && totalActivos > 0
        ? `Activos ${fmtC$(totalActivos)} · Pasivos ${fmtC$(totalPasivos)} · Patrimonio ${fmtC$(patrimonio)} · Endeud. ${fmtPct(idxEndeuda)}`
        : "No capturada — recomendado para análisis completo",
    });

    // Garantías
    if (d.aplica_garantia) {
      items.push({
        id: "garantias",
        label: "Garantías",
        estado: valorGar === 0 ? "error"
          : cobGar >= 100 ? "ok"
          : cobGar >= 80 ? "alerta" : "error",
        detalle: valorGar > 0
          ? `Valor ${fmtC$(valorGar)} · Cobertura ${fmtPct(cobGar)} del monto (mín: 100%)`
          : "Garantía requerida pero no valorada",
      });
    }

    // Fiador
    if (d.aplica_fiador) {
      const fiadorOk = !!(fiad?.primer_nombre && fiad?.cedula && ingFiador > 0);
      items.push({
        id: "fiador",
        label: "Fiador",
        estado: fiadorOk ? "ok" : fiad?.primer_nombre ? "alerta" : "error",
        detalle: fiadorOk
          ? `${fiad!.primer_nombre} ${fiad!.primer_apellido ?? ""} · Excedente ${fmtC$(ingFiador - egrFiador)}`
          : fiad?.primer_nombre ? "Fiador sin ingresos/egresos capturados" : "Fiador no capturado",
      });
    }

    // Geolocalización
    const geo = exp.geolocalizacion || {};
    const tieneDomicilio = !!(geo.domicilioDeudor?.lat);
    const tieneNegocio = !!(geo.negocioDeudor?.lat);
    items.push({
      id: "geo",
      label: "Geolocalización",
      estado: tieneDomicilio && tieneNegocio ? "ok"
        : tieneDomicilio || tieneNegocio ? "alerta" : "pendiente",
      detalle: `Domicilio ${tieneDomicilio ? "✅" : "⚠️"}  Negocio/finca ${tieneNegocio ? "✅" : "⚠️"}`,
    });

    // Documentos
    const tieneDocs = (exp.documentos?.length ?? 0) > 0;
    items.push({
      id: "docs",
      label: "Documentos de soporte",
      estado: tieneDocs ? "ok" : "alerta",
      detalle: tieneDocs ? `${exp.documentos!.length} documento(s) adjunto(s)` : "Sin documentos adjuntos",
    });

    const ratiosResumen = {
      capPagoPct,
      excedenteMensual,
      cuotaEst,
      erCapPago: erIngresos > 0 ? erCapPago : null,
      cobGar: d.aplica_garantia ? cobGar : null,
      idxEndeuda: totalActivos > 0 ? idxEndeuda : null,
    };

    return { checks: items, ratios: ratiosResumen };
  }, [exp]);

  if (!exp) return null;

  const errores = checks.filter((c) => c.estado === "error").length;
  const alertas = checks.filter((c) => c.estado === "alerta").length;
  const listoEnviar = errores === 0;

  const colorEstado = {
    ok: "text-green-600 dark:text-green-400",
    alerta: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400",
    pendiente: "text-slate-400",
  };

  const iconoEstado = {
    ok:       <CheckCircle2 size={16} className="shrink-0 text-green-500" />,
    alerta:   <AlertTriangle size={16} className="shrink-0 text-amber-500" />,
    error:    <XCircle size={16} className="shrink-0 text-red-500" />,
    pendiente:<ChevronRight size={16} className="shrink-0 text-slate-400" />,
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      {/* Encabezado */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          📋 Lista de verificación — pre-comité
        </h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
          errores > 0
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            : alertas > 0
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
        }`}>
          {errores > 0 ? `${errores} error${errores > 1 ? "es" : ""}` :
           alertas > 0 ? `${alertas} alerta${alertas > 1 ? "s" : ""}` :
           "Listo para comité ✅"}
        </span>
      </div>

      {/* Checks */}
      <div className="mb-4 space-y-2">
        {checks.map((c) => (
          <div key={c.id} className="flex items-start gap-2">
            {iconoEstado[c.estado]}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold ${colorEstado[c.estado]}`}>{c.label}</p>
              {c.detalle && <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.detalle}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Ratios clave */}
      {ratios && (ratios.capPagoPct > 0 || ratios.cobGar !== null) && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-[10px] text-slate-400">Capacidad pago</p>
            <p className={`text-sm font-bold ${
              ratios.capPagoPct === 0 ? "text-slate-400"
              : ratios.capPagoPct <= 70 ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
            }`}>
              {ratios.capPagoPct > 0 ? `${ratios.capPagoPct.toFixed(1)}%` : "—"}
            </p>
            <p className="text-[10px] text-slate-400">límite 70%</p>
          </div>
          {ratios.cobGar !== null && (
            <div className="text-center">
              <p className="text-[10px] text-slate-400">Cobertura garantía</p>
              <p className={`text-sm font-bold ${
                ratios.cobGar >= 100 ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
              }`}>
                {ratios.cobGar.toFixed(0)}%
              </p>
              <p className="text-[10px] text-slate-400">mínimo 100%</p>
            </div>
          )}
          {ratios.idxEndeuda !== null && (
            <div className="text-center">
              <p className="text-[10px] text-slate-400">Endeudamiento</p>
              <p className={`text-sm font-bold ${
                ratios.idxEndeuda <= 60 ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
              }`}>
                {ratios.idxEndeuda.toFixed(0)}%
              </p>
              <p className="text-[10px] text-slate-400">prudencial &lt;60%</p>
            </div>
          )}
        </div>
      )}

      {/* Aviso si hay errores */}
      {!listoEnviar && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/40 dark:bg-red-900/10">
          <p className="text-xs text-red-700 dark:text-red-300">
            <strong>El expediente tiene {errores} sección{errores > 1 ? "es" : ""} con errores.</strong>{" "}
            Podés enviarlo al comité de todas formas, pero el dictamen IA será menos preciso sin los datos completos.
          </p>
        </div>
      )}
    </div>
  );
}
