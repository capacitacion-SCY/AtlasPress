export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url, publishableKey };
}

export function assertSupabaseEnv() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error(
      "Faltan variables de entorno de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en Vercel."
    );
  }

  return env;
}
