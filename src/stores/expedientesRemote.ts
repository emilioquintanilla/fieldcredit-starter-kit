// Store remoto (Supabase) para expedientes. Convive con el store local
// `useExpedientes` durante la migración por fases. Fase 1 usa este store para
// listar / crear / archivar / eliminar. Los módulos internos (flujo, EDR, SF,
// docs, geo, comité) seguirán en el store local hasta las fases 2 y 3.
import { create } from "zustand";
import * as svc from "@/services/expedientesService";
import type { ExpedienteDB } from "@/services/expedientesService";

interface Filtros {
  sucursalId?: number;
  asesorId?: number;
  estado?: string;
}

interface State {
  expedientes: ExpedienteDB[];
  cargando: boolean;
  error: string | null;
  guardandoId: number | null;
  ultimoGuardado: number | null; // timestamp para el badge "Guardado"
  guardandoSolicitud: boolean; // autoguardado / guardado manual en curso
  errorGuardado: string | null; // último error de guardado del formulario

  cargar: (filtros?: Filtros) => Promise<void>;
  crear: (datos: { asesorId: number; sucursalId: number; cliente?: string }) => Promise<ExpedienteDB | null>;
  archivar: (id: number) => Promise<void>;
  eliminar: (id: number) => Promise<void>;
  cambiarEstado: (id: number, estado: ExpedienteDB["estado"]) => Promise<void>;
  limpiarError: () => void;
}

export const useExpedientesRemote = create<State>((set) => ({
  expedientes: [],
  cargando: false,
  error: null,
  guardandoId: null,
  ultimoGuardado: null,
  guardandoSolicitud: false,
  errorGuardado: null,

  cargar: async (filtros) => {
    set({ cargando: true, error: null });
    try {
      const data = await svc.obtenerExpedientes(filtros);
      set({ expedientes: data, cargando: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar expedientes";
      set({ error: msg, cargando: false });
    }
  },

  crear: async (datos) => {
    set({ guardandoId: -1, error: null });
    try {
      const nuevo = await svc.crearExpediente(datos);
      set((s) => ({
        expedientes: [nuevo, ...s.expedientes],
        guardandoId: null,
        ultimoGuardado: Date.now(),
      }));
      return nuevo;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al crear expediente";
      set({ error: msg, guardandoId: null });
      return null;
    }
  },

  archivar: async (id) => {
    set({ guardandoId: id, error: null });
    try {
      await svc.archivarExpediente(id);
      set((s) => ({
        expedientes: s.expedientes.filter((e) => e.id !== id),
        guardandoId: null,
        ultimoGuardado: Date.now(),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al archivar";
      set({ error: msg, guardandoId: null });
    }
  },

  eliminar: async (id) => {
    set({ guardandoId: id, error: null });
    try {
      await svc.eliminarExpedienteDefinitivo(id);
      set((s) => ({
        expedientes: s.expedientes.filter((e) => e.id !== id),
        guardandoId: null,
        ultimoGuardado: Date.now(),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al eliminar";
      set({ error: msg, guardandoId: null });
    }
  },

  cambiarEstado: async (id, estado) => {
    set({ guardandoId: id, error: null });
    try {
      await svc.actualizarEstadoExpediente(id, estado);
      set((s) => ({
        expedientes: s.expedientes.map((e) => (e.id === id ? { ...e, estado } : e)),
        guardandoId: null,
        ultimoGuardado: Date.now(),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cambiar estado";
      set({ error: msg, guardandoId: null });
    }
  },

  limpiarError: () => set({ error: null }),
}));
