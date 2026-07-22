// Store de expedientes (borradores + solicitudes completadas + documentos adjuntos)
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

// ===== Módulo Flujo de Efectivo =====
export interface FlujoEfectivo {
  plazoMeses: number;
  mesInicio: string; // 'YYYY-MM'
  tipoActividad?: string;
  cuotaEstimada: number;
  rubrosActivos: Record<string, boolean>;
  valores: Record<string, number[]>; // arrays de longitud plazoMeses
  otroFijoDesc?: string;
  otroEstacionalDesc?: string;
}

// ===== Módulos Estado de Resultados y Situación Financiera =====
export interface ValorCuenta {
  valor: number;
  autoLlenado: boolean;
  editado: boolean;
}
export interface EstadoResultadosData {
  tipoActividad?: string;
  preLlenadoDesdeflujo?: boolean;
  valores: Record<string, ValorCuenta>;
  observacionesAsesor?: string;
}
export interface SituacionFinancieraData {
  tipoActividad?: string;
  fechaCorte?: string;
  valores: Record<string, ValorCuenta>;
  observacionesAsesor?: string;
}

export type ModuloEstado = "resultados" | "situacion";

// ===== Módulo Geolocalización =====
export type TipoUbicacion = "domicilioDeudor" | "negocioDeudor" | "domicilioFiador" | "negocioFiador";
export interface UbicacionGeo {
  lat: number;
  lng: number;
  precision: number;
  precisionBaja: boolean;
  direccionTextual?: string;
  direccionNominatim?: string | null;
  departamento?: string | null;
  municipio?: string | null;
  timestamp: string;
  capturadoPor?: string;
  metodo: "gps" | "manual";
}
export type GeolocalizacionData = Partial<Record<TipoUbicacion, UbicacionGeo | null>>;

// ===== Módulo Comité (dictamen IA + decisión humana) =====
export interface Bandera {
  tipo: "verde" | "amarillo" | "rojo";
  texto: string;
}
export interface RecomendacionIA {
  accion: "aprobar" | "aprobar_con_condicion" | "rechazar" | "revisar";
  texto: string;
  condiciones: string[];
}
export interface ScoreARS {
  score: number;
  nivel: "verde_preferencial" | "verde_estandar" | "amarillo" | "rojo";
  tasa: string;
  condiciones: string;
  variables: Array<{ nombre: string; puntaje: number }>;
}
export interface DictamenIA {
  score: number;
  semaforo: "verde" | "amarillo" | "rojo";
  resumen: string;
  banderas: Bandera[];
  metricas: {
    capacidadPago: number;
    coberturaFlujo: number;
    indiceEndeudamiento: number;
    coberturaGarantias: number;
  };
  scoreARS: ScoreARS | null;
  recomendacion: RecomendacionIA;
}
export interface DecisionComite {
  decision: "aprobado" | "condicionado" | "rechazado";
  observacion?: string;
  timestamp: string;
}
export interface ComiteData {
  dictamenIA?: DictamenIA | null;
  decision?: DecisionComite | null;
  generadoEn?: string | null;
}

export type EstadoExpediente =
  | "borrador"
  | "completada"
  | "en_comite"
  | "aprobado"
  | "condicionado"
  | "rechazado";

export interface ArchivoSoporte {
  id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  base64: string;
  fechaSubida: string;
}

export interface ExpedienteBorrador {
  id: string;
  estado: EstadoExpediente;
  data: SolicitudData;
  documentos: Documento[];
  documentosSoporte?: Record<string, ArchivoSoporte[]>;
  fiador?: FiadorData;
  garantias?: GarantiasData;
  flujo?: FlujoEfectivo;
  estadoResultados?: EstadoResultadosData;
  situacionFinanciera?: SituacionFinancieraData;
  geolocalizacion?: GeolocalizacionData;
  comite?: ComiteData;
  created_at: string;
  updated_at: string;
}


interface State {
  expedientes: Record<string, ExpedienteBorrador>;
  crearExpediente: (id?: string) => string;
  actualizarBorrador: (id: string, patch: Partial<SolicitudData>) => void;
  completarSolicitud: (id: string) => void;
  adjuntarDocumento: (id: string, doc: Documento) => void;
  guardarDocsSoporte: (id: string, docId: string, archivos: ArchivoSoporte[]) => void;
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
  inicializarFlujo: (id: string, opts: { plazoMeses: number; mesInicio: string; tipoActividad?: string; cuotaEstimada: number }) => void;
  toggleRubroFlujo: (id: string, rubro: string) => void;
  actualizarValorMesFlujo: (id: string, rubro: string, mesIndex: number, valor: number) => void;
  actualizarCuotaFlujo: (id: string, cuota: number) => void;
  actualizarDescRubroFlujo: (id: string, campo: "otroFijoDesc" | "otroEstacionalDesc", valor: string) => void;
  guardarValorEstado: (id: string, modulo: ModuloEstado, cuentaId: string, valor: number) => void;
  hidratarEstadoDesdeflujo: (id: string, modulo: ModuloEstado, tipoActividad: string | undefined, valores: Record<string, ValorCuenta>) => void;
  actualizarObservacionesEstado: (id: string, modulo: ModuloEstado, texto: string) => void;
  guardarUbicacion: (id: string, tipo: TipoUbicacion, datos: UbicacionGeo) => void;
  eliminarUbicacion: (id: string, tipo: TipoUbicacion) => void;
  actualizarDireccionTexto: (id: string, tipo: TipoUbicacion, texto: string) => void;
  marcarEnComite: (id: string) => void;
  guardarDictamenIA: (id: string, dictamen: DictamenIA) => void;
  registrarDecisionComite: (id: string, decision: DecisionComite) => void;
}


const genId = () =>
  `SOL-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

export const useExpedientes = create<State>()(persist((set, get) => ({
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

  guardarDocsSoporte: (id, docId, archivos) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const prev = exp.documentosSoporte ?? {};
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            documentosSoporte: { ...prev, [docId]: archivos },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  getExpediente: (id) => get().expedientes[id],

  // ===== Fiador =====
  actualizarFiador: (id, patch) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const prev: FiadorData = exp.fiador ?? { ingresos: [], egresos: [], auto_campos: {} };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            fiador: { ...prev, ...patch, auto_campos: { ...(prev.auto_campos || {}), ...(patch.auto_campos || {}) } },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  agregarIngresoFiador: (id, ingreso) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const prev: FiadorData = exp.fiador ?? { ingresos: [], egresos: [] };
      const nuevo: IngresoFiador = { id: crypto.randomUUID(), ...ingreso };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, fiador: { ...prev, ingresos: [...prev.ingresos, nuevo] }, updated_at: new Date().toISOString() },
        },
      };
    }),

  eliminarIngresoFiador: (id, ingresoId) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.fiador) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            fiador: { ...exp.fiador, ingresos: exp.fiador.ingresos.filter((x) => x.id !== ingresoId) },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  agregarEgresoFiador: (id, egreso) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const prev: FiadorData = exp.fiador ?? { ingresos: [], egresos: [] };
      const nuevo: EgresoFiador = { id: crypto.randomUUID(), ...egreso };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, fiador: { ...prev, egresos: [...prev.egresos, nuevo] }, updated_at: new Date().toISOString() },
        },
      };
    }),

  eliminarEgresoFiador: (id, egresoId) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.fiador) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            fiador: { ...exp.fiador, egresos: exp.fiador.egresos.filter((x) => x.id !== egresoId) },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  // ===== Garantías =====
  agregarBienPrendado: (id, bien) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const prev: GarantiasData = exp.garantias ?? { bienes: [] };
      const nuevo: BienPrendado = { id: crypto.randomUUID(), ...bien };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, garantias: { ...prev, bienes: [...prev.bienes, nuevo] }, updated_at: new Date().toISOString() },
        },
      };
    }),

  actualizarBienPrendado: (id, bienId, patch) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.garantias) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            garantias: {
              ...exp.garantias,
              bienes: exp.garantias.bienes.map((b) => (b.id === bienId ? { ...b, ...patch } : b)),
            },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  eliminarBienPrendado: (id, bienId) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.garantias) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            garantias: { ...exp.garantias, bienes: exp.garantias.bienes.filter((b) => b.id !== bienId) },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  guardarInmuebleHipotecario: (id, patch) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const prev: GarantiasData = exp.garantias ?? { bienes: [] };
      const inm: InmuebleHipotecario = { ...(prev.inmueble ?? { fotos: [] }), ...patch };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, garantias: { ...prev, inmueble: inm }, updated_at: new Date().toISOString() },
        },
      };
    }),

  // ===== Flujo de efectivo =====
  inicializarFlujo: (id, opts) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      // Si ya existe y el plazo coincide, no reinicializa (preserva valores)
      if (exp.flujo && exp.flujo.plazoMeses === opts.plazoMeses && exp.flujo.mesInicio === opts.mesInicio) {
        return s;
      }
      const flujo: FlujoEfectivo = {
        plazoMeses: opts.plazoMeses,
        mesInicio: opts.mesInicio,
        tipoActividad: opts.tipoActividad,
        cuotaEstimada: exp.flujo?.cuotaEstimada ?? opts.cuotaEstimada,
        rubrosActivos: exp.flujo?.rubrosActivos ?? {},
        valores: exp.flujo?.valores ?? {},
        otroFijoDesc: exp.flujo?.otroFijoDesc,
        otroEstacionalDesc: exp.flujo?.otroEstacionalDesc,
      };
      // Ajusta longitud de arrays si cambió el plazo
      const valores: Record<string, number[]> = {};
      Object.entries(flujo.valores).forEach(([k, arr]) => {
        const nuevo = Array.from({ length: opts.plazoMeses }, (_, i) => arr[i] ?? 0);
        valores[k] = nuevo;
      });
      flujo.valores = valores;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, flujo, updated_at: new Date().toISOString() },
        },
      };
    }),

  toggleRubroFlujo: (id, rubro) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.flujo) return s;
      const activo = !exp.flujo.rubrosActivos[rubro];
      const rubrosActivos = { ...exp.flujo.rubrosActivos, [rubro]: activo };
      const valores = { ...exp.flujo.valores };
      if (activo && !valores[rubro]) {
        valores[rubro] = Array.from({ length: exp.flujo.plazoMeses }, () => 0);
      }
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, flujo: { ...exp.flujo, rubrosActivos, valores }, updated_at: new Date().toISOString() },
        },
      };
    }),

  actualizarValorMesFlujo: (id, rubro, mesIndex, valor) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.flujo) return s;
      const arr = exp.flujo.valores[rubro] ?? Array.from({ length: exp.flujo.plazoMeses }, () => 0);
      const nuevoArr = [...arr];
      nuevoArr[mesIndex] = isFinite(valor) ? valor : 0;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            flujo: { ...exp.flujo, valores: { ...exp.flujo.valores, [rubro]: nuevoArr } },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  actualizarCuotaFlujo: (id, cuota) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.flujo) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, flujo: { ...exp.flujo, cuotaEstimada: cuota }, updated_at: new Date().toISOString() },
        },
      };
    }),

  actualizarDescRubroFlujo: (id, campo, valor) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.flujo) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, flujo: { ...exp.flujo, [campo]: valor }, updated_at: new Date().toISOString() },
        },
      };
    }),

  // ===== Estado de Resultados / Situación Financiera =====
  guardarValorEstado: (id, modulo, cuentaId, valor) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const key = modulo === "resultados" ? "estadoResultados" : "situacionFinanciera";
      const prev = (exp[key] as EstadoResultadosData | SituacionFinancieraData | undefined) ?? { valores: {} };
      const registro = prev.valores[cuentaId];
      const nuevo: ValorCuenta = {
        valor: isFinite(valor) ? valor : 0,
        autoLlenado: registro?.autoLlenado ?? false,
        editado: registro?.autoLlenado ? true : registro?.editado ?? false,
      };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            [key]: { ...prev, valores: { ...prev.valores, [cuentaId]: nuevo } },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  hidratarEstadoDesdeflujo: (id, modulo, tipoActividad, valores) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const key = modulo === "resultados" ? "estadoResultados" : "situacionFinanciera";
      const prev = (exp[key] as EstadoResultadosData | SituacionFinancieraData | undefined) ?? { valores: {} };
      // No sobreescribir valores editados por el asesor
      const merged: Record<string, ValorCuenta> = { ...prev.valores };
      Object.entries(valores).forEach(([k, v]) => {
        const existente = prev.valores[k];
        if (!existente || (existente.autoLlenado && !existente.editado)) {
          merged[k] = v;
        }
      });
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            [key]: { ...prev, tipoActividad, preLlenadoDesdeflujo: true, valores: merged },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  actualizarObservacionesEstado: (id, modulo, texto) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const key = modulo === "resultados" ? "estadoResultados" : "situacionFinanciera";
      const prev = (exp[key] as EstadoResultadosData | SituacionFinancieraData | undefined) ?? { valores: {} };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            [key]: { ...prev, observacionesAsesor: texto },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  // ===== Geolocalización =====
  guardarUbicacion: (id, tipo, datos) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const prev = exp.geolocalizacion ?? {};
      const anterior = prev[tipo];
      const merged: UbicacionGeo = {
        ...datos,
        // Preserva la dirección textual escrita por el asesor al recapturar
        direccionTextual: datos.direccionTextual ?? anterior?.direccionTextual,
      };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            geolocalizacion: { ...prev, [tipo]: merged },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  eliminarUbicacion: (id, tipo) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp || !exp.geolocalizacion) return s;
      const nuevo = { ...exp.geolocalizacion };
      nuevo[tipo] = null;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: { ...exp, geolocalizacion: nuevo, updated_at: new Date().toISOString() },
        },
      };
    }),

  actualizarDireccionTexto: (id, tipo, texto) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      const prev = exp.geolocalizacion ?? {};
      const anterior = prev[tipo];
      const base: UbicacionGeo =
        anterior ?? {
          lat: 0,
          lng: 0,
          precision: 0,
          precisionBaja: false,
          timestamp: new Date().toISOString(),
          metodo: "manual",
        };
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            geolocalizacion: { ...prev, [tipo]: { ...base, direccionTextual: texto } },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  // ===== Comité =====
  marcarEnComite: (id) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            estado: "en_comite",
            comite: { ...(exp.comite || {}) },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  guardarDictamenIA: (id, dictamen) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            comite: {
              ...(exp.comite || {}),
              dictamenIA: dictamen,
              generadoEn: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

  registrarDecisionComite: (id, decision) =>
    set((s) => {
      const exp = s.expedientes[id];
      if (!exp) return s;
      return {
        expedientes: {
          ...s.expedientes,
          [id]: {
            ...exp,
            estado: decision.decision,
            comite: { ...(exp.comite || {}), decision },
            updated_at: new Date().toISOString(),
          },
        },
      };
    }),

}), { name: "fieldcredit-expedientes", storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage))) }));

