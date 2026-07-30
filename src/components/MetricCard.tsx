// Card de métrica para el dashboard
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  icon: string;
  color?: "green" | "amber" | "teal" | "green-dark";
  trend?: string;
}

const COLORS: Record<NonNullable<Props["color"]>, string> = {
  green: "bg-fieldcredit-green-pale text-fieldcredit-green-dark dark:bg-green-900/30 dark:text-green-200",
  amber: "bg-fieldcredit-amber-light text-fieldcredit-amber dark:bg-amber-900/30 dark:text-amber-200",
  teal: "bg-fieldcredit-teal-pale text-fieldcredit-teal-dark dark:bg-teal-900/30 dark:text-teal-200",
  "green-dark": "bg-fieldcredit-green-light text-fieldcredit-green-dark dark:bg-green-900/40 dark:text-green-100",
};

export function MetricCard({ title, value, icon, color = "green", trend }: Props) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-lg text-xl", COLORS[color])}>
          {icon}
        </span>
        {trend && <span className="text-xs text-muted-foreground">{trend}</span>}
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{title}</div>
    </div>
  );
}
