// Burbujas de mensajes reutilizables (chat de campo y chat de comité).
import type { Mensaje } from "@/services/ia/adaptadorIA";
import { cn } from "@/lib/utils";

export function BurbujaMensaje({ mensaje, tema = "oscuro" }: { mensaje: Mensaje; tema?: "oscuro" | "claro" }) {
  const esUser = mensaje.role === "user";
  const claseUser = tema === "oscuro" ? "bg-fieldcredit-teal text-white" : "bg-fieldcredit-teal text-white";
  const claseAsist =
    tema === "oscuro"
      ? "bg-white/10 text-white/90"
      : "bg-white text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700";
  return (
    <div className={cn("flex", esUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-snug",
          esUser ? claseUser : claseAsist,
        )}
      >
        {mensaje.content}
      </div>
    </div>
  );
}

export function BurbujaEscribiendo({ tema = "oscuro" }: { tema?: "oscuro" | "claro" }) {
  const bg = tema === "oscuro" ? "bg-white/10" : "bg-slate-200 dark:bg-slate-700";
  const dot = tema === "oscuro" ? "bg-white/80" : "bg-slate-500 dark:bg-slate-300";
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs", bg)}>
      <span className={cn("h-1.5 w-1.5 animate-bounce rounded-full", dot)} />
      <span className={cn("h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:120ms]", dot)} />
      <span className={cn("h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:240ms]", dot)} />
    </div>
  );
}
