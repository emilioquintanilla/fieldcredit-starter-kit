// src/components/BotonGenerarDictamen.tsx

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generarDictamen } from "@/services/ia/generarDictamen";
import type { DatosSolicitud, ItemFlujo, Garantia, Fiador } from "@/services/ia/generarDictamen";

interface Props {
  expedienteId: number;          // INTEGER — coincide con solicitudes.id
  usuarioId: string;             // UUID  — coincide con auth.uid()
  solicitud: DatosSolicitud;
  flujo?: ItemFlujo[];
  garantias?: Garantia[];
  fiadores?: Fiador[];
}

export function BotonGenerarDictamen({
  expedienteId,
  usuarioId,
  solicitud,
  flujo = [],
  garantias = [],
  fiadores = [],
}: Props) {
  const [generando, setGenerando] = useState(false);
  const navigate = useNavigate();

  async function handleGenerar() {
    setGenerando(true);
    try {
      const dictamen = await generarDictamen(solicitud, flujo, garantias, fiadores);

      const { data, error } = await supabase
        .from("dictamenes")
        .insert({
          solicitud_id: expedienteId,
          contenido_json: dictamen,
          estado: "borrador",
          generado_por: usuarioId,
          modelo_ia: "llama-3.3-70b-versatile",
          editado_por_asesor: false,
        })
        .select("id, numero_dictamen")
        .single();

      if (error) throw error;

      const numero = (data as { numero_dictamen: string }).numero_dictamen;
      toast.success(`Dictamen generado — ${numero}`);

      await navigate({ to: "/comite/$id", params: { id: String(expedienteId) } });
    } catch (err) {
      console.error("[BotonGenerarDictamen]", err);
      toast.error(
        err instanceof Error ? err.message : "Error al generar el dictamen. Intenta de nuevo."
      );
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      onClick={handleGenerar}
      disabled={generando}
      className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold
                 text-white shadow-sm transition-colors hover:bg-green-800
                 disabled:cursor-not-allowed disabled:opacity-60
                 focus:outline-none focus:ring-2 focus:ring-green-500"
    >
      {generando ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Generando dictamen…
        </>
      ) : (
        <>
          <Sparkles size={15} strokeWidth={1.8} />
          Generar dictamen IA
        </>
      )}
    </button>
  );
}
