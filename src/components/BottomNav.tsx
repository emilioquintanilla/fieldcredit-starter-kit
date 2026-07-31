// Barra de navegación inferior — solo visible en móvil
// Fase 3 UX: backdrop blur, indicador activo animado, colores semánticos
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch justify-around border-t border-border bg-background/80 backdrop-blur-overlay pb-safe md:hidden">
      {items.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-all duration-200",
              active
                ? "text-fieldcredit-green"
                : "text-muted-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {/* Icono con fondo tonal cuando activo */}
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none transition-all duration-200",
                active && "bg-fieldcredit-green-pale dark:bg-green-900/30 scale-110",
              )}
            >
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
            {/* Dot indicador activo */}
            {active && (
              <span
                className="absolute bottom-1.5 h-1 w-1 rounded-full bg-fieldcredit-green"
                style={{ animation: "scaleIn 0.2s ease-out" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
