// src/components/BottomNav.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Barra de navegación inferior — rediseño floating pill (iOS 18 / WhatsApp 2024)
// Reemplaza completamente el BottomNav anterior.
//
// Cambios respecto a la versión anterior:
//   - Emoji icons → Lucide React (consistente con NavBar, Sidebar, rutas)
//   - Fondo pegado al borde → pill flotante con glassmorphism + sombra
//   - Indicador activo: pill deslizante spring-physics (cubic-bezier)
//   - Micro-bounce en el ícono al activarse
//   - Badge de Comité conectado al store real (comitePendientes)
//   - Respeta prefers-reduced-motion
//   - Compatible 100% con el design system de styles.css:
//       colores fieldcredit-*, animate-*, backdrop-blur-overlay, pb-safe
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, FolderOpen, Users, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRolActivo, type Rol } from "@/stores/app";
import { useExpedientes } from "@/stores/expedientes";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface NavItem {
  to: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  roles: Rol[];
  badge?: boolean; // si true, lee comitePendientes del store
}

// ── Definición de ítems ──────────────────────────────────────────────────────
const ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Inicio",
    Icon: Home,
    roles: ["asesor", "coordinador", "gerente", "admin"],
  },
  {
    to: "/expedientes",
    label: "Expedientes",
    Icon: FolderOpen,
    roles: ["asesor", "coordinador", "gerente", "admin"],
  },
  {
    to: "/clientes",
    label: "Clientes",
    Icon: Users,
    roles: ["asesor", "coordinador", "gerente", "admin"],
  },
  {
    to: "/comite",
    label: "Comité",
    Icon: Scale,
    roles: ["asesor", "coordinador", "gerente", "admin"],
    badge: true,
  },
];

// ── Componente ───────────────────────────────────────────────────────────────
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rol = useRolActivo();

  // Badge: expedientes en comité sin decisión
  const comitePendientes = useExpedientes(
    (s) =>
      Object.values(s.expedientes).filter(
        (e) => e.estado === "en_comite" && !e.comite?.decision,
      ).length,
  );

  const items = ITEMS.filter((i) => i.roles.includes(rol));

  // ── Pill deslizante ────────────────────────────────────────────────────────
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  // Actualiza posición del pill cuando cambia la ruta o el layout
  useEffect(() => {
    const active = items.find((i) => pathname.startsWith(i.to));
    if (!active) return;

    const el = itemRefs.current[active.to];
    if (!el || !navRef.current) return;

    const navRect = navRef.current.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    setPillStyle({
      left: itemRect.left - navRect.left + 4,
      width: itemRect.width - 8,
    });
  }, [pathname, items]);

  return (
    <>
      {/* ── Keyframes inline (sin dependencias externas) ── */}
      <style>{`
        @keyframes fc-bounce {
          0%   { transform: scale(1);    }
          40%  { transform: scale(1.22); }
          70%  { transform: scale(0.94); }
          100% { transform: scale(1);    }
        }
        @keyframes fc-label-in {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes fc-nav-enter {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fc-icon-active { animation: fc-bounce 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .fc-label-active { animation: fc-label-in 0.22s ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .fc-icon-active, .fc-label-active, .fc-nav-enter { animation: none !important; }
        }
      `}</style>

      {/* ── Wrapper flotante ── */}
      <div
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 pb-safe md:hidden"
        style={{
          width: "calc(100% - 32px)",
          maxWidth: 420,
          animation: "fc-nav-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
        aria-label="Menú principal"
      >
        {/* Pill container */}
        <nav
          ref={navRef}
          className="relative flex items-stretch justify-around rounded-[28px] border border-white/50 bg-background/82 px-1.5 py-2 backdrop-blur-overlay"
          style={{
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {/* Pill activo deslizante */}
          {pillStyle && (
            <span
              className="pointer-events-none absolute inset-y-2 rounded-[22px] bg-fieldcredit-green-pale dark:bg-green-900/30"
              style={{
                left: pillStyle.left,
                width: pillStyle.width,
                transition:
                  "left 0.38s cubic-bezier(0.34,1.56,0.64,1), width 0.38s cubic-bezier(0.34,1.56,0.64,1)",
              }}
              aria-hidden
            />
          )}

          {/* Ítems */}
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            const badgeCount = item.badge ? comitePendientes : 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                ref={(el) => { itemRefs.current[item.to] = el; }}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-1.5",
                  "select-none outline-none transition-transform duration-150",
                  "active:scale-95",
                )}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
              >
                {/* Ícono + badge */}
                <span className="relative">
                  <item.Icon
                    size={22}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={cn(
                      "transition-colors duration-200",
                      active
                        ? cn("text-fieldcredit-green", "fc-icon-active")
                        : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  {badgeCount > 0 && (
                    <span
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-background bg-fieldcredit-green px-1 text-[9px] font-bold text-white"
                      aria-label={`${badgeCount} pendientes`}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    "truncate text-[10.5px] font-semibold leading-none transition-colors duration-200",
                    active
                      ? cn("text-fieldcredit-green", "fc-label-active")
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
