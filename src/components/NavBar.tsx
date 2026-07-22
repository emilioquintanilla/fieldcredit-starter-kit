// Barra superior de navegación
import { Menu, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/stores/app";
import { IndicadorGuardado } from "@/components/ui/IndicadorGuardado";
import logoUrl from "@/assets/micredito.svg";

interface Props {
  onToggleSidebar: () => void;
}

export function NavBar({ onToggleSidebar }: Props) {
  const { usuario, theme, toggleTheme, logout } = useApp();
  const navigate = useNavigate();
  const sucursalNombre = usuario?.sucursalNombre ?? "";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur transition-colors dark:border-slate-700 dark:bg-slate-800/95 sm:px-4">
      <button
        onClick={onToggleSidebar}
        className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Menú"
      >
        <Menu size={20} />
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <img src={logoUrl} alt="MiCrédito" className="h-8 shrink-0" />
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
        <span className="truncate font-bold text-fieldcredit-green">FieldCredit</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <IndicadorGuardado />
        <button
          onClick={toggleTheme}
          className="grid h-9 w-9 place-items-center rounded-md text-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Cambiar tema"
        >
          {theme === "light" ? "☀️" : "🌙"}
        </button>
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {usuario?.nombre}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {sucursalNombre}
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
          className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-fieldcredit-red-light hover:text-fieldcredit-red dark:text-slate-300 dark:hover:bg-red-900/30"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
