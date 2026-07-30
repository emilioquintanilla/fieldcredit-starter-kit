import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "pulse" = estándar shadcn, "shimmer" = efecto moderno tipo Lafise/banking */
  variant?: "pulse" | "shimmer";
}

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        variant === "shimmer" ? "skeleton-shimmer" : "animate-pulse bg-primary/10",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Skeleton prearmado para una MetricCard del dashboard.
 * Reproduce la estructura visual de MetricCard mientras carga.
 */
function SkeletonMetricCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

/**
 * Skeleton prearmado para una fila de expediente en la lista.
 */
function SkeletonExpedienteRow() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export { Skeleton, SkeletonMetricCard, SkeletonExpedienteRow };
