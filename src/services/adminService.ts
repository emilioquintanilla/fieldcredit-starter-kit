// ─────────────────────────────────────────────────────────────────────────────
// Servicio administrativo: CRUD de usuarios, productos y parámetros.
// Ruta del archivo: src/services/adminService.ts
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabase";

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface UsuarioAdmin {
  id: number;
  nombre: string;
  usuario: string;
  rol: "asesor" | "coordinador" | "gerente" | "admin";
  sucursal_id: number;
  activo: boolean;
  sucursales?: { nombre: string; region: string | null } | null;
}

export interface ProductoAdmin {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  es_verde: boolean;
  linea_verde: string | null;
  monto_min: number | null;
  monto_max: number | null;
  plazo_min_meses: number | null;
  plazo_max_meses: number | null;
  tasa_anual: number | null;
  requiere_fiador_desde: number | null;
  activo: boolean;
}

export interface ParametroAdmin {
  id: number;
  clave: string;
  valor: unknown;
  descripcion: string | null;
  categoria: string | null;
  editable: boolean;
  updated_at: string;
}

export interface SucursalAdmin {
  id: number;
  nombre: string;
  region: string | null;
  activa: boolean;
}

// ── Usuarios ────────────────────────────────────────────────────────────────
export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, usuario, rol, sucursal_id, activo, sucursales(nombre, region)")
    .order("nombre");
  if (error) {
    console.error("[admin] listarUsuarios", error.message);
    return [];
  }
  return (data as unknown as UsuarioAdmin[]) ?? [];
}

export async function crearUsuario(datos: {
  nombre: string;
  usuario: string;
  password_hash: string;
  rol: UsuarioAdmin["rol"];
  sucursal_id: number;
}): Promise<UsuarioAdmin | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .insert({ ...datos, activo: true })
    .select("id, nombre, usuario, rol, sucursal_id, activo, sucursales(nombre, region)")
    .single();
  if (error) {
    console.error("[admin] crearUsuario", error.message);
    return null;
  }
  return data as unknown as UsuarioAdmin;
}

export async function actualizarUsuario(
  id: number,
  patch: Partial<Pick<UsuarioAdmin, "nombre" | "rol" | "sucursal_id" | "activo">>,
): Promise<boolean> {
  const { error } = await supabase.from("usuarios").update(patch).eq("id", id);
  if (error) {
    console.error("[admin] actualizarUsuario", error.message);
    return false;
  }
  return true;
}

export async function cambiarPasswordUsuario(id: number, nuevaPassword: string): Promise<boolean> {
  const { error } = await supabase
    .from("usuarios")
    .update({ password_hash: nuevaPassword })
    .eq("id", id);
  if (error) {
    console.error("[admin] cambiarPassword", error.message);
    return false;
  }
  return true;
}

// ── Productos ───────────────────────────────────────────────────────────────
export async function listarProductos(): Promise<ProductoAdmin[]> {
  const { data, error } = await supabase
    .from("productos_credito")
    .select("*")
    .order("nombre");
  if (error) {
    console.error("[admin] listarProductos", error.message);
    return [];
  }
  return (data as ProductoAdmin[]) ?? [];
}

export async function actualizarProducto(
  id: number,
  patch: Partial<Omit<ProductoAdmin, "id" | "codigo">>,
): Promise<boolean> {
  const { error } = await supabase
    .from("productos_credito")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[admin] actualizarProducto", error.message);
    return false;
  }
  return true;
}

// ── Parámetros ──────────────────────────────────────────────────────────────
export async function listarParametros(): Promise<ParametroAdmin[]> {
  const { data, error } = await supabase
    .from("parametros_institucionales")
    .select("*")
    .order("categoria")
    .order("clave");
  if (error) {
    console.error("[admin] listarParametros", error.message);
    return [];
  }
  return (data as ParametroAdmin[]) ?? [];
}

export async function actualizarParametro(
  id: number,
  valor: unknown,
  actualizadoPor: number,
): Promise<boolean> {
  const { error } = await supabase
    .from("parametros_institucionales")
    .update({
      valor: typeof valor === "string" ? valor : JSON.stringify(valor),
      actualizado_por: actualizadoPor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[admin] actualizarParametro", error.message);
    return false;
  }
  return true;
}

// ── Sucursales (solo lectura por ahora) ─────────────────────────────────────
export async function listarSucursalesAdmin(): Promise<SucursalAdmin[]> {
  const { data, error } = await supabase
    .from("sucursales")
    .select("id, nombre, region, activa")
    .order("nombre");
  if (error) {
    console.error("[admin] listarSucursales", error.message);
    return [];
  }
  return (data as SucursalAdmin[]) ?? [];
}

// ── Bitácora ────────────────────────────────────────────────────────────────
export async function registrarBitacora(registro: {
  usuario_id: number | null;
  usuario_nombre: string | null;
  usuario_rol: string | null;
  accion: string;
  entidad?: string;
  entidad_id?: string;
  descripcion?: string;
  valor_anterior?: unknown;
  valor_nuevo?: unknown;
}): Promise<void> {
  try {
    await supabase.from("bitacora_auditoria").insert({
      ...registro,
      valor_anterior: registro.valor_anterior ? JSON.stringify(registro.valor_anterior) : null,
      valor_nuevo: registro.valor_nuevo ? JSON.stringify(registro.valor_nuevo) : null,
    });
  } catch (e) {
    console.warn("[bitacora] no se pudo registrar:", e);
  }
}
