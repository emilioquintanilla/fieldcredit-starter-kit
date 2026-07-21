// Barra fija del Copiloto IA — deshabilitada hasta completar el análisis financiero
import { Bot } from "lucide-react";

export function CopilotoBar() {
  return (
    <div
      title="Disponible al completar el análisis financiero del expediente"
      className="pointer-events-none sticky bottom-0 left-0 right-0 z-30 mt-6 flex items-center justify-between gap-3 rounded-t-xl bg-fieldcredit-green-dark px-4 py-3 text-white opacity-70 lg:pointer-events-auto lg:rounded-xl lg:opacity-100"
    >
      <div className="flex items-center gap-2">
        <Bot size={18} />
        <span className="text-sm font-semibold">Copiloto IA</span>
      </div>
      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium">
        Disponible al completar el análisis financiero
      </span>
    </div>
  );
}
