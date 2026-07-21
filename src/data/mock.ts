// Datos mock locales para FieldCredit
export type Rol = "asesor" | "coordinador" | "gerente" | "admin";
export type EstadoExpediente =
  | "borrador"
  | "en_revision"
  | "en_comite"
  | "aprobado"
  | "rechazado"
  | "condicionado";

export interface Sucursal {
  id: number;
  codigo: string;
  nombre: string;
  region: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  usuario: string;
  password: string;
  rol: Rol;
  sucursal_id: number;
}

export interface Expediente {
  id: number;
  codigo: string;
  cliente: string;
  cedula: string;
  monto: number;
  plazo: number;
  estado: EstadoExpediente;
  asesor_id: number;
  sucursal_id: number;
  created_at: string;
  actividad: string;
}

export const sucursales: Sucursal[] = [
  { id: 1, codigo: "CMN", nombre: "Casa Matriz NIC", region: "Casa Matriz" },
  { id: 2, codigo: "RB", nombre: "Rubenia", region: "Regional Managua-Centro" },
  { id: 3, codigo: "CJ", nombre: "Ciudad Jardín", region: "Regional Managua-Centro" },
  { id: 4, codigo: "CS", nombre: "Ciudad Sandino", region: "Regional Managua-Centro" },
  { id: 5, codigo: "TP", nombre: "Tipitapa", region: "Regional Managua-Centro" },
  { id: 6, codigo: "TE", nombre: "Teustepe", region: "Regional Sur-Oriente" },
  { id: 7, codigo: "GR", nombre: "Granada", region: "Regional Sur-Oriente" },
  { id: 8, codigo: "RV", nombre: "Rivas", region: "Regional Sur-Oriente" },
  { id: 9, codigo: "MY", nombre: "Masaya", region: "Regional Sur-Oriente" },
  { id: 10, codigo: "JT", nombre: "Jinotepe", region: "Regional Sur-Oriente" },
  { id: 11, codigo: "JU", nombre: "Juigalpa", region: "Regional Sur-Oriente" },
  { id: 12, codigo: "CH", nombre: "Chinandega", region: "Regional Occidente" },
  { id: 13, codigo: "LE", nombre: "León", region: "Regional Occidente" },
  { id: 14, codigo: "NG", nombre: "Nagarote", region: "Regional Occidente" },
  { id: 15, codigo: "ML", nombre: "Malpaisillo", region: "Regional Occidente" },
  { id: 16, codigo: "ST", nombre: "Somoto", region: "Regional Norte" },
  { id: 17, codigo: "ES", nombre: "Estelí", region: "Regional Norte" },
  { id: 18, codigo: "MT", nombre: "Matagalpa", region: "Regional Norte" },
  { id: 19, codigo: "JI", nombre: "Jinotega", region: "Regional Norte" },
];

export const usuarios: Usuario[] = [
  { id: 1, nombre: "Juan Mendoza", usuario: "jmendoza", password: "1234", rol: "asesor", sucursal_id: 1 },
  { id: 2, nombre: "María López", usuario: "mlopez", password: "1234", rol: "asesor", sucursal_id: 2 },
  { id: 3, nombre: "Carlos Ruiz", usuario: "cruiz", password: "1234", rol: "coordinador", sucursal_id: 1 },
  { id: 4, nombre: "Ana Martínez", usuario: "amartinez", password: "1234", rol: "gerente", sucursal_id: 1 },
  { id: 5, nombre: "Admin Sistema", usuario: "admin", password: "admin", rol: "admin", sucursal_id: 1 },
];

export const expedientes: Expediente[] = [
  { id: 1, codigo: "SOL-2026-0821", cliente: "Carlos Alberto Ramos Flores", cedula: "001-120582-0023H", monto: 85000, plazo: 24, estado: "en_comite", asesor_id: 1, sucursal_id: 1, created_at: "2026-07-10", actividad: "Comerciante" },
  { id: 2, codigo: "SOL-2026-0819", cliente: "Rosa Elena Pérez Talavera", cedula: "001-150490-0041F", monto: 45000, plazo: 12, estado: "aprobado", asesor_id: 1, sucursal_id: 1, created_at: "2026-07-08", actividad: "Agricultora" },
  { id: 3, codigo: "SOL-2026-0815", cliente: "Ernesto José Gómez Blandón", cedula: "001-030175-0018H", monto: 120000, plazo: 36, estado: "borrador", asesor_id: 1, sucursal_id: 1, created_at: "2026-07-15", actividad: "Ganadero" },
  { id: 4, codigo: "SOL-2026-0810", cliente: "Lucía del Carmen Herrera Vega", cedula: "001-220688-0067F", monto: 35000, plazo: 18, estado: "rechazado", asesor_id: 1, sucursal_id: 1, created_at: "2026-07-05", actividad: "Comerciante" },
  { id: 5, codigo: "SOL-2026-0802", cliente: "Miguel Ángel Castillo López", cedula: "001-140395-0039H", monto: 60000, plazo: 24, estado: "en_revision", asesor_id: 2, sucursal_id: 2, created_at: "2026-07-01", actividad: "Agricultor" },
  { id: 6, codigo: "SOL-2026-0798", cliente: "Sandra Melissa Torres Úbeda", cedula: "001-080792-0055F", monto: 25000, plazo: 6, estado: "aprobado", asesor_id: 2, sucursal_id: 2, created_at: "2026-06-28", actividad: "Comerciante" },
  { id: 7, codigo: "SOL-2026-0790", cliente: "José Francisco Gutiérrez Mena", cedula: "001-200680-0011H", monto: 200000, plazo: 36, estado: "condicionado", asesor_id: 1, sucursal_id: 1, created_at: "2026-06-20", actividad: "AgroResilia" },
  { id: 8, codigo: "SOL-2026-0785", cliente: "Patricia Auxiliadora Ruiz Calero", cedula: "001-311285-0088F", monto: 15000, plazo: 3, estado: "aprobado", asesor_id: 2, sucursal_id: 2, created_at: "2026-06-15", actividad: "Asalariada" },
];
