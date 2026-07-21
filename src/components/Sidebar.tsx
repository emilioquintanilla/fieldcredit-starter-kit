// Sidebar con navegación principal (drawer en móvil, colapsable en desktop)
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/micredito.svg";

const ITEMS = [
  { to: "/dashboard", icon: "🏠", label: "Dashboard" },
  { to: "/expedientes", icon: "📋", label: "Expedientes" },
  { to: "/clientes", icon: "👥", label: "Clientes" },
  { to: "/comite", icon: "⚖️", label: "Comité" },
] as const;

interface Props {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}

export function Sidebar({ open, collapsed, onClose }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-fieldcredit-green-dark text-white transition-all duration-200 dark:bg-slate-900",
          "md:static md:z-auto",
          collapsed ? "md:w-16" : "md:w-56",
          open ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-center border-b border-white/10 px-3">
          <img src={logoUrl} alt="MiCrédito" className="h-8" />
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {ITEMS.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-fieldcredit-green text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
                title={item.label}
              >
                <span className="text-lg">{item.icon}</span>
                <span className={cn("truncate", collapsed && "md:hidden")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div
          className={cn(
            "border-t border-white/10 p-3 text-xs text-white/60",
            collapsed && "md:hidden",
          )}
        >
          FieldCredit v1.0
        </div>
      </aside>
    </>
  );
}
