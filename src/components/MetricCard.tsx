// src/components/MetricCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Card de métrica para el dashboard
// CAMBIO: prop `icon: string` (emoji) → `Icon: LucideIcon` (componente)
//
// MIGRACIÓN en dashboard.tsx — buscar y reemplazar así:
//   ANTES: <MetricCard icon="📋" ... />
//   AHORA: <MetricCard Icon={FolderOpen} ... />
//
// Importaciones necesarias en dashboard.tsx:
//   import { FolderOpen, Clock, Scale, CheckCircle2 } from "lucide-react";
// ─────────────────────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  Icon: LucideIcon;
  color?: "green" | "amber" | "teal" | "green-dark";
  trend?: string;
}

const COLORS: Record<NonNullable<Props["color"]>, { wrap: string; icon: string }> = {
  green: {
    wrap: "bg-fieldcredit-green-pale dark:bg-green-900/30",
    icon: "text-fieldcredit-green-dark dark:text-green-200",
  },
  amber: {
    wrap: "bg-fieldcredit-amber-light dark:bg-amber-900/30",
    icon: "text-fieldcredit-amber dark:text-amber-200",
  },
  teal: {
    wrap: "bg-fieldcredit-teal-pale dark:bg-teal-900/30",
    icon: "text-fieldcredit-teal-dark dark:text-teal-200",
  },
  "green-dark": {
    wrap: "bg-fieldcredit-green-light dark:bg-green-900/40",
    icon: "text-fieldcredit-green-dark dark:text-green-100",
  },
};

export function MetricCard({ title, value, Icon, color = "green", trend }: Props) {
  const c = COLORS[color];
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", c.wrap)}>
          <Icon size={20} strokeWidth={1.8} className={c.icon} aria-hidden />
        </span>
        {trend && <span className="text-xs text-muted-foreground">{trend}</span>}
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{title}</div>
    </div>
  );
}
