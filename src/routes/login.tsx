// Pantalla de login para asesores (autenticación contra Supabase)
// Fase 3 UX: rounded-xl, colores semánticos, focus ring teal, animación shake en error
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

const inputClasses =
  "w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fieldcredit-teal/50 focus-visible:ring-offset-2 disabled:opacity-60";

function LoginPage() {
  const [sucursalId, setSucursalId] = useState<number | "">("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
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

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !password) {
      setError("Ingresá tu usuario y contraseña.");
      triggerShake();
      return;
    }
    if (sucursalId === "") {
      setError("Seleccioná tu sucursal.");
      triggerShake();
      return;
    }
    setError(null);
    setLoading(true);
    const { usuario: u, error: motivo } = await login(usuario.trim(), password, Number(sucursalId));
    setLoading(false);
    if (u) {
      navigate({ to: "/dashboard" });
    } else {
      setError(motivo ?? "Usuario o contraseña incorrectos. Verificá tus credenciales.");
      triggerShake();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-fieldcredit-green-pale px-4 py-8 transition-colors dark:bg-background">
      <div
        className="w-full max-w-[400px] rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8"
        style={{
          animation: shaking ? "shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)" : "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="flex flex-col items-center pt-2">
          <img src={logoUrl} alt="MiCrédito" className="h-16" />
          <h1 className="mt-4 text-2xl font-bold text-fieldcredit-green">FieldCredit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plataforma de crédito en campo
          </p>
        </div>

        <hr className="my-6 border-border" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Sucursal
            </label>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(Number(e.target.value))}
              disabled={sucursales.length === 0}
              className={inputClasses}
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
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Usuario
            </label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Usuario o correo electrónico"
              autoComplete="username"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`${inputClasses} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                aria-label="Mostrar contraseña"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-fieldcredit-red-light px-3 py-2.5 text-xs font-medium text-fieldcredit-red dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-fieldcredit-green px-4 py-3 text-sm font-semibold text-white shadow-md shadow-fieldcredit-green/25 transition-all duration-200 hover:bg-fieldcredit-green-dark hover:shadow-lg hover:shadow-fieldcredit-green/30 active:scale-[0.97] disabled:opacity-70 disabled:shadow-none"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          MiCrédito Nicaragua · Sistema interno · v1.0
        </p>
      </div>
    </div>
  );
}
