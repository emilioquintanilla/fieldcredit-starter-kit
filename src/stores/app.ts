// Store global: autenticación (contra Supabase) + tema (dark/light) + simulación de rol.
// El login usa la tabla `usuarios`; se persiste el usuario en localStorage como
// caché para no re-loguear en cada refresh, y se registra auditoría en bitácora.
import { create } from "zustand";
import { obtenerSucursales, type SucursalDB, type UsuarioDB } from "@/services/expedientesService";
import { supabase } from "@/lib/supabase";
import { registrarBitacora } from "@/services/adminService";
import {
  describirDispositivo,
  describirUbicacion,
  obtenerDispositivo,
  obtenerUbicacionIp,
} from "@/lib/dispositivo";

export type Rol = "asesor" | "coordinador" | "gerente" | "admin";

export interface AuthUser {
  id: number;
  nombre: string;
  usuario: string;
  rol: Rol;
  sucursal_id: number;
  sucursalNombre?: string;
  sucursalRegion?: string;
}

interface AppState {
  usuario: AuthUser | null;
  sucursales: SucursalDB[];
  theme: "light" | "dark";
  cargandoLogin: boolean;

  // ── Simulación de rol (solo para demos) ──────────────────────────────────
  // Permite al admin previsualizar la interfaz como otro rol sin cerrar sesión.
  // ⚠️ NO es control de acceso real: el rol vive en localStorage y es editable.
  rolSimulado: Rol | null;
  setRolSimulado: (rol: Rol | null) => void;

  login: (
    username: string,
    password: string,
    sucursalId?: number,
  ) => Promise<{ usuario: AuthUser | null; error?: string }>;
  logout: () => void;
  toggleTheme: () => void;
  hydrate: () => Promise<void>;
  cargarSucursales: () => Promise<void>;
}

const STORAGE_KEY_USER = "fc_user_json";
const STORAGE_KEY_THEME = "fc_theme";

const applyThemeClass = (t: "light" | "dark") => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
};

const toAuthUser = (u: UsuarioDB): AuthUser => ({
  id: u.id,
  nombre: u.nombre,
  usuario: u.usuario,
  rol: u.rol as Rol,
  sucursal_id: u.sucursal_id,
  sucursalNombre: u.sucursales?.nombre,
  sucursalRegion: u.sucursales?.region ?? undefined,
});

/** Registra un evento de sesión en la bitácora con dispositivo + IP. */
async function auditarSesion(params: {
  accion: "login" | "login_fallido" | "logout";
  usuario: AuthUser | null;
  usuarioIntento: string;
  detalle?: string;
  sucursalId?: number;
}) {
  try {
    const disp = obtenerDispositivo();
    const ip = await obtenerIpCliente();
    const etiqueta =
      params.accion === "login"
        ? "Inicio de sesión"
        : params.accion === "logout"
          ? "Cierre de sesión"
          : "Intento de sesión fallido";
    await registrarBitacora({
      usuario_id: params.usuario?.id ?? null,
      usuario_nombre: params.usuario?.nombre ?? params.usuarioIntento,
      usuario_rol: params.usuario?.rol ?? null,
      accion: params.accion,
      entidad: "sesion",
      entidad_id: params.usuario ? String(params.usuario.id) : params.usuarioIntento,
      descripcion: `${etiqueta} · ${describirDispositivo(disp)} · IP ${ip ?? "desconocida"}${
        params.detalle ? ` · ${params.detalle}` : ""
      }`,
      ip,
      valor_nuevo: {
        usuario: params.usuarioIntento,
        sucursal_id: params.sucursalId ?? null,
        ip,
        dispositivo: disp,
        fecha: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("[auditoría sesión] no se pudo registrar:", e);
  }
}

export const useApp = create<AppState>((set, get) => ({
  usuario: null,
  sucursales: [],
  theme: "light",
  cargandoLogin: false,
  rolSimulado: null,

  setRolSimulado: (rol) => set({ rolSimulado: rol }),

  login: async (username, password, sucursalId?: number) => {
    set({ cargandoLogin: true });

    // Login contra la tabla `usuarios` (password_hash).
    // Se acepta tanto "usuario" como "usuario@dominio" (se toma la parte local).
    const ingresado = username.trim();
    const user = ingresado.includes("@") ? ingresado.split("@")[0] : ingresado;

    const { data: perfil, error: perfilError } = await supabase
      .from("usuarios")
      .select("id, nombre, usuario, rol, sucursal_id, activo, password_hash, sucursales(nombre, region)")
      .eq("usuario", user)
      .eq("activo", true)
      .maybeSingle();

    if (perfilError) {
      set({ cargandoLogin: false });
      console.warn("[login] error al leer perfil", perfilError.message);
      return { usuario: null, error: `No se pudo verificar el usuario: ${perfilError.message}` };
    }

    if (!perfil) {
      set({ cargandoLogin: false });
      void auditarSesion({
        accion: "login_fallido",
        usuario: null,
        usuarioIntento: user,
        detalle: "usuario inexistente o inactivo",
        sucursalId,
      });
      return {
        usuario: null,
        error: `El usuario "${user}" no existe o está inactivo.`,
      };
    }

    if ((perfil as { password_hash?: string }).password_hash !== password) {
      set({ cargandoLogin: false });
      void auditarSesion({
        accion: "login_fallido",
        usuario: null,
        usuarioIntento: user,
        detalle: "contraseña incorrecta",
        sucursalId,
      });
      return { usuario: null, error: "Contraseña incorrecta." };
    }

    const authUser = toAuthUser(perfil as unknown as UsuarioDB);

    // Si el asesor seleccionó una sucursal distinta a la asignada,
    // la guardamos como sucursal de trabajo para esta sesión.
    if (sucursalId && sucursalId !== authUser.sucursal_id) {
      const suc = get().sucursales.find((s) => s.id === sucursalId);
      if (suc) {
        authUser.sucursalNombre = suc.nombre;
        authUser.sucursalRegion = suc.region ?? undefined;
        (authUser as AuthUser & { sucursal_sesion_id?: number }).sucursal_sesion_id = sucursalId;
      }
    }

    set({ usuario: authUser, cargandoLogin: false, rolSimulado: null });
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
    }
    void auditarSesion({
      accion: "login",
      usuario: authUser,
      usuarioIntento: authUser.usuario,
      detalle: authUser.sucursalNombre ? `Sucursal ${authUser.sucursalNombre}` : undefined,
      sucursalId,
    });
    return { usuario: authUser };
  },

  logout: () => {
    const actual = get().usuario;
    if (actual) {
      void auditarSesion({
        accion: "logout",
        usuario: actual,
        usuarioIntento: actual.usuario,
      });
    }
    set({ usuario: null, rolSimulado: null });
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY_USER);
  },

  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    set({ theme: next });
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY_THEME, next);
    applyThemeClass(next);
  },

  hydrate: async () => {
    if (typeof window === "undefined") return;
    const savedTheme = (localStorage.getItem(STORAGE_KEY_THEME) as "light" | "dark") || "light";
    set({ theme: savedTheme });
    applyThemeClass(savedTheme);

    const cache = localStorage.getItem(STORAGE_KEY_USER);
    if (cache) {
      try {
        set({ usuario: JSON.parse(cache) as AuthUser });
      } catch {
        localStorage.removeItem(STORAGE_KEY_USER);
        set({ usuario: null });
      }
    }
    if (get().sucursales.length === 0) {
      void get().cargarSucursales();
    }
  },

  cargarSucursales: async () => {
    const data = await obtenerSucursales();
    set({ sucursales: data });
  },
}));

/** Rol efectivo: el simulado (si existe) o el real del usuario. */
export function useRolActivo(): Rol {
  const real = useApp((s) => s.usuario?.rol ?? "asesor");
  const sim = useApp((s) => s.rolSimulado);
  return sim ?? real;
}
