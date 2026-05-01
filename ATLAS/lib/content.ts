import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { normalizeStoriesGallery, normalizeStoryGallery } from "@/lib/story-gallery";
import type { Ad, Category, ImpactCard, SiteSettings, Story } from "@/lib/types";

const fallbackSettings = {
  id: "fallback",
  site_name: "Atlas Press Argentina",
  tagline: "Buenas noticias, campañas humanitarias y encuentros interreligiosos con foco en Scientology Argentina.",
  impact_background_image: "",
  auto_rotation_seconds: 45,
  center_image_rotation_seconds: 5,
  right_image_rotation_seconds: 5
};

function numberSetting(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function normalizeSiteSettings(data: SiteSettings | null): SiteSettings {
  const settings = data ?? fallbackSettings;

  return {
    ...settings,
    auto_rotation_seconds: numberSetting(settings.auto_rotation_seconds, fallbackSettings.auto_rotation_seconds, 10, 3600),
    center_image_rotation_seconds: numberSetting(settings.center_image_rotation_seconds, fallbackSettings.center_image_rotation_seconds, 2, 120),
    right_image_rotation_seconds: numberSetting(settings.right_image_rotation_seconds, fallbackSettings.right_image_rotation_seconds, 2, 120)
  };
}

export async function getSiteSettings() {
  if (!getSupabaseEnv()) {
    return normalizeSiteSettings(null);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .maybeSingle<SiteSettings>();

  return normalizeSiteSettings(data);
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
  return normalizeStoriesGallery(data ?? []);
}

export async function getAllStories() {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("*, categories(*)")
    .order("published_at", { ascending: false })
    .returns<Story[]>();

  return normalizeStoriesGallery(data ?? []);
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
  return normalizeStoryGallery(data);
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

export async function getAllAds() {
  if (!getSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ads")
    .select("*")
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
