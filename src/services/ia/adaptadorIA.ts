// Adaptador multi-proveedor de IA. Cambia el proveedor sin tocar componentes.
export const PROVEEDORES_IA = {
  GROQ: "groq",
  CLAUDE: "claude",
  OPENAI: "openai",
} as const;

export type ProveedorIA = (typeof PROVEEDORES_IA)[keyof typeof PROVEEDORES_IA];

export const PROVEEDOR_ACTIVO: ProveedorIA =
  ((import.meta.env.VITE_IA_PROVEEDOR as ProveedorIA | undefined) || PROVEEDORES_IA.GROQ);

export const MODELOS: Record<ProveedorIA, string> = {
  groq: "llama-3.3-70b-versatile",
  claude: "claude-3-5-sonnet-latest",
  openai: "gpt-4o-mini",
};

export type Mensaje = { role: "user" | "assistant"; content: string };

export interface LlamarIAParams {
  sistema: string;
  mensajes: Mensaje[];
  maxTokens?: number;
}

export async function llamarIA({ sistema, mensajes, maxTokens = 600 }: LlamarIAParams): Promise<string> {
  const proveedor = PROVEEDOR_ACTIVO;
  const res = await fetch("/api/ia/completar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proveedor,
      modelo: MODELOS[proveedor],
      sistema,
      mensajes,
      maxTokens,
    }),
  });
  const data = (await res.json()) as { exito: boolean; texto: string; error?: string };
  if (!data.exito) throw new Error(data.error || "Error de IA");
  return data.texto;
}

export function nombreProveedor(): string {
  return {
    groq: "Groq · Llama 3.3",
    claude: "Claude Sonnet",
    openai: "GPT-4o mini",
  }[PROVEEDOR_ACTIVO];
}
