// Construye un resumen textual del expediente para alimentar a la IA.
import type { ExpedienteBorrador } from "@/stores/expedientes";

const fmtC$ = (n?: number) =>
  n && isFinite(n) ? `C$ ${Math.round(n).toLocaleString("es-NI")}` : "—";

export function construirContextoExpediente(exp: ExpedienteBorrador | undefined): string {
  if (!exp) return "SIN EXPEDIENTE CARGADO.";
  const d = exp.data || {};
  const nombre =
    [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
      .filter(Boolean)
      .join(" ") || "—";

  const flujo = exp.flujo;
  let flujoResumen = "Sin flujo capturado.";
  if (flujo && flujo.valores) {
    const suma = (arr: number[]) => arr.reduce((s, n) => s + (Number(n) || 0), 0);
    const total = Object.values(flujo.valores).reduce((s, arr) => s + suma(arr), 0);
    flujoResumen = `Movimientos anuales totales aprox. ${fmtC$(total)} (revisar detalle mes a mes en el módulo Flujo).`;
  }

  const er = exp.estadoResultados;
  const sf = exp.situacionFinanciera;
  const fiador = exp.fiador;
  const garantias = exp.garantias;
  const geo = exp.geolocalizacion || {};

  const geoResumen = [
    geo.domicilioDeudor?.lat ? "domicilio-deudor ✓" : "domicilio-deudor ✗",
    geo.negocioDeudor?.lat ? "negocio-deudor ✓" : "negocio-deudor ✗",
    d.aplica_fiador
      ? geo.domicilioFiador?.lat
        ? "domicilio-fiador ✓"
        : "domicilio-fiador ✗"
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `
CLIENTE: ${nombre}
Cédula: ${d.cedula || "—"} · Sexo: ${d.sexo || "—"} · Nac.: ${d.fecha_nacimiento || "—"}
Ubicación: ${d.departamento_residencia || "—"} / ${d.municipio_residencia || "—"}
Dependientes: ${d.dependientes ?? "—"} · Escolaridad: ${d.escolaridad || "—"}

ACTIVIDAD ECONÓMICA: ${d.tipo_actividad || "—"}
Descripción: ${d.descripcion_actividad || "—"}
Negocio: ${d.nombre_negocio || "—"} · Antigüedad: ${d.antiguedad_anios || 0}a ${d.antiguedad_meses || 0}m
${d.cultivos ? `Cultivos: ${d.cultivos} · Hectáreas: ${d.hectareas || "—"}` : ""}
${d.empleador ? `Empleador: ${d.empleador} · Cargo: ${d.cargo} · Salario: ${fmtC$(d.salario)}` : ""}

CRÉDITO SOLICITADO:
Producto: ${d.producto || "—"} · Monto: ${fmtC$(d.monto)} · Plazo: ${d.plazo || "—"} meses
Frecuencia: ${d.frecuencia_pago || "—"} · Destino: ${d.destino || "—"}
Fiador aplica: ${d.aplica_fiador ? "sí" : "no"} · Garantía: ${d.aplica_garantia ? (d.tipos_garantia || []).join(", ") : "no"}
Deudas existentes: ${d.tiene_deudas ? `${d.deudas?.length || 0} instituciones` : "no reporta"}

FLUJO DE EFECTIVO: ${flujoResumen}

ESTADO DE RESULTADOS: ${er ? "capturado (revisar en módulo)" : "sin capturar"}
SITUACIÓN FINANCIERA: ${sf ? "capturada" : "sin capturar"}
FIADOR: ${fiador ? `${fiador.primer_nombre || ""} ${fiador.primer_apellido || ""} · ingresos ${fiador.ingresos?.length || 0}, egresos ${fiador.egresos?.length || 0}` : "no capturado"}
GARANTÍAS: ${garantias ? `${garantias.bienes?.length || 0} bienes prendarios${garantias.inmueble ? " + inmueble" : ""}` : "no capturadas"}
GEOLOCALIZACIÓN: ${geoResumen || "sin capturar"}

Estado del expediente: ${exp.estado}. Actualizado: ${exp.updated_at}.
`.trim();
}
