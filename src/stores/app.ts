// Store global: autenticación (contra Supabase) + tema (dark/light) + simulación de rol.
// Fase 1: login usa la tabla `usuarios` de Supabase; se persiste el usuario
// en localStorage como caché para no re-loguear en cada refresh.
import { create } from "zustand";
import { obtenerSucursales, type SucursalDB, type UsuarioDB } from "@/services/expedientesService";
import { supabase } from "@/lib/supabase";

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
  // El control efectivo se implementará con RLS sobre el JWT (Bloque A).
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
      return {
        usuario: null,
        error: `El usuario "${user}" no existe o está inactivo.`,
      };
    }

    if ((perfil as { password_hash?: string }).password_hash !== password) {
      set({ cargandoLogin: false });
      return { usuario: null, error: "Contraseña incorrecta." };
    }


    const authUser = toAuthUser(perfil as unknown as UsuarioDB);

    // Si el asesor seleccionó una sucursal distinta a la asignada,
    // la guardamos como sucursal de trabajo para esta sesión.
    // La sucursal base del usuario no cambia en la BD.
    if (sucursalId && sucursalId !== authUser.sucursal_id) {
      const suc = get().sucursales.find((s) => s.id === sucursalId);
      if (suc) {
        authUser.sucursalNombre = suc.nombre;
        authUser.sucursalRegion = suc.region ?? undefined;
        // Guardamos el sucursal_id de sesión sin modificar el registro base
        (authUser as AuthUser & { sucursal_sesion_id?: number }).sucursal_sesion_id = sucursalId;
      }
    }

    set({ usuario: authUser, cargandoLogin: false, rolSimulado: null });
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
    }
    return { usuario: authUser };
  },

  logout: () => {
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

    // Sesión persistida en localStorage (login contra tabla `usuarios`)
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
