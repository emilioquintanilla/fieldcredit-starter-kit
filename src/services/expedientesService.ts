// Servicio de datos: todas las operaciones CRUD contra Supabase.
// Fase 1: se usan verificarLogin, obtenerSucursales, obtenerExpedientes,
// crearExpediente, archivarExpediente, eliminarExpedienteDefinitivo,
// actualizarEstadoExpediente. El resto queda listo para fases 2/3.
import { supabase } from "@/lib/supabase";

export interface SucursalDB {
  id: number;
  nombre: string;
  region: string | null;
  activa: boolean | null;
}

export interface UsuarioDB {
  id: number;
  nombre: string;
  usuario: string;
  rol: "asesor" | "coordinador" | "gerente" | "admin";
  sucursal_id: number;
  sucursales?: { nombre: string; region: string | null } | null;
}

export interface ExpedienteDB {
  id: number;
  codigo: string;
  cliente: string | null;
  cedula: string | null;
  asesor_id: number | null;
  sucursal_id: number | null;
  estado:
    | "borrador"
    | "en_revision"
    | "en_comite"
    | "aprobado"
    | "condicionado"
    | "rechazado"
    | "archivado";
  tipo_producto: string | null;
  monto_solicitado: number | null;
  plazo_meses: number | null;
  actividad: string | null;
  archivado: boolean;
  created_at: string;
  updated_at: string;
}

// ── CÓDIGO DE EXPEDIENTE ────────────────────────────────────────────
export function generarCodigo(): string {
  const anio = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SOL-${anio}-${num}`;
}

// ── LOGIN (mock: password en texto plano contra usuarios.password_hash) ─
export async function verificarLogin(usuario: string, password: string): Promise<UsuarioDB | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, usuario, rol, sucursal_id, sucursales(nombre, region)")
    .eq("usuario", usuario)
    .eq("password_hash", password)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    console.error("verificarLogin", error);
    return null;
  }
  return (data as unknown as UsuarioDB) ?? null;
}

// ── SUCURSALES ──────────────────────────────────────────────────────
export async function obtenerSucursales(): Promise<SucursalDB[]> {
  const { data, error } = await supabase
    .from("sucursales")
    .select("id, nombre, region, activa")
    .eq("activa", true)
    .order("nombre");

  if (error) {
    console.error("obtenerSucursales", error);
    return [];
  }
  return (data as SucursalDB[]) ?? [];
}

// ── EXPEDIENTES ─────────────────────────────────────────────────────
export async function obtenerExpedientes(filtros?: {
  sucursalId?: number;
  asesorId?: number;
  estado?: string;
}): Promise<ExpedienteDB[]> {
  let query = supabase
    .from("expedientes")
    .select("*")
    .eq("archivado", false)
    .order("updated_at", { ascending: false });

  if (filtros?.sucursalId) query = query.eq("sucursal_id", filtros.sucursalId);
  if (filtros?.asesorId) query = query.eq("asesor_id", filtros.asesorId);
  if (filtros?.estado) query = query.eq("estado", filtros.estado);

  const { data, error } = await query;
  if (error) throw error;
  return (data as ExpedienteDB[]) ?? [];
}

export async function obtenerExpediente(id: number): Promise<ExpedienteDB | null> {
  const { data, error } = await supabase
    .from("expedientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("obtenerExpediente", error);
    return null;
  }
  return (data as ExpedienteDB | null) ?? null;
}


export async function crearExpediente(datos: {
  asesorId: number;
  sucursalId: number;
  cliente?: string;
}): Promise<ExpedienteDB> {
  const codigo = generarCodigo();
  const { data, error } = await supabase
    .from("expedientes")
    .insert({
      codigo,
      cliente: datos.cliente ?? "Nuevo cliente",
      asesor_id: datos.asesorId,
      sucursal_id: datos.sucursalId,
      estado: "borrador",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ExpedienteDB;
}

export async function actualizarEstadoExpediente(
  id: number,
  estado: ExpedienteDB["estado"],
  datosExtra?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("expedientes")
    .update({ estado, ...(datosExtra ?? {}) })
    .eq("id", id);
  if (error) throw error;
}

export async function archivarExpediente(id: number): Promise<void> {
  const { error } = await supabase
    .from("expedientes")
    .update({ archivado: true, estado: "archivado" })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarExpedienteDefinitivo(id: number): Promise<void> {
  const { error } = await supabase.from("expedientes").delete().eq("id", id);
  if (error) throw error;
}

// ── STUBS PARA FASES 2 y 3 ──────────────────────────────────────────
// Se dejan definidos para que los módulos puedan importarlos sin cambios
// de nombre cuando llegue el momento de migrar solicitud/flujo/EDR/SF/geo/docs.

export async function guardarSolicitud(expedienteId: number, datos: Record<string, unknown>) {
  const { error } = await supabase
    .from("solicitudes")
    .upsert(
      { expediente_id: expedienteId, datos_completos: datos },
      { onConflict: "expediente_id" },
    );
  if (error) throw error;
}

export async function obtenerSolicitud(
  expedienteId: number,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("solicitudes")
    .select("datos_completos")
    .eq("expediente_id", expedienteId)
    .maybeSingle();
  if (error) {
    console.error("obtenerSolicitud", error);
    return null;
  }
  return (data?.datos_completos as Record<string, unknown> | undefined) ?? null;
}

export async function actualizarExpedienteHeader(
  id: number,
  patch: {
    cliente?: string | null;
    cedula?: string | null;
    tipo_producto?: string | null;
    monto_solicitado?: number | null;
    plazo_meses?: number | null;
    actividad?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("expedientes").update(patch).eq("id", id);
  if (error) throw error;
}

// ── MÓDULOS (payload JSONB por expediente) ─────────────────────────
// Convención: cada tabla tiene columnas `expediente_id` (unique) y `datos` (jsonb).
// Para geolocalizaciones se usa (`expediente_id`, `tipo`) como clave compuesta,
// pero el hook de autosave del expediente serializa todos los tipos como un solo
// registro con tipo = 'expediente'.
async function upsertModulo(
  tabla: string,
  expedienteId: number,
  datos: Record<string, unknown>,
  extra?: Record<string, unknown>,
  onConflict = "expediente_id",
) {
  const { error } = await supabase
    .from(tabla)
    .upsert({ expediente_id: expedienteId, datos, ...(extra ?? {}) }, { onConflict });
  if (error) throw error;
}

async function obtenerModulo(
  tabla: string,
  expedienteId: number,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(tabla)
    .select("datos")
    .eq("expediente_id", expedienteId)
    .maybeSingle();
  if (error) {
    console.error(`obtenerModulo(${tabla})`, error);
    return null;
  }
  return (data?.datos as Record<string, unknown> | undefined) ?? null;
}

export const guardarFlujo = (id: number, d: Record<string, unknown>) =>
  upsertModulo("flujo_efectivo", id, d);
export const obtenerFlujo = (id: number) => obtenerModulo("flujo_efectivo", id);

export const guardarEstadoResultados = (id: number, d: Record<string, unknown>) =>
  upsertModulo("estado_resultados", id, d);
export const obtenerEstadoResultados = (id: number) => obtenerModulo("estado_resultados", id);

export const guardarSituacionFinanciera = (id: number, d: Record<string, unknown>) =>
  upsertModulo("situacion_financiera", id, d);
export const obtenerSituacionFinanciera = (id: number) =>
  obtenerModulo("situacion_financiera", id);

export const guardarGeolocalizacion = (id: number, d: Record<string, unknown>) =>
  upsertModulo("geolocalizaciones", id, d, { tipo: "expediente" }, "expediente_id,tipo");
export async function obtenerGeolocalizacion(
  id: number,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("geolocalizaciones")
    .select("datos")
    .eq("expediente_id", id)
    .eq("tipo", "expediente")
    .maybeSingle();
  if (error) {
    console.error("obtenerGeolocalizacion", error);
    return null;
  }
  return (data?.datos as Record<string, unknown> | undefined) ?? null;
}

export const guardarFiador = (id: number, d: Record<string, unknown>) =>
  upsertModulo("fiador_data", id, d);
export const obtenerFiador = (id: number) => obtenerModulo("fiador_data", id);

export const guardarGarantias = (id: number, d: Record<string, unknown>) =>
  upsertModulo("garantias_data", id, d);
export const obtenerGarantias = (id: number) => obtenerModulo("garantias_data", id);

export const guardarComite = (id: number, d: Record<string, unknown>) =>
  upsertModulo("comite_data", id, d);
export const obtenerComite = (id: number) => obtenerModulo("comite_data", id);


export interface DocumentoDB {
  id: number;
  expediente_id: number;
  categoria: string;
  doc_id: string;
  nombre: string;
  tipo_mime: string | null;
  tamano_bytes: number | null;
  base64: string | null;
  created_at: string;
}

export async function guardarDocumento(
  expedienteId: number,
  docId: string,
  archivo: { nombre: string; tipo: string; tamano: number; base64: string },
): Promise<DocumentoDB> {
  const categoria = docId.split("_")[0] ?? docId;
  const { data, error } = await supabase
    .from("documentos")
    .insert({
      expediente_id: expedienteId,
      categoria,
      doc_id: docId,
      nombre: archivo.nombre,
      tipo_mime: archivo.tipo,
      tamano_bytes: archivo.tamano,
      base64: archivo.base64,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DocumentoDB;
}

export async function eliminarDocumento(documentoId: number): Promise<void> {
  const { error } = await supabase.from("documentos").delete().eq("id", documentoId);
  if (error) throw error;
}

export async function obtenerDocumentos(expedienteId: number): Promise<DocumentoDB[]> {
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("expediente_id", expedienteId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("obtenerDocumentos", error);
    return [];
  }
  return (data as DocumentoDB[]) ?? [];
}
