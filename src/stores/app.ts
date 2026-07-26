// Store global: autenticación (contra Supabase) + tema (dark/light) + simulación de rol.
// Fase 1: login usa la tabla `usuarios` de Supabase; se persiste el usuario
// en localStorage como caché para no re-loguear en cada refresh.
import { create } from "zustand";
import { verificarLogin, obtenerSucursales, type SucursalDB, type UsuarioDB } from "@/services/expedientesService";

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

  login: (username: string, password: string) => Promise<AuthUser | null>;
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

  login: async (username, password) => {
    set({ cargandoLogin: true });
    const u = await verificarLogin(username.trim(), password);
    if (!u) {
      set({ cargandoLogin: false });
      return null;
    }
    const authUser = toAuthUser(u);
    set({ usuario: authUser, cargandoLogin: false, rolSimulado: null });
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
    }
    return authUser;
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
    const rawUser = localStorage.getItem(STORAGE_KEY_USER);
    let usuario: AuthUser | null = null;
    if (rawUser) {
      try {
        usuario = JSON.parse(rawUser) as AuthUser;
      } catch {
        usuario = null;
      }
    }
    set({ theme: savedTheme, usuario });
    applyThemeClass(savedTheme);
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
