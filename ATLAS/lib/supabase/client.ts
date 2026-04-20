import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnv } from "./env";

export function createClient() {
  const env = assertSupabaseEnv();
  return createBrowserClient(env.url, env.publishableKey);
}
