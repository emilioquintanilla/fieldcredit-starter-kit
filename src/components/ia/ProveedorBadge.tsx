// Badge visual con el proveedor de IA activo.
import { PROVEEDOR_ACTIVO } from "@/services/ia/adaptadorIA";
import { cn } from "@/lib/utils";

const LABELS: Record<string, { label: string; color: string }> = {
  groq: { label: "Llama · Groq", color: "#f59e0b" },
  claude: { label: "Claude · Anthropic", color: "#5eb837" },
  openai: { label: "GPT · OpenAI", color: "#45ada2" },
};

export function ProveedorBadge({ dark = false }: { dark?: boolean }) {
  const cfg = LABELS[PROVEEDOR_ACTIVO] || LABELS.groq;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        dark ? "bg-white/20 text-white" : "text-white",
      )}
      style={dark ? undefined : { background: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
