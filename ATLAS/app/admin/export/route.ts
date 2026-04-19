import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  const canExport = profile?.active && (profile.role === "admin" || profile.permissions.includes("stories"));

  if (!canExport) {
    return NextResponse.json({ error: "Permiso insuficiente" }, { status: 403 });
  }

  const [settings, categories, stories, ads, impactCards] = await Promise.all([
    supabase.from("site_settings").select("*"),
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("stories").select("*, categories(*)").order("published_at", { ascending: false }),
    supabase.from("ads").select("*").order("created_at", { ascending: false }),
    supabase.from("impact_cards").select("*").order("sort_order", { ascending: true })
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    version: 1,
    settings: settings.data ?? [],
    categories: categories.data ?? [],
    stories: (stories.data ?? []).map((story) => ({
      ...story,
      category_slug: story.categories?.slug,
      categories: undefined
    })),
    ads: ads.data ?? [],
    impact_cards: impactCards.data ?? []
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="atlas-backup-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
}
