/**
 * Cliente de Supabase con Supabase Auth activado.
 *
 * IMPORTANTE: las keys deben estar en variables de entorno, NO hardcodeadas.
 * En Lovable: Settings → Environment Variables → agregar:
 *   VITE_SUPABASE_URL       = https://bdxtdhkbmabwuluvvhdl.supabase.co
 *   VITE_SUPABASE_ANON_KEY  = <la anon key — rotar en Supabase Dashboard primero>
 *
 * Ruta: src/lib/supabase.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[FieldCredit] VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están definidas.\n" +
    "Configurá las variables de entorno en Lovable → Settings → Environment Variables."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,        // mantiene la sesión entre recargas
    autoRefreshToken: true,      // renueva el JWT automáticamente
    detectSessionInUrl: false,   // no usamos OAuth redirect
    storage: localStorage,       // sesión en localStorage
  },
});
