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

    const email = username.trim().includes("@")
      ? username.trim()
      : `${username.trim()}@fieldcredit.local`;

    // Supabase Auth — bcrypt, seguro
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      set({ cargandoLogin: false });
      const code = (authError as { code?: string } | null)?.code ?? "";
      const msg = authError?.message ?? "";
      console.warn("[login] fallo de autenticación", { email, code, msg });

      let error = "No se pudo iniciar sesión. Intentá de nuevo.";
      if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
        error = `Usuario o contraseña incorrectos (se intentó con el correo ${email}).`;
      } else if (code === "email_not_confirmed" || /not confirmed/i.test(msg)) {
        error = "La cuenta existe pero el correo no está confirmado. Contactá al administrador.";
      } else if (code === "over_email_send_rate_limit" || /rate limit/i.test(msg)) {
        error = "Demasiados intentos. Esperá unos minutos y volvé a probar.";
      } else if (/fetch|network/i.test(msg)) {
        error = "Sin conexión con el servidor. Revisá tu internet.";
      } else if (msg) {
        error = msg;
      }
      return { usuario: null, error };
    }

    // Obtener perfil del usuario desde la tabla usuarios
    const { data: perfil, error: perfilError } = await supabase
      .from("usuarios")
      .select("id, nombre, usuario, rol, sucursal_id, activo, sucursales(nombre, region)")
      .eq("auth_user_id", authData.user.id)
      .eq("activo", true)
      .maybeSingle();

    if (!perfil) {
      await supabase.auth.signOut();
      set({ cargandoLogin: false });
      console.warn("[login] sin perfil en `usuarios`", {
        auth_user_id: authData.user.id,
        error: perfilError?.message,
      });
      return {
        usuario: null,
        error: perfilError
          ? `No se pudo leer tu perfil: ${perfilError.message}`
          : "Tu cuenta no tiene un perfil activo asignado. Contactá al administrador.",
      };
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
    return authUser;
  },

  logout: async () => {
    await supabase.auth.signOut();
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

    // Verificar sesión activa en Supabase Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("id, nombre, usuario, rol, sucursal_id, activo, sucursales(nombre, region)")
        .eq("auth_user_id", session.user.id)
        .eq("activo", true)
        .maybeSingle();
      if (perfil) {
        const authUser = toAuthUser(perfil as unknown as UsuarioDB);
        set({ usuario: authUser });
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
      } else {
        set({ usuario: null });
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } else {
      // Sin sesión válida — limpiar caché
      set({ usuario: null });
      localStorage.removeItem(STORAGE_KEY_USER);
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
