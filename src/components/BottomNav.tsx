// src/components/BottomNav.tsx
// Barra de navegación inferior — floating pill
// FASE 3: Se agrega "Normativa" (Agente Normativo) como quinto ítem.
import { useRef, useEffect, useState, useCallback } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, FolderOpen, Users, Scale, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRolActivo, type Rol } from "@/stores/app";
import { useExpedientes } from "@/stores/expedientes";

interface NavItem {
  to: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  roles: Rol[];
  badge?: boolean;
}

const ITEMS: NavItem[] = [
  { to: "/dashboard",   label: "Inicio",     Icon: Home,     roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/expedientes", label: "Expedientes",Icon: FolderOpen,roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/clientes",    label: "Clientes",   Icon: Users,    roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/comite",      label: "Comité",     Icon: Scale,    roles: ["asesor","coordinador","gerente","admin"], badge: true },
  { to: "/normativa",   label: "Normativa",  Icon: BookOpen, roles: ["asesor","coordinador","gerente","admin"] }, // [FASE 3]
];

interface BottomNavProps {
  sidebarOpen?: boolean;
}

export function BottomNav({ sidebarOpen = false }: BottomNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rol = useRolActivo();

  const comitePendientes = useExpedientes(
    (s) => Object.values(s.expedientes).filter(
      (e) => e.estado === "en_comite" && !e.comite?.decision,
    ).length,
  );

  const items = ITEMS.filter((i) => i.roles.includes(rol));

  const navRef   = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const active = items.find((i) => pathname.startsWith(i.to));
    if (!active) return;
    const el = itemRefs.current[active.to];
    if (!el || !navRef.current) return;
    const navRect  = navRef.current.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    setPillStyle({ left: itemRect.left - navRect.left + 4, width: itemRect.width - 8 });
  }, [pathname, items]);

  const [shrink, setShrink] = useState(false);
  const lastScrollY = useRef(0);

  const onScroll = useCallback(() => {
    const current = window.scrollY;
    const delta   = current - lastScrollY.current;
    if (delta > 6 && current > 40) setShrink(true);
    if (delta < -6)                 setShrink(false);
    lastScrollY.current = current;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const visible = !sidebarOpen;

  return (
    <>
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
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
        .fc-icon-active  { animation: fc-bounce   0.42s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .fc-label-active { animation: fc-label-in 0.22s ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .fc-icon-active, .fc-label-active { animation: none !important; }
        }
      `}</style>

      <div
        className="fixed bottom-4 left-1/2 z-50 pb-safe md:hidden"
        style={{
          width: "calc(100% - 32px)",
          maxWidth: 480, // aumentado de 420 a 480 para acomodar el 5to ítem
          animation: "fc-nav-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
          display:       visible ? undefined : "none",
          opacity:       visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transform:     `translateX(-50%) translateY(${visible ? 0 : 24}px)`,
          transition:    "opacity 0.28s ease, transform 0.28s cubic-bezier(0.16,1,0.3,1)",
        }}
        aria-label="Menú principal"
        aria-hidden={!visible}
      >
        <nav
          ref={navRef}
          className="relative flex items-stretch justify-around border border-white/50 bg-background/82 backdrop-blur-overlay"
          style={{
            boxShadow:    "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
            borderRadius: shrink ? "40px" : "28px",
            padding:      shrink ? "6px 8px" : "8px 6px",
            transition:   "border-radius 0.35s cubic-bezier(0.16,1,0.3,1), padding 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Pill activo */}
          {pillStyle && (
            <span
              className="pointer-events-none absolute inset-y-2 rounded-[22px] bg-fieldcredit-green-pale dark:bg-green-900/30"
              style={{
                left:  pillStyle.left,
                width: pillStyle.width,
                transition: "left 0.38s cubic-bezier(0.34,1.56,0.64,1), width 0.38s cubic-bezier(0.34,1.56,0.64,1)",
              }}
              aria-hidden
            />
          )}

          {items.map((item) => {
            const active     = pathname.startsWith(item.to);
            const badgeCount = item.badge ? comitePendientes : 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                ref={(el) => { itemRefs.current[item.to] = el; }}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center rounded-[22px] px-1 select-none outline-none active:scale-95",
                  shrink ? "gap-0 py-1.5" : "gap-1 py-1.5",
                )}
                style={{ transition: "gap 0.35s cubic-bezier(0.16,1,0.3,1)" }}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
              >
                <span className="relative">
                  <item.Icon
                    size={shrink ? 20 : 22}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={cn(
                      "transition-colors duration-200",
                      active
                        ? item.to === "/normativa"
                          ? "text-fieldcredit-teal fc-icon-active"
                          : "text-fieldcredit-green fc-icon-active"
                        : "text-muted-foreground",
                    )}
                    style={{ transition: "width 0.35s ease, height 0.35s ease" }}
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

                <span
                  className={cn(
                    "truncate text-[10px] font-semibold leading-none transition-colors duration-200",
                    active
                      ? item.to === "/normativa"
                        ? "text-fieldcredit-teal fc-label-active"
                        : "text-fieldcredit-green fc-label-active"
                      : "text-muted-foreground",
                  )}
                  style={{
                    maxHeight:  shrink ? 0 : "1.2em",
                    opacity:    shrink ? 0 : 1,
                    overflow:   "hidden",
                    transition: "max-height 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease",
                  }}
                  aria-hidden={shrink}
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
