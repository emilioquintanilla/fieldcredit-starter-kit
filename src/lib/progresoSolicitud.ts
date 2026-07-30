// Validación compartida de las 7 secciones de la solicitud de crédito.
// La usa el formulario (`/expedientes/nuevo`), el listado y el detalle para
// mostrar cuánto falta antes de finalizar el borrador.
import type { SolicitudData } from "@/stores/expedientes";

export const NOMBRES_SECCION = [
  "Institución",
  "Deudor",
  "Actividad",
  "Crédito",
  "Fiador",
  "Garantías",
  "Firma",
];

export const TOTAL_SECCIONES = NOMBRES_SECCION.length;

const regexCedula = /^\d{3}-\d{6}-\d{4}[A-Z]$/;

export function validarSeccionSolicitud(
  data: SolicitudData,
  n: number,
): Record<string, string> {
  const err: Record<string, string> = {};
  if (n === 1) {
    if (!data.tipo_solicitud) err.tipo_solicitud = "Requerido";
  }
  if (n === 2) {
    if (!data.primer_apellido) err.primer_apellido = "Requerido";
    if (!data.primer_nombre) err.primer_nombre = "Requerido";
    if (!data.cedula || !regexCedula.test(data.cedula)) err.cedula = "Formato: 000-000000-0000X";
    if (!data.fecha_nacimiento) err.fecha_nacimiento = "Requerido";
    if (!data.sexo) err.sexo = "Requerido";
    if (!data.estado_civil) err.estado_civil = "Requerido";
    if (!data.departamento_residencia) err.departamento_residencia = "Requerido";
    if (!data.direccion_domiciliar) err.direccion_domiciliar = "Requerido";
    if (!data.tipo_vivienda) err.tipo_vivienda = "Requerido";
    if (data.dependientes === undefined || data.dependientes === null)
      err.dependientes = "Requerido";
    if (data.correo && !/^\S+@\S+\.\S+$/.test(data.correo)) err.correo = "Correo inválido";
  }
  if (n === 3) {
    if (!data.tipo_actividad) err.tipo_actividad = "Requerido";
    if (!data.descripcion_actividad || data.descripcion_actividad.length < 20)
      err.descripcion_actividad = "Mínimo 20 caracteres";
    if (data.antiguedad_anios === undefined && data.antiguedad_meses === undefined)
      err.antiguedad = "Requerido";
    if (!data.departamento_operacion) err.departamento_operacion = "Requerido";
  }
  if (n === 4) {
    if (!data.producto) err.producto = "Requerido";
    if (!data.monto || data.monto <= 0) err.monto = "Monto mayor a 0";
    if (!data.plazo) err.plazo = "Requerido";
    if (!data.frecuencia_pago) err.frecuencia_pago = "Requerido";
    if (!data.destino || data.destino.length < 20) err.destino = "Mínimo 20 caracteres";
  }
  if (n === 5) {
    if (data.aplica_fiador && !data.relacion_fiador) err.relacion_fiador = "Requerido";
  }
  if (n === 6) {
    if (data.aplica_garantia && !(data.tipos_garantia && data.tipos_garantia.length > 0))
      err.tipos_garantia = "Seleccione al menos un tipo";
  }
  if (n === 7) {
    if (!data.firma_digital) err.firma_digital = "Firma requerida";
  }
  return err;
}

export interface ProgresoSolicitudInfo {
  completadas: number[];
  pendientes: number[];
  total: number;
  porcentaje: number;
}

export function calcularProgresoSolicitud(
  data: SolicitudData | undefined | null,
): ProgresoSolicitudInfo {
  const d = data ?? {};
  const completadas: number[] = [];
  const pendientes: number[] = [];
  for (let i = 1; i <= TOTAL_SECCIONES; i++) {
    if (Object.keys(validarSeccionSolicitud(d, i)).length === 0) completadas.push(i);
    else pendientes.push(i);
  }
  return {
    completadas,
    pendientes,
    total: TOTAL_SECCIONES,
    porcentaje: Math.round((completadas.length / TOTAL_SECCIONES) * 100),
  };
}

export const nombreSeccion = (n: number) => NOMBRES_SECCION[n - 1] ?? `Sección ${n}`;
