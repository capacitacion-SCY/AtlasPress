import { createClient } from "@supabase/supabase-js";
import { assertSupabaseEnv } from "./env";

export function hasSupabaseAdminEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function createAdminClient() {
  const env = assertSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para administrar usuarios desde Atlas.");
  }

  return createClient(env.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
