/**
 * Cliente Supabase — proyecto FieldCredit / MiCrédito Nicaragua.
 * URL y key hardcodeadas para evitar que variables de entorno de
 * plataformas externas (Lovable) sobreescriban la configuración.
 * Ruta: src/lib/supabase.ts
 */
import { createClient } from "@supabase/supabase-js";

// Proyecto: bdxtdhkbmabwuluvvhdl (FieldCredit / MiCrédito)
// NO usar import.meta.env aquí — Lovable inyecta sus propias variables
const SUPABASE_URL = "https://bdxtdhkbmabwuluvvhdl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeHRkaGtibWFid3VsdXZ2aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODU3MTMsImV4cCI6MjEwMDI2MTcxM30.FQuUB3gZIzT5Ip5i2koYs5sSZoMSsmJGf4EmBIELk9c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
