// src/components/Sidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Sidebar con navegación por rol (drawer en móvil, colapsable en desktop)
// Rediseño: emojis → Lucide icons (misma filosofía que BottomNav y NavBar)
// Sin otros cambios de lógica ni estructura.
// ─────────────────────────────────────────────────────────────────────────────

import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  FolderOpen,
  Users,
  Scale,
  BookOpen,
  CloudRain,
  Leaf,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useExpedientes } from "@/stores/expedientes";
import { useRolActivo, type Rol } from "@/stores/app";
import logoUrl from "@/assets/micredito.svg";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface NavItem {
  to: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  label: string;
  roles: Rol[];
}

// ── Rutas ────────────────────────────────────────────────────────────────────
const OPERACION: NavItem[] = [
  { to: "/dashboard",   Icon: Home,       label: "Dashboard",   roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/expedientes", Icon: FolderOpen, label: "Expedientes", roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/clientes",    Icon: Users,      label: "Clientes",    roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/comite",      Icon: Scale,      label: "Comité",      roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/normativa",   Icon: BookOpen,   label: "Ag. Normativo", roles: ["asesor","coordinador","gerente","admin"] }, // [FASE 3]
];

const DIRECCION: NavItem[] = [
  { to: "/alertas",       Icon: CloudRain, label: "Alertas climáticas", roles: ["asesor","coordinador","gerente","admin"] },
  { to: "/institucional", Icon: Leaf,      label: "Institucional",       roles: ["gerente","admin"] },
  { to: "/admin",         Icon: Settings,  label: "Administración",      roles: ["admin"] },
];

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}

// ── Componente principal ──────────────────────────────────────────────────────
export function Sidebar({ open, collapsed, onClose }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rol = useRolActivo();
  const comitePendientes = useExpedientes(
    (s) =>
      Object.values(s.expedientes).filter(
        (e) => e.estado === "en_comite" && !e.comite?.decision,
      ).length,
  );

  const filtrar = (items: NavItem[]) => items.filter((i) => i.roles.includes(rol));
  const opItems = filtrar(OPERACION);
  const dirItems = filtrar(DIRECCION);

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
        {/* Logo */}
        <div className="flex h-14 items-center justify-center border-b border-white/10 px-3">
          <img src={logoUrl} alt="MiCrédito" className="h-8" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2">
          <SeccionLabel texto="Operación" collapsed={collapsed} />
          {opItems.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              active={pathname.startsWith(item.to)}
              badge={item.to === "/comite" && comitePendientes > 0 ? comitePendientes : null}
              collapsed={collapsed}
              onClose={onClose}
            />
          ))}

          {dirItems.length > 0 && (
            <>
              <SeccionLabel texto="Dirección" collapsed={collapsed} />
              {dirItems.map((item) => (
                <NavLink
                  key={item.to}
                  item={item}
                  active={pathname.startsWith(item.to)}
                  badge={null}
                  collapsed={collapsed}
                  onClose={onClose}
                />
              ))}
            </>
          )}
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

// ── Componentes internos ──────────────────────────────────────────────────────
function SeccionLabel({ texto, collapsed }: { texto: string; collapsed: boolean }) {
  return (
    <p
      className={cn(
        "mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-widest text-white/40",
        collapsed && "md:hidden",
      )}
    >
      {texto}
    </p>
  );
}

function NavLink({
  item, active, badge, collapsed, onClose,
}: {
  item: NavItem;
  active: boolean;
  badge: number | null;
  collapsed: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      to={item.to}
      onClick={onClose}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active
          ? "bg-fieldcredit-green text-white shadow-sm ring-1 ring-white/30"
          : "text-white/80 hover:bg-white/10 hover:text-white active:bg-white/20",
      )}
      title={item.label}
    >
      <item.Icon
        size={18}
        strokeWidth={active ? 2.2 : 1.8}
        className="w-5 shrink-0"
        aria-hidden
      />
      <span className={cn("flex-1 truncate", collapsed && "md:hidden")}>
        {item.label}
      </span>
      {badge !== null && (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full bg-fieldcredit-amber px-1.5 text-[10px] font-bold text-white",
            collapsed && "md:hidden",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

