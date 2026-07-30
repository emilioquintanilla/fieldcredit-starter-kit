// Ruta: src/integrations/supabase/auth-middleware.ts
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

// Hardcodeado a propósito: sin overrides por variables de entorno.
const SUPABASE_URL = "https://bdxtdhkbmabwuluvvhdl.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeHRkaGtibWFid3VsdXZ2aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODU3MTMsImV4cCI6MjEwMDI2MTcxM30.FQuUB3gZIzT5Ip5i2koYs5sSZoMSsmJGf4EmBIELk9c";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token || token.split(".").length !== 3) {
      throw new Error("Unauthorized");
    }

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) throw new Error("Unauthorized: invalid token");

    return next({ context: { supabase: client, userId: user.id } });
  },
);
