import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** Klien dengan secret key - HANYA untuk aksi admin di server (menambah user). */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY belum diisi di environment variables");
  return createClient(env.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
