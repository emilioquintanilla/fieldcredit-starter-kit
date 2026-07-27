// ─────────────────────────────────────────────────────────────────────────────
// Panel Administrativo — gestión de usuarios, productos, parámetros y auditoría.
// Solo visible para rol admin.
// Ruta del archivo: src/routes/admin.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Save, X, Eye, EyeOff, Shield, Users, Package, Settings, ClipboardList, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/stores/app";
import {
  listarUsuarios, crearUsuario, actualizarUsuario, cambiarPasswordUsuario, eliminarUsuario,
  listarProductos, actualizarProducto, crearProducto, eliminarProducto,
  listarParametros, actualizarParametro,
  listarSucursalesAdmin, registrarBitacora,
  type UsuarioAdmin, type ProductoAdmin, type ParametroAdmin, type SucursalAdmin,
} from "@/services/adminService";
import { obtenerBitacora, type RegistroBitacora } from "@/services/institucional";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración — FieldCredit" },
      { name: "description", content: "Gestión de usuarios, productos, parámetros y auditoría." },
    ],
  }),
  component: PanelAdmin,
});

type Tab = "usuarios" | "productos" | "parametros" | "bitacora";

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "productos", label: "Productos", icon: Package },
  { id: "parametros", label: "Parámetros", icon: Settings },
  { id: "bitacora", label: "Bitácora", icon: ClipboardList },
];

const ROLES: Array<{ value: UsuarioAdmin["rol"]; label: string }> = [
  { value: "asesor", label: "Asesor" },
  { value: "coordinador", label: "Coordinador" },
  { value: "gerente", label: "Gerente" },
  { value: "admin", label: "Administrador" },
];

function PanelAdmin() {
  const usuario = useApp((s) => s.usuario);
  const [tab, setTab] = useState<Tab>("usuarios");

  if (usuario?.rol !== "admin") {
    return (
      <AppLayout>
        <PageHeader title="Acceso restringido" subtitle="Esta sección requiere rol de administrador." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Administración"
        subtitle="Gestión de usuarios, productos, parámetros y trazabilidad"
      />

      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-fieldcredit-green text-fieldcredit-green"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "usuarios" && <TabUsuarios adminUser={usuario} />}
        {tab === "productos" && <TabProductos adminUser={usuario} />}
        {tab === "parametros" && <TabParametros adminUser={usuario} />}
        {tab === "bitacora" && <TabBitacora />}
      </div>
    </AppLayout>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ═════════════════════════════════════════════════════════════════════════════
function TabUsuarios({ adminUser }: { adminUser: NonNullable<ReturnType<typeof useApp.getState>["usuario"]> }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [sucursales, setSucursales] = useState<SucursalAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [u, s] = await Promise.all([listarUsuarios(), listarSucursalesAdmin()]);
    setUsuarios(u);
    setSucursales(s);
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  // Formulario nuevo usuario
  const [form, setForm] = useState({
    nombre: "", usuario: "", password: "", rol: "asesor" as UsuarioAdmin["rol"], sucursal_id: 0,
  });

  const handleCrear = async () => {
    if (!form.nombre.trim() || !form.usuario.trim() || !form.password.trim()) {
      toast.error("Completa todos los campos.");
      return;
    }
    if (form.sucursal_id === 0 && sucursales.length > 0) {
      form.sucursal_id = sucursales[0].id;
    }
    const nuevo = await crearUsuario({
      nombre: form.nombre.trim(),
      usuario: form.usuario.trim(),
      password_hash: form.password,
      rol: form.rol,
      sucursal_id: form.sucursal_id,
    });
    if (nuevo) {
      toast.success(`Usuario "${nuevo.nombre}" creado.`);
      await registrarBitacora({
        usuario_id: adminUser.id, usuario_nombre: adminUser.nombre, usuario_rol: adminUser.rol,
        accion: "crear", entidad: "usuario", entidad_id: String(nuevo.id),
        descripcion: `Creó usuario ${nuevo.usuario} (${nuevo.rol})`,
      });
      setForm({ nombre: "", usuario: "", password: "", rol: "asesor", sucursal_id: 0 });
      setCreando(false);
      void cargar();
    } else {
      toast.error("Error al crear usuario. Verifica que el nombre de usuario no esté duplicado.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {usuarios.length} usuarios registrados
        </p>
        <button
          onClick={() => setCreando(!creando)}
          className="flex items-center gap-1.5 rounded-lg bg-fieldcredit-green px-3 py-2 text-sm font-medium text-white hover:bg-fieldcredit-green-dark"
        >
          <Plus size={16} />
          Nuevo usuario
        </button>
      </div>

      {/* Formulario de creación */}
      {creando && (
        <div className="rounded-xl border border-fieldcredit-green-light bg-fieldcredit-green-pale p-4 dark:border-slate-600 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Nuevo usuario</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input placeholder="Nombre completo" value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            <input placeholder="Usuario (login)" value={form.usuario}
              onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            <input placeholder="Contraseña" type="password" value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            <select value={form.rol}
              onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as UsuarioAdmin["rol"] }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={form.sucursal_id}
              onChange={(e) => setForm((f) => ({ ...f, sucursal_id: Number(e.target.value) }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <option value={0}>Seleccionar sucursal</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleCrear}
                className="flex items-center gap-1 rounded-md bg-fieldcredit-green px-4 py-2 text-sm font-medium text-white hover:bg-fieldcredit-green-dark">
                <Save size={14} /> Guardar
              </button>
              <button onClick={() => setCreando(false)}
                className="flex items-center gap-1 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      {cargando ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 hidden sm:table-cell">Sucursal</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {usuarios.map((u) => (
                <FilaUsuario key={u.id} u={u} sucursales={sucursales}
                  editando={editandoId === u.id}
                  onEditar={() => setEditandoId(u.id)}
                  onCancelar={() => setEditandoId(null)}
                  onGuardado={() => { setEditandoId(null); void cargar(); }}
                  adminUser={adminUser} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaUsuario({
  u, sucursales, editando, onEditar, onCancelar, onGuardado, adminUser,
}: {
  u: UsuarioAdmin; sucursales: SucursalAdmin[];
  editando: boolean; onEditar: () => void; onCancelar: () => void; onGuardado: () => void;
  adminUser: NonNullable<ReturnType<typeof useApp.getState>["usuario"]>;
}) {
  const [edit, setEdit] = useState({ nombre: u.nombre, rol: u.rol, sucursal_id: u.sucursal_id });
  const [newPass, setNewPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const guardar = async () => {
    const ok = await actualizarUsuario(u.id, edit);
    if (ok) {
      toast.success(`Usuario "${edit.nombre}" actualizado.`);
      await registrarBitacora({
        usuario_id: adminUser.id, usuario_nombre: adminUser.nombre, usuario_rol: adminUser.rol,
        accion: "actualizar", entidad: "usuario", entidad_id: String(u.id),
        descripcion: `Editó usuario ${u.usuario}: rol=${edit.rol}, sucursal=${edit.sucursal_id}`,
      });
      if (newPass.trim()) {
        await cambiarPasswordUsuario(u.id, newPass.trim());
        toast.success("Contraseña actualizada.");
      }
      onGuardado();
    } else {
      toast.error("Error al guardar.");
    }
  };

  const toggleActivo = async () => {
    const ok = await actualizarUsuario(u.id, { activo: !u.activo });
    if (ok) {
      toast.success(`Usuario ${u.activo ? "desactivado" : "activado"}.`);
      await registrarBitacora({
        usuario_id: adminUser.id, usuario_nombre: adminUser.nombre, usuario_rol: adminUser.rol,
        accion: u.activo ? "desactivar" : "activar", entidad: "usuario", entidad_id: String(u.id),
        descripcion: `${u.activo ? "Desactivó" : "Activó"} usuario ${u.usuario}`,
      });
      onGuardado();
    }
  };

  const handleEliminar = async () => {
    const res = await eliminarUsuario(u.id);
    if (res.ok) {
      toast.success(`Usuario "${u.nombre}" eliminado.`);
      await registrarBitacora({
        usuario_id: adminUser.id, usuario_nombre: adminUser.nombre, usuario_rol: adminUser.rol,
        accion: "eliminar", entidad: "usuario", entidad_id: String(u.id),
        descripcion: `Eliminó usuario ${u.usuario} (${u.rol})`,
      });
      onGuardado();
    } else {
      toast.error(res.mensaje ?? "Error al eliminar.");
    }
    setConfirmDelete(false);
  };

  if (editando) {
    return (
      <tr className="bg-fieldcredit-green-pale/50 dark:bg-slate-700/30">
        <td className="px-4 py-2">
          <input value={edit.nombre} onChange={(e) => setEdit((p) => ({ ...p, nombre: e.target.value }))}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
        </td>
        <td className="px-4 py-2 text-slate-500">{u.usuario}</td>
        <td className="px-4 py-2">
          <select value={edit.rol} onChange={(e) => setEdit((p) => ({ ...p, rol: e.target.value as UsuarioAdmin["rol"] }))}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </td>
        <td className="hidden px-4 py-2 sm:table-cell">
          <select value={edit.sucursal_id} onChange={(e) => setEdit((p) => ({ ...p, sucursal_id: Number(e.target.value) }))}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-1">
            <input type={showPass ? "text" : "password"} placeholder="Nueva contraseña"
              value={newPass} onChange={(e) => setNewPass(e.target.value)}
              className="w-28 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            <button onClick={() => setShowPass(!showPass)} className="text-slate-400">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </td>
        <td className="px-4 py-2 text-right">
          <div className="flex justify-end gap-1">
            <button onClick={guardar}
              className="rounded bg-fieldcredit-green p-1.5 text-white hover:bg-fieldcredit-green-dark">
              <Save size={14} />
            </button>
            <button onClick={onCancelar}
              className="rounded border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">
              <X size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className={!u.activo ? "opacity-50" : ""}>
        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.nombre}</td>
        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.usuario}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            u.rol === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            : u.rol === "gerente" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : u.rol === "coordinador" ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}>
            <Shield size={10} />
            {ROLES.find((r) => r.value === u.rol)?.label ?? u.rol}
          </span>
        </td>
        <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-300 sm:table-cell">
          {u.sucursales?.nombre ?? "—"}
        </td>
        <td className="px-4 py-3 text-center">
          <button onClick={toggleActivo}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              u.activo
                ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
            }`}>
            {u.activo ? "Activo" : "Inactivo"}
          </button>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-1">
            <button onClick={onEditar}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200">
              <Pencil size={14} />
            </button>
            <button onClick={() => setConfirmDelete(true)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {confirmDelete && (
        <tr>
          <td colSpan={6} className="border-t border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/10">
            <div className="flex items-center gap-3">
              <p className="flex-1 text-xs text-red-700 dark:text-red-300">
                ¿Eliminar a <strong>{u.nombre}</strong> ({u.usuario})? Esta acción no se puede deshacer.
                Si tiene expedientes asociados, se recomienda desactivar en lugar de eliminar.
              </p>
              <button onClick={handleEliminar}
                className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                Sí, eliminar
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300">
                Cancelar
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PRODUCTOS
// ═════════════════════════════════════════════════════════════════════════════
function TabProductos({ adminUser }: { adminUser: NonNullable<ReturnType<typeof useApp.getState>["usuario"]> }) {
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const data = await listarProductos();
    setProductos(data);
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const fmtC$ = (n: number | null) => n == null ? "—" : `C$ ${Math.round(n).toLocaleString("es-NI")}`;

  // Estado del formulario de nuevo producto
  const [nuevoP, setNuevoP] = useState({
    codigo: "", nombre: "", descripcion: "", es_verde: false,
    linea_verde: "" as string, tasa_anual: 28, monto_min: 5000, monto_max: 300000,
    plazo_min_meses: 6, plazo_max_meses: 36, requiere_fiador_desde: 50000,
  });

  const handleCrearProducto = async () => {
    if (!nuevoP.codigo.trim() || !nuevoP.nombre.trim()) {
      toast.error("El código y nombre del producto son obligatorios.");
      return;
    }
    const resultado = await crearProducto({
      ...nuevoP,
      codigo: nuevoP.codigo.trim(),
      nombre: nuevoP.nombre.trim(),
      descripcion: nuevoP.descripcion.trim() || undefined,
      linea_verde: nuevoP.es_verde && nuevoP.linea_verde ? nuevoP.linea_verde : null,
    });
    if (resultado) {
      toast.success(`Producto "${resultado.nombre}" creado.`);
      await registrarBitacora({
        usuario_id: adminUser.id, usuario_nombre: adminUser.nombre, usuario_rol: adminUser.rol,
        accion: "crear", entidad: "producto", entidad_id: String(resultado.id),
        descripcion: `Creó producto ${resultado.codigo} — ${resultado.nombre}`,
      });
      setNuevoP({ codigo: "", nombre: "", descripcion: "", es_verde: false, linea_verde: "",
        tasa_anual: 28, monto_min: 5000, monto_max: 300000, plazo_min_meses: 6, plazo_max_meses: 36,
        requiere_fiador_desde: 50000 });
      setCreando(false);
      void cargar();
    } else {
      toast.error("Error al crear producto. Verifica que el código no esté duplicado.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {productos.length} productos configurados · Los cambios aplican a nuevas operaciones
        </p>
        <button onClick={() => setCreando(!creando)}
          className="flex items-center gap-1.5 rounded-lg bg-fieldcredit-green px-3 py-2 text-sm font-medium text-white hover:bg-fieldcredit-green-dark">
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* Formulario de creación de producto */}
      {creando && (
        <div className="rounded-xl border border-fieldcredit-green-light bg-fieldcredit-green-pale p-4 dark:border-slate-600 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Nuevo producto crediticio</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input placeholder="Código (ej: AR-NUEVO)" value={nuevoP.codigo}
              onChange={(e) => setNuevoP((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-mono dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            <input placeholder="Nombre del producto" value={nuevoP.nombre}
              onChange={(e) => setNuevoP((p) => ({ ...p, nombre: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            <input placeholder="Descripción (opcional)" value={nuevoP.descripcion}
              onChange={(e) => setNuevoP((p) => ({ ...p, descripcion: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={nuevoP.es_verde}
                  onChange={(e) => setNuevoP((p) => ({ ...p, es_verde: e.target.checked, linea_verde: e.target.checked ? p.linea_verde : "" }))}
                  className="rounded" />
                🌿 Producto verde
              </label>
            </div>

            {nuevoP.es_verde && (
              <select value={nuevoP.linea_verde}
                onChange={(e) => setNuevoP((p) => ({ ...p, linea_verde: e.target.value }))}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <option value="">Seleccionar línea verde</option>
                <option value="agua">Agua</option>
                <option value="produccion_protegida">Producción protegida</option>
                <option value="fincas_resilientes">Fincas resilientes</option>
                <option value="energia_solar">Energía solar</option>
              </select>
            )}

            <div>
              <label className="text-[10px] text-slate-500">Tasa anual %</label>
              <input type="number" step="0.5" value={nuevoP.tasa_anual}
                onChange={(e) => setNuevoP((p) => ({ ...p, tasa_anual: Number(e.target.value) }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Monto mínimo C$</label>
              <input type="number" step="1000" value={nuevoP.monto_min}
                onChange={(e) => setNuevoP((p) => ({ ...p, monto_min: Number(e.target.value) }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Monto máximo C$</label>
              <input type="number" step="1000" value={nuevoP.monto_max}
                onChange={(e) => setNuevoP((p) => ({ ...p, monto_max: Number(e.target.value) }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Plazo mínimo (meses)</label>
              <input type="number" value={nuevoP.plazo_min_meses}
                onChange={(e) => setNuevoP((p) => ({ ...p, plazo_min_meses: Number(e.target.value) }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Plazo máximo (meses)</label>
              <input type="number" value={nuevoP.plazo_max_meses}
                onChange={(e) => setNuevoP((p) => ({ ...p, plazo_max_meses: Number(e.target.value) }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Fiador obligatorio desde C$</label>
              <input type="number" step="5000" value={nuevoP.requiere_fiador_desde}
                onChange={(e) => setNuevoP((p) => ({ ...p, requiere_fiador_desde: Number(e.target.value) }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleCrearProducto}
              className="flex items-center gap-1 rounded-md bg-fieldcredit-green px-4 py-2 text-sm font-medium text-white hover:bg-fieldcredit-green-dark">
              <Save size={14} /> Crear producto
            </button>
            <button onClick={() => setCreando(false)}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {productos.map((p) => (
            <TarjetaProducto key={p.id} p={p} fmtC$={fmtC$}
              editando={editandoId === p.id}
              onEditar={() => setEditandoId(p.id)}
              onCancelar={() => setEditandoId(null)}
              onGuardado={() => { setEditandoId(null); void cargar(); }}
              adminUser={adminUser} />
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaProducto({
  p, fmtC$, editando, onEditar, onCancelar, onGuardado, adminUser,
}: {
  p: ProductoAdmin; fmtC$: (n: number | null) => string;
  editando: boolean; onEditar: () => void; onCancelar: () => void; onGuardado: () => void;
  adminUser: NonNullable<ReturnType<typeof useApp.getState>["usuario"]>;
}) {
  const [edit, setEdit] = useState({
    tasa_anual: p.tasa_anual ?? 0,
    monto_min: p.monto_min ?? 0,
    monto_max: p.monto_max ?? 0,
    activo: p.activo,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const guardar = async () => {
    const ok = await actualizarProducto(p.id, edit);
    if (ok) {
      toast.success(`Producto "${p.nombre}" actualizado.`);
      await registrarBitacora({
        usuario_id: adminUser.id, usuario_nombre: adminUser.nombre, usuario_rol: adminUser.rol,
        accion: "actualizar", entidad: "producto", entidad_id: String(p.id),
        descripcion: `Editó ${p.codigo}: tasa=${edit.tasa_anual}%, rango=${edit.monto_min}-${edit.monto_max}`,
      });
      onGuardado();
    }
  };

  const handleEliminar = async () => {
    const res = await eliminarProducto(p.id);
    if (res.ok) {
      toast.success(`Producto "${p.nombre}" eliminado.`);
      await registrarBitacora({
        usuario_id: adminUser.id, usuario_nombre: adminUser.nombre, usuario_rol: adminUser.rol,
        accion: "eliminar", entidad: "producto", entidad_id: String(p.id),
        descripcion: `Eliminó producto ${p.codigo} — ${p.nombre}`,
      });
      onGuardado();
    } else {
      toast.error(res.mensaje ?? "Error al eliminar.");
    }
    setConfirmDelete(false);
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-colors ${
      p.es_verde
        ? "border-fieldcredit-green-light bg-white dark:border-slate-600 dark:bg-slate-800"
        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
    } ${!p.activo ? "opacity-50" : ""}`}>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {p.es_verde && <span className="text-sm">🌿</span>}
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.nombre}</h4>
          </div>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{p.codigo}</p>
        </div>
        {!editando && (
          <div className="flex gap-1">
            <button onClick={onEditar}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700">
              <Pencil size={14} />
            </button>
            <button onClick={() => setConfirmDelete(true)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {p.descripcion && (
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{p.descripcion}</p>
      )}

      {confirmDelete && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/10">
          <p className="mb-2 text-xs text-red-700 dark:text-red-300">
            ¿Eliminar <strong>{p.nombre}</strong>? Si tiene créditos asociados, no se podrá eliminar — desactívalo en su lugar.
          </p>
          <div className="flex gap-2">
            <button onClick={handleEliminar}
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700">
              Sí, eliminar
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editando ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-500">Tasa anual %</label>
              <input type="number" step="0.5" value={edit.tasa_anual}
                onChange={(e) => setEdit((p) => ({ ...p, tasa_anual: Number(e.target.value) }))}
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Monto mín</label>
              <input type="number" step="1000" value={edit.monto_min}
                onChange={(e) => setEdit((p) => ({ ...p, monto_min: Number(e.target.value) }))}
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Monto máx</label>
              <input type="number" step="1000" value={edit.monto_max}
                onChange={(e) => setEdit((p) => ({ ...p, monto_max: Number(e.target.value) }))}
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={edit.activo}
                onChange={(e) => setEdit((p) => ({ ...p, activo: e.target.checked }))}
                className="rounded" />
              Producto activo
            </label>
            <div className="flex gap-1">
              <button onClick={guardar}
                className="flex items-center gap-1 rounded bg-fieldcredit-green px-3 py-1 text-xs font-medium text-white hover:bg-fieldcredit-green-dark">
                <Save size={12} /> Guardar
              </button>
              <button onClick={onCancelar}
                className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-slate-400">Tasa</p>
            <p className="font-bold text-slate-700 dark:text-slate-200">{p.tasa_anual ?? "—"}%</p>
          </div>
          <div>
            <p className="text-slate-400">Rango</p>
            <p className="font-medium text-slate-600 dark:text-slate-300">{fmtC$(p.monto_min)} — {fmtC$(p.monto_max)}</p>
          </div>
          <div>
            <p className="text-slate-400">Plazo</p>
            <p className="font-medium text-slate-600 dark:text-slate-300">{p.plazo_min_meses ?? "—"} — {p.plazo_max_meses ?? "—"} meses</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PARÁMETROS
// ═════════════════════════════════════════════════════════════════════════════
function TabParametros({ adminUser }: { adminUser: NonNullable<ReturnType<typeof useApp.getState>["usuario"]> }) {
  const [params, setParams] = useState<ParametroAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editValor, setEditValor] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const data = await listarParametros();
    setParams(data);
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const porCategoria = params.reduce<Record<string, ParametroAdmin[]>>((acc, p) => {
    const c = p.categoria ?? "general";
    (acc[c] ||= []).push(p);
    return acc;
  }, {});

  const guardar = async (p: ParametroAdmin) => {
    const ok = await actualizarParametro(p.id, editValor, adminUser.id);
    if (ok) {
      toast.success(`Parámetro "${p.clave}" actualizado.`);
      await registrarBitacora({
        usuario_id: adminUser.id, usuario_nombre: adminUser.nombre, usuario_rol: adminUser.rol,
        accion: "actualizar", entidad: "parametro", entidad_id: String(p.id),
        descripcion: `Editó ${p.clave}`,
        valor_anterior: p.valor,
        valor_nuevo: editValor,
      });
      setEditandoId(null);
      void cargar();
    }
  };

  if (cargando) return <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Configuración maestra del sistema. Los cambios quedan registrados en la bitácora de auditoría.
      </p>

      {Object.entries(porCategoria).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fieldcredit-teal">
            {cat.replace(/_/g, " ")}
          </h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            {items.map((p, i) => (
              <div key={p.id}
                className={`flex flex-wrap items-start gap-3 px-4 py-3 ${i > 0 ? "border-t border-slate-100 dark:border-slate-700" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-medium text-slate-700 dark:text-slate-200">{p.clave}</p>
                  {p.descripcion && <p className="mt-0.5 text-xs text-slate-400">{p.descripcion}</p>}
                </div>
                {editandoId === p.id ? (
                  <div className="flex items-center gap-2">
                    <input value={editValor}
                      onChange={(e) => setEditValor(e.target.value)}
                      className="w-48 rounded border border-slate-300 px-2 py-1 font-mono text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                    <button onClick={() => guardar(p)}
                      className="rounded bg-fieldcredit-green p-1 text-white hover:bg-fieldcredit-green-dark">
                      <Save size={14} />
                    </button>
                    <button onClick={() => setEditandoId(null)}
                      className="rounded border border-slate-300 p-1 text-slate-400 dark:border-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="max-w-xs truncate rounded bg-fieldcredit-green-pale px-2 py-1 text-xs font-semibold text-fieldcredit-green-dark dark:bg-slate-700 dark:text-fieldcredit-green">
                      {typeof p.valor === "object" ? JSON.stringify(p.valor) : String(p.valor)}
                    </code>
                    {p.editable && (
                      <button onClick={() => { setEditandoId(p.id); setEditValor(typeof p.valor === "object" ? JSON.stringify(p.valor) : String(p.valor)); }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700">
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BITÁCORA
// ═════════════════════════════════════════════════════════════════════════════
function TabBitacora() {
  const [registros, setRegistros] = useState<RegistroBitacora[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    void obtenerBitacora(50).then((data) => {
      setRegistros(data);
      setCargando(false);
    });
  }, []);

  if (cargando) return <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Registro inmutable de operaciones. Cada acción administrativa queda trazada.
      </p>

      {registros.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <ClipboardList size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">
            La bitácora se alimenta automáticamente. Intenta crear o editar un usuario y vuelve aquí.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Usuario</th>
                <th className="px-4 py-2.5">Acción</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Entidad</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {registros.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(r.created_at).toLocaleString("es-NI", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                    {r.usuario_nombre ?? "Sistema"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.accion === "crear" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : r.accion === "eliminar" || r.accion === "desactivar" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    }`}>
                      {r.accion}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2 text-slate-500 sm:table-cell">
                    {r.entidad}{r.entidad_id ? ` #${r.entidad_id}` : ""}
                  </td>
                  <td className="hidden px-4 py-2 text-slate-500 md:table-cell">
                    {r.descripcion ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
