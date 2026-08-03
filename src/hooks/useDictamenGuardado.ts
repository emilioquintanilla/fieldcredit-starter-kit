// src/hooks/useDictamenGuardado.ts

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DictamenIA } from "@/stores/expedientes";

interface DictamenGuardado {
  id: string;
  numero_dictamen: string;
  contenido_json: DictamenIA;
  estado: "borrador" | "revisado" | "enviado_comite";
  editado_por_asesor: boolean;
  created_at: string;
}

interface UseDictamenGuardadoResult {
  dictamen: DictamenIA | null;
  meta: Omit<DictamenGuardado, "contenido_json"> | null;
  cargando: boolean;
  error: string | null;
}

export function useDictamenGuardado(
  solicitudId: number | undefined    // INTEGER — coincide con solicitudes.id
): UseDictamenGuardadoResult {
  const [dictamen, setDictamen] = useState<DictamenIA | null>(null);
  const [meta, setMeta] = useState<Omit<DictamenGuardado, "contenido_json"> | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (solicitudId === undefined || solicitudId === null) return;

    let cancelado = false;
    setCargando(true);
    setError(null);

    supabase
      .from("dictamenes")
      .select("id, numero_dictamen, contenido_json, estado, editado_por_asesor, created_at")
      .eq("solicitud_id", solicitudId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error: dbErr }) => {
        if (cancelado) return;

        if (dbErr) {
          // PGRST116 = no rows found — no es un error real
          if (dbErr.code !== "PGRST116") {
            setError("No se pudo cargar el dictamen guardado.");
            console.error("[useDictamenGuardado]", dbErr);
          }
          setCargando(false);
          return;
        }

        const row = data as DictamenGuardado;
        setDictamen(row.contenido_json);
        setMeta({
          id: row.id,
          numero_dictamen: row.numero_dictamen,
          estado: row.estado,
          editado_por_asesor: row.editado_por_asesor,
          created_at: row.created_at,
        });
        setCargando(false);
      });

    return () => { cancelado = true; };
  }, [solicitudId]);

  return { dictamen, meta, cargando, error };
}
