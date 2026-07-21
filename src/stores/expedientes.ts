// Store de expedientes (borradores + solicitudes completadas + documentos adjuntos)
import { create } from "zustand";

// Documento adjunto (fotos de cédula y demás)
export interface Documento {
  tipo: string;
  nombre: string;
  base64: string; // data URL o base64
  mimeType: string;
  fechaCaptura: string;
}

// Datos completos de una solicitud (todas las secciones)
export interface SolicitudData {
  // S1
  tipo_solicitud?: string;
  sucursal?: string;
  asesor?: string;
  fecha_solicitud?: string;
  numero_solicitud?: string;
  // S2
  primer_apellido?: string;
  segundo_apellido?: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  cedula?: string;
  fecha_nacimiento?: string;
  sexo?: "M" | "F";
  estado_civil?: string;
  escolaridad?: string;
  telefono?: string;
  telefono_alt?: string;
  correo?: string;
  departamento_residencia?: string;
  municipio_residencia?: string;
  direccion_domiciliar?: string;
  direccion_registrada?: string;
  departamento_registrado?: string;
  tipo_vivienda?: string;
  dependientes?: number;
  // Rastreo de qué campos vienen del OCR y cuáles fueron editados
  auto_campos?: Record<string, "auto" | "editado">;
  // S3
  tipo_actividad?: string;
  descripcion_actividad?: string;
  nombre_negocio?: string;
  antiguedad_anios?: number;
  antiguedad_meses?: number;
  departamento_operacion?: string;
  municipio_operacion?: string;
  direccion_negocio?: string;
  local_propio?: "si" | "no";
  cultivos?: string;
  hectareas?: number;
  ciclo_productivo?: string;
  empleador?: string;
  cargo?: string;
  salario?: number;
  laborar_anios?: number;
  laborar_meses?: number;
  // S4
  producto?: string;
  monto?: number;
  plazo?: number;
  frecuencia_pago?: string;
  destino?: string;
  periodo_gracia?: boolean;
  meses_gracia?: number;
  tiene_deudas?: boolean;
  deudas?: Array<{ institucion: string; saldo: number; cuota: number }>;
  linea_agroresilia?: string;
  tecnologia_agroresilia?: string;
  cultivo_beneficiado?: string;
  // S5
  aplica_fiador?: boolean;
  relacion_fiador?: string;
  // S6
  aplica_garantia?: boolean;
  tipos_garantia?: string[];
  // S7
  firma_digital?: string;
}

export interface ExpedienteBorrador {
  id: string;
  estado: "borrador" | "completada";
  data: SolicitudData;
  documentos: Documento[];
  created_at: string;
  updated_at: string;
}

interface State {
  expedientes: Record<string, ExpedienteBorrador>;
  crearExpediente: (id?: string) => string;
  actualizarBorrador: (id: string, patch: Partial<SolicitudData>) => void;
  completarSolicitud: (id: string) => void;
  adjuntarDocumento: (id: string, doc: Documento) => void;
  getExpediente: (id: string) => ExpedienteBorrador | undefined;
}

const genId = () =>
  `SOL-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

export const useExpedientes = create<State>((set, get) => ({
  expedientes: {},

  crearExpediente: (id) => {
    const nuevoId = id ?? genId();
    const ahora = new Date().toISOString();
    set((s) => ({
      expedientes: {
        ...s.expedientes,
        [nuevoId]: {
          id: nuevoId,
          estado: "borrador",
          data: {
            numero_solicitud: nuevoId,
            fecha_solicitud: new Date().toLocaleDateString("es-NI"),
            tipo_solicitud: "Crédito nuevo",
            auto_campos: {},
            deudas: [],
            tipos_garantia: [],
          },
          documentos: [],
          created_at: ahora,
          updated_at: ahora,
        },
      },
    }));
    return nuevoId;
  },

  actualizarBorrador: (id, patch) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            data: { ...exp.data, ...patch },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  completarSolicitud: (id) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, estado: "completada", updated_at: new Date().toISOString() },
        },
      };
    }),

  adjuntarDocumento: (id, doc) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      // Reemplaza si ya existe uno del mismo tipo
      const docs = exp.documentos.filter((d) => d.tipo !== doc.tipo).concat(doc);
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, documentos: docs, updated_at: new Date().toISOString() },
        },
      };
    }),

  getExpediente: (id) => get().expedientes[id],
}));
