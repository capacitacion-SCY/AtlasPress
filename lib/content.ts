import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Ad, Category, ImpactCard, SiteSettings, Story } from "@/lib/types";

const fallbackSettings = {
  id: "fallback",
  site_name: "Atlas Press Argentina",
  tagline: "Buenas noticias, campañas humanitarias y encuentros interreligiosos con foco en Scientology Argentina.",
  impact_background_image: ""
};

export async function getSiteSettings() {
  if (!getSupabaseEnv()) {
    return fallbackSettings;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .maybeSingle<SiteSettings>();

  return data ?? fallbackSettings;
}

export async function getCategories() {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<Category[]>();

  return data ?? [];
}

export async function getPublishedStories(categorySlug?: string) {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("stories")
    .select(categorySlug ? "*, categories!inner(*)" : "*, categories(*)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (categorySlug) {
    query = query.eq("categories.slug", categorySlug);
  }

  const { data } = await query.returns<Story[]>();
  return data ?? [];
}

export async function getStoryBySlug(slug: string) {
  if (!getSupabaseEnv()) {
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("*, categories(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<Story>();

  if (!data) notFound();
  return data;
}

export async function getActiveAds() {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ads")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .returns<Ad[]>();

  return data ?? [];
}

export async function getImpactCards() {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("impact_cards")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<ImpactCard[]>();

  return data ?? [];
}
