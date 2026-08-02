// src/components/NavBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Barra superior de navegación + selector de rol para presentaciones
// Fase 3 UX: colores semánticos, rounded-xl, backdrop blur consistente
// CAMBIO: ☀️/🌙 emoji → Lucide Sun/Moon (unifica lenguaje de íconos)
// ─────────────────────────────────────────────────────────────────────────────

import { Menu, LogOut, Eye, Sun, Moon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useApp, useRolActivo, type Rol } from "@/stores/app";
import { IndicadorGuardado } from "@/components/ui/IndicadorGuardado";
import logoUrl from "@/assets/micredito.svg";

const ROLES_DISPONIBLES: Array<{ rol: Rol; label: string }> = [
  { rol: "asesor",       label: "Asesor" },
  { rol: "coordinador",  label: "Coordinador" },
  { rol: "gerente",      label: "Gerente" },
  { rol: "admin",        label: "Administrador" },
];

interface Props {
  onToggleSidebar: () => void;
}

export function NavBar({ onToggleSidebar }: Props) {
  const { usuario, theme, toggleTheme, logout, rolSimulado, setRolSimulado } = useApp();
  const rolActivo = useRolActivo();
  const navigate = useNavigate();
  const sucursalNombre = usuario?.sucursalNombre ?? "";
  const esAdmin = usuario?.rol === "admin";

  return (
    <>
      {/* Franja de aviso cuando el rol está simulado */}
      {rolSimulado && (
        <div className="flex items-center justify-center gap-1.5 bg-fieldcredit-amber px-2 py-1 sm:gap-2 sm:px-3 sm:py-1.5">
          <Eye size={12} className="shrink-0 text-white sm:h-3.5 sm:w-3.5" />
          <span className="truncate text-[10px] font-bold text-white sm:text-xs">
            Vista previa como{" "}
            {ROLES_DISPONIBLES.find((r) => r.rol === rolSimulado)?.label ?? rolSimulado}
          </span>
          <span className="hidden text-xs text-white/80 sm:inline">— no es el rol real</span>
          <button
            onClick={() => setRolSimulado(null)}
            className="ml-1 shrink-0 rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/30 sm:ml-2 sm:text-xs"
          >
            Salir
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-overlay sm:px-4">
        <button
          onClick={onToggleSidebar}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-accent"
          aria-label="Menú"
        >
          <Menu size={22} />
        </button>

        <div className="flex min-w-0 items-center gap-3">
          <img src={logoUrl} alt="MiCrédito" className="h-8 shrink-0" />
          <div className="hidden h-6 w-px bg-border sm:block" />
          <span className="hidden truncate font-bold text-fieldcredit-green sm:inline">
            FieldCredit
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <IndicadorGuardado />
          </div>

          {/* Selector de rol (solo admin) */}
          {esAdmin && (
            <div className="hidden items-center gap-1 rounded-xl border border-border bg-muted px-2 py-1 sm:flex">
              <Eye size={14} className="text-muted-foreground" />
              <select
                value={rolSimulado ?? "real"}
                onChange={(e) => {
                  const v = e.target.value;
                  setRolSimulado(v === "real" ? null : (v as Rol));
                }}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="real">Mi rol ({usuario?.rol})</option>
                {ROLES_DISPONIBLES.filter((r) => r.rol !== usuario?.rol).map((r) => (
                  <option key={r.rol} value={r.rol}>
                    Ver como: {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle de tema — Lucide Sun/Moon en vez de ☀️/🌙 */}
          <button
            onClick={toggleTheme}
            className="hidden h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-accent sm:grid"
            aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
          >
            {theme === "light" ? (
              <Sun size={18} strokeWidth={1.8} />
            ) : (
              <Moon size={18} strokeWidth={1.8} />
            )}
          </button>

          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-foreground">{usuario?.nombre}</div>
            <div className="text-xs text-muted-foreground">
              {sucursalNombre} · {rolActivo}
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-fieldcredit-red-light hover:text-fieldcredit-red dark:hover:bg-red-900/30 sm:h-9 sm:w-9"
            aria-label="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
    </>
  );
}
