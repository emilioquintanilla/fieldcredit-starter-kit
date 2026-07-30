// Pantalla de login para asesores (autenticación contra Supabase)
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useApp } from "@/stores/app";
import logoUrl from "@/assets/micredito.svg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — FieldCredit" },
      { name: "description", content: "Acceso para asesores de crédito de MiCrédito Nicaragua." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [sucursalId, setSucursalId] = useState<number | "">("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useApp((s) => s.login);
  const hydrate = useApp((s) => s.hydrate);
  const cargarSucursales = useApp((s) => s.cargarSucursales);
  const sucursales = useApp((s) => s.sucursales);
  const navigate = useNavigate();

  useEffect(() => {
    void hydrate();
    void cargarSucursales();
  }, [hydrate, cargarSucursales]);

  useEffect(() => {
    if (sucursalId === "" && sucursales.length > 0) setSucursalId(sucursales[0].id);
  }, [sucursales, sucursalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !password) {
      setError("Ingresá tu usuario y contraseña.");
      return;
    }
    if (sucursalId === "") {
      setError("Seleccioná tu sucursal.");
      return;
    }
    setError(null);
    setLoading(true);
    const u = await login(usuario.trim(), password, Number(sucursalId));
    setLoading(false);
    if (u) {
      navigate({ to: "/dashboard" });
    } else {
      setError("Usuario o contraseña incorrectos. Verificá tus credenciales.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-fieldcredit-green-pale px-4 py-8 transition-colors dark:bg-slate-900">
      <div className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-6 shadow-lg animate-fade-in dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <div className="flex flex-col items-center pt-2">
          <img src={logoUrl} alt="MiCrédito" className="h-16" />
          <h1 className="mt-4 text-2xl font-bold text-fieldcredit-green">FieldCredit</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Plataforma de crédito en campo
          </p>
        </div>

        <hr className="my-6 border-slate-200 dark:border-slate-700" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Sucursal
            </label>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(Number(e.target.value))}
              disabled={sucursales.length === 0}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-fieldcredit-green focus:outline-none focus:ring-2 focus:ring-fieldcredit-green/30 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {sucursales.length === 0 && <option value="">Cargando sucursales…</option>}
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Usuario
            </label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ingresa tu usuario"
              autoComplete="username"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-fieldcredit-green focus:outline-none focus:ring-2 focus:ring-fieldcredit-green/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 focus:border-fieldcredit-green focus:outline-none focus:ring-2 focus:ring-fieldcredit-green/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700 dark:text-slate-400"
                aria-label="Mostrar contraseña"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-fieldcredit-red-light px-3 py-2 text-xs font-medium text-fieldcredit-red dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-fieldcredit-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-fieldcredit-green-dark disabled:opacity-70"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          MiCrédito Nicaragua · Sistema interno · v1.0
        </p>
      </div>
    </div>
  );
}
