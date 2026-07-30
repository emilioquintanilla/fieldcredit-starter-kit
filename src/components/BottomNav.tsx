// Barra de navegación inferior — solo visible en móvil
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRolActivo, type Rol } from "@/stores/app";

interface Item {
  to: string;
  icon: string;
  label: string;
  roles: Rol[];
}

const ITEMS: Item[] = [
  { to: "/dashboard", icon: "🏠", label: "Inicio", roles: ["asesor", "coordinador", "gerente", "admin"] },
  { to: "/expedientes", icon: "📋", label: "Expedientes", roles: ["asesor", "coordinador", "gerente", "admin"] },
  { to: "/clientes", icon: "👥", label: "Clientes", roles: ["asesor", "coordinador", "gerente", "admin"] },
  { to: "/comite", icon: "⚖️", label: "Comité", roles: ["asesor", "coordinador", "gerente", "admin"] },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rol = useRolActivo();
  const items = ITEMS.filter((i) => i.roles.includes(rol));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch justify-around border-t border-slate-200 bg-white pb-safe dark:border-slate-700 dark:bg-slate-800 md:hidden">
      {items.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors",
              active
                ? "text-fieldcredit-green"
                : "text-slate-500 dark:text-slate-400",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
