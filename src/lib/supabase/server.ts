import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client Supabase untuk Server Component & Server Action.
 * Karena aplikasi tanpa login, tidak perlu memproses cookie session setiap request.
 * Ini membuat query database super cepat tanpa overhead parsing cookie.
 */
let serverClient: SupabaseClient<any, "public", any> | null = null;

export async function createClient(): Promise<SupabaseClient<any, "public", any>> {
  if (!serverClient) {
    serverClient = createSupabaseClient<any>(env.url, env.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverClient;
}
