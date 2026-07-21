// Store global: autenticación + tema (dark/light)
import { create } from "zustand";
import { usuarios, type Usuario } from "@/data/mock";

interface AppState {
  usuario: Usuario | null;
  theme: "light" | "dark";
  login: (username: string, password: string) => Usuario | null;
  logout: () => void;
  toggleTheme: () => void;
  hydrate: () => void;
}

const applyThemeClass = (t: "light" | "dark") => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
};

export const useApp = create<AppState>((set, get) => ({
  usuario: null,
  theme: "light",
  login: (username, password) => {
    const u = usuarios.find(
      (x) => x.usuario === username && x.password === password,
    );
    if (u) {
      set({ usuario: u });
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("fc_user_id", String(u.id));
      }
    }
    return u ?? null;
  },
  logout: () => {
    set({ usuario: null });
    if (typeof localStorage !== "undefined") localStorage.removeItem("fc_user_id");
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    set({ theme: next });
    if (typeof localStorage !== "undefined") localStorage.setItem("fc_theme", next);
    applyThemeClass(next);
  },
  hydrate: () => {
    if (typeof window === "undefined") return;
    const savedTheme = (localStorage.getItem("fc_theme") as "light" | "dark") || "light";
    const uid = localStorage.getItem("fc_user_id");
    const usuario = uid ? usuarios.find((u) => u.id === Number(uid)) ?? null : null;
    set({ theme: savedTheme, usuario });
    applyThemeClass(savedTheme);
  },
}));
