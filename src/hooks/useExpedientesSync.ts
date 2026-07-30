// Carga y mantiene sincronizada la lista de expedientes desde Supabase
// (fuente de verdad). Refresca al recuperar el foco, cada 30 s y en tiempo
// real cuando el proyecto tiene Realtime habilitado en `expedientes`.
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/stores/app";
import { useExpedientesRemote } from "@/stores/expedientesRemote";

const INTERVALO_MS = 30_000;

export function useExpedientesSync() {
  const usuario = useApp((s) => s.usuario);
  const cargar = useExpedientesRemote((s) => s.cargar);

  useEffect(() => {
    if (!usuario) return;
    const filtros =
      usuario.rol === "asesor"
        ? { asesorId: usuario.id }
        : usuario.rol === "admin"
          ? undefined
          : { sucursalId: usuario.sucursal_id };

    const refrescar = () => void cargar(filtros);
    refrescar();

    const intervalo = setInterval(refrescar, INTERVALO_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const canal = supabase
      .channel("expedientes-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expedientes" },
        () => refrescar(),
      )
      .subscribe();

    return () => {
      clearInterval(intervalo);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(canal);
    };
  }, [usuario, cargar]);
}
