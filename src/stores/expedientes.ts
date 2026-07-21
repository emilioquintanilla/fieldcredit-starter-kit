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

// ===== Módulo Fiador =====
export interface IngresoFiador {
  id: string;
  tipo: string;
  descripcion: string;
  monto: number;
}
export interface EgresoFiador {
  id: string;
  tipo: string;
  descripcion: string;
  monto: number;
}
export interface FiadorData {
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
  departamento?: string;
  municipio?: string;
  direccion?: string;
  tipo_vivienda?: string;
  dependientes?: number;
  relacion_deudor?: string;
  auto_campos?: Record<string, "auto" | "editado">;
  tipo_actividad?: string;
  descripcion_actividad?: string;
  nombre_negocio?: string;
  antiguedad_anios?: number;
  antiguedad_meses?: number;
  direccion_trabajo?: string;
  cargo?: string;
  salario?: number;
  laborar_anios?: number;
  laborar_meses?: number;
  ingresos: IngresoFiador[];
  egresos: EgresoFiador[];
}

// ===== Módulo Garantías =====
export interface BienPrendado {
  id: string;
  tipo_bien: string;
  descripcion: string;
  estado: string;
  valor_mercado: number;
  num_serie?: string;
  ubicacion?: string;
  tiene_gravamen?: boolean;
  gravamen_desc?: string;
  fotos: string[];
}
export interface InmuebleHipotecario {
  tipo_inmueble?: string;
  descripcion?: string;
  departamento?: string;
  municipio?: string;
  direccion?: string;
  gps_lat?: number;
  gps_lng?: number;
  area_valor?: number;
  area_unidad?: "mz" | "m2";
  area_construccion?: number;
  estado?: string;
  tiene_escritura?: boolean;
  inscrito_registro?: boolean;
  numero_registro?: string;
  propietario_registral?: string;
  tiene_gravamen?: boolean;
  gravamen_institucion?: string;
  gravamen_saldo?: number;
  valor_mercado?: number;
  tiene_avaluo?: boolean;
  avaluo_pdf?: string;
  fotos: string[];
}
export interface GarantiasData {
  bienes: BienPrendado[];
  inmueble?: InmuebleHipotecario;
}

export interface ExpedienteBorrador {
  id: string;
  estado: "borrador" | "completada";
  data: SolicitudData;
  documentos: Documento[];
  fiador?: FiadorData;
  garantias?: GarantiasData;
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
  actualizarFiador: (id: string, patch: Partial<FiadorData>) => void;
  agregarIngresoFiador: (id: string, ingreso: Omit<IngresoFiador, "id">) => void;
  eliminarIngresoFiador: (id: string, ingresoId: string) => void;
  agregarEgresoFiador: (id: string, egreso: Omit<EgresoFiador, "id">) => void;
  eliminarEgresoFiador: (id: string, egresoId: string) => void;
  agregarBienPrendado: (id: string, bien: Omit<BienPrendado, "id">) => void;
  actualizarBienPrendado: (id: string, bienId: string, patch: Partial<BienPrendado>) => void;
  eliminarBienPrendado: (id: string, bienId: string) => void;
  guardarInmuebleHipotecario: (id: string, patch: Partial<InmuebleHipotecario>) => void;
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
