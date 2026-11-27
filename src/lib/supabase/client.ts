"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let browserClient: SupabaseClient<any, "public", any> | null = null;

export function createClient(): SupabaseClient<any, "public", any> {
  if (!browserClient) {
    browserClient = createSupabaseClient<any>(env.url, env.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return browserClient;
}
