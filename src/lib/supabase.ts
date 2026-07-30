import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://bdxtdhkbmabwuluvvhdl.supabase.co";

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeHRkaGtibWFid3VsdXZ2aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODU3MTMsImV4cCI6MjEwMDI2MTcxM30.FQuUB3gZIzT5Ip5i2koYs5sSZoMSsmJGf4EmBIELk9c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: localStorage,
  },
});
