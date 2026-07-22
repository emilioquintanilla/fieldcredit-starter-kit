// Sembrado de expedientes de prueba para probar el flujo del comité.
// Usa las acciones existentes del store (no toca su forma interna).
import { useExpedientes, type SolicitudData } from "@/stores/expedientes";

type Semilla = {
  data: Partial<SolicitudData>;
};

const SEMILLAS: Semilla[] = [
  {
    data: {
      primer_nombre: "María",
      segundo_nombre: "Elena",
      primer_apellido: "López",
      segundo_apellido: "Martínez",
      cedula: "001-150385-0012A",
      fecha_nacimiento: "1985-03-15",
      sexo: "F",
      estado_civil: "Casada",
      telefono: "8555-1234",
      departamento_residencia: "Managua",
      municipio_residencia: "Managua",
      direccion_domiciliar: "Barrio San Judas, casa #45",
      tipo_actividad: "Comercio",
      descripcion_actividad: "Pulpería y venta de abarrotes",
      nombre_negocio: "Pulpería La Bendición",
      antiguedad_anios: 6,
      producto: "Capital de trabajo",
      monto: 35000,
      plazo: 12,
      frecuencia_pago: "Mensual",
      destino: "Compra de inventario para temporada alta",
      aplica_fiador: true,
      relacion_fiador: "Esposo",
      aplica_garantia: false,
      dependientes: 3,
    },
  },
  {
    data: {
      primer_nombre: "Juan",
      segundo_nombre: "Carlos",
      primer_apellido: "Ramírez",
      segundo_apellido: "Sánchez",
      cedula: "441-220778-0004B",
      fecha_nacimiento: "1978-07-22",
      sexo: "M",
      estado_civil: "Casado",
      telefono: "8877-9988",
      departamento_residencia: "Matagalpa",
      municipio_residencia: "San Ramón",
      direccion_domiciliar: "Comarca El Naranjo, km 8",
      tipo_actividad: "Agricultura",
      descripcion_actividad: "Producción de café y granos básicos",
      nombre_negocio: "Finca El Naranjo",
      antiguedad_anios: 15,
      cultivos: "Café, maíz, frijol",
      hectareas: 4,
      ciclo_productivo: "Postrera",
      producto: "AgroResilia",
      monto: 80000,
      plazo: 18,
      frecuencia_pago: "Al vencimiento",
      destino: "Insumos y mano de obra para ciclo cafetalero 2026",
      linea_agroresilia: "Adaptación climática",
      tecnologia_agroresilia: "Sombra diversificada + cosecha de agua",
      cultivo_beneficiado: "Café",
      aplica_fiador: false,
      aplica_garantia: true,
      tipos_garantia: ["prendaria"],
      dependientes: 4,
    },
  },
  {
    data: {
      primer_nombre: "Rosa",
      segundo_nombre: "María",
      primer_apellido: "Hernández",
      segundo_apellido: "Torres",
      cedula: "281-091292-0007C",
      fecha_nacimiento: "1992-12-09",
      sexo: "F",
      estado_civil: "Soltera",
      telefono: "8123-4567",
      departamento_residencia: "Chontales",
      municipio_residencia: "Juigalpa",
      direccion_domiciliar: "Barrio Loma Verde",
      tipo_actividad: "Ganadería",
      descripcion_actividad: "Ganadería doble propósito",
      nombre_negocio: "Hato Los Torres",
      antiguedad_anios: 3,
      producto: "Inversión",
      monto: 120000,
      plazo: 24,
      frecuencia_pago: "Semestral",
      destino: "Compra de 4 vaquillas y mejoramiento de potrero",
      aplica_fiador: true,
      relacion_fiador: "Hermano",
      aplica_garantia: true,
      tipos_garantia: ["prendaria", "hipotecaria"],
      dependientes: 2,
    },
  },
];

/**
 * Crea N expedientes de prueba directamente en estado "en_comite".
 * Devuelve los IDs generados.
 */
export function sembrarExpedientesComite(): string[] {
  const { crearExpediente, actualizarBorrador, marcarEnComite } =
    useExpedientes.getState();
  const ids: string[] = [];
  for (const s of SEMILLAS) {
    const id = crearExpediente();
    actualizarBorrador(id, s.data);
    marcarEnComite(id);
    ids.push(id);
  }
  return ids;
}
