// Cliente de Supabase para FieldCredit (proyecto externo del usuario).
// Requiere VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las env vars del proyecto.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  // Loggeamos en vez de lanzar para no romper el SSR/build; los servicios harán fallar
  // la primera llamada real con un mensaje claro.
  console.warn(
    "[FieldCredit] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. La sincronización con Supabase no funcionará.",
  );
}

export const supabase = createClient(supabaseUrl ?? "http://invalid.local", supabaseKey ?? "invalid", {
  auth: { persistSession: false, autoRefreshToken: false },
});
