"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/format";
import { embedMediaInContent } from "@/lib/story-gallery";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type Permission = "stories" | "ads" | "impact" | "settings" | "users";
type StoryPayload = Record<string, unknown>;
type StoryPayloadInput = StoryPayload | StoryPayload[];

async function requirePermission(permission: Permission) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const allowed = profile?.active && (profile.role === "admin" || profile.permissions.includes(permission));
  if (!allowed) {
    redirect("/admin?error=permiso");
  }

  return { supabase, user, profile };
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function selectedPermissions(formData: FormData) {
  return ["stories", "ads", "impact", "settings", "users"].filter((permission) => formData.get(permission) === "on");
}

function profileRole(formData: FormData) {
  const role = value(formData, "role");
  return ["admin", "editor", "redactor", "publicidad", "revisor"].includes(role) ? role : "redactor";
}

async function uploadImageFromForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  fieldName: string,
  folder: string,
  fallbackUrl = ""
) {
  const file = formData.get(fieldName);

  if (!(file instanceof File) || file.size === 0) {
    return fallbackUrl;
  }

  if (!file.type.startsWith("image/")) {
    redirect("/admin?error=archivo-invalido");
  }

  const maxSize = 6 * 1024 * 1024;
  if (file.size > maxSize) {
    redirect("/admin?error=archivo-pesado");
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("atlas-media").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });

  if (error) {
    redirect("/admin?error=subir-imagen");
  }

  const { data } = supabase.storage.from("atlas-media").getPublicUrl(path);
  return data.publicUrl;
}

function parseImageList(raw: string) {
  return raw
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueImageList(images: string[]) {
  return Array.from(new Set(images.filter(Boolean)));
}

async function uploadImagesFromForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  fieldName: string,
  folder: string
) {
  const files = formData.getAll(fieldName);
  const urls: string[] = [];

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) {
      continue;
    }

    if (!file.type.startsWith("image/")) {
      redirect("/admin?error=archivo-invalido");
    }

    const maxSize = 6 * 1024 * 1024;
    if (file.size > maxSize) {
      redirect("/admin?error=archivo-pesado");
    }

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("atlas-media").upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false
    });

    if (error) {
      redirect("/admin?error=subir-imagen");
    }

    const { data } = supabase.storage.from("atlas-media").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

async function uniqueStorySlug(baseSlug: string) {
  const supabase = await createClient();
  const base = baseSlug || `nota-${Date.now()}`;
  const { data } = await supabase.from("stories").select("slug").ilike("slug", `${base}%`);
  const existing = new Set((data ?? []).map((item) => item.slug));

  if (!existing.has(base)) return base;
  return `${base}-${Date.now()}`;
}

async function uniqueStorySlugForUpdate(baseSlug: string, currentId: string) {
  const supabase = await createClient();
  const base = baseSlug || `nota-${Date.now()}`;
  const { data } = await supabase.from("stories").select("id, slug").ilike("slug", `${base}%`);
  const conflict = (data ?? []).find((item) => item.slug === base && item.id !== currentId);

  if (!conflict) return base;
  return `${base}-${Date.now()}`;
}

function validStoryStatus(status: string) {
  return ["draft", "published", "archived"].includes(status) ? status : "draft";
}

function validTextPosition(position: string): "auto" | "left" | "right" {
  return position === "left" || position === "right" || position === "auto" ? position : "auto";
}

function homepagePosition(formData: FormData) {
  const position = value(formData, "homepage_position");

  if (["center", "left", "right", "auto"].includes(position)) {
    return position;
  }

  if (checkbox(formData, "homepage_center")) return "center";
  if (checkbox(formData, "homepage_left")) return "left";
  if (checkbox(formData, "homepage_right")) return "right";
  return checkbox(formData, "featured") ? "center" : "auto";
}

type HomepagePosition = "center" | "left" | "right" | "auto";

function normalizedHomepagePosition(formData: FormData): HomepagePosition {
  const position = homepagePosition(formData);
  return position === "center" || position === "left" || position === "right" || position === "auto"
    ? position
    : "auto";
}

function placementFromHomepagePosition(position: HomepagePosition) {
  if (position === "center") {
    return {
      featured: true,
      featured_text_position: "auto" as const
    };
  }

  if (position === "left" || position === "right") {
    return {
      featured: false,
      featured_text_position: position
    };
  }

  return {
    featured: false,
    featured_text_position: "auto" as const
  };
}

function placementPayload(formData: FormData, featuredTextPosition = "auto") {
  const _ = featuredTextPosition;
  return placementFromHomepagePosition(normalizedHomepagePosition(formData));
}

type StoryPlacementRecord = {
  id: string;
  featured: boolean;
  featured_order: number | null;
  featured_text_position: "auto" | "left" | "right";
  published_at: string;
};

type AdPlacementRecord = {
  id: string;
  created_at: string;
};

function storyPlacementGroup(story: Pick<StoryPlacementRecord, "featured" | "featured_text_position">) {
  if (story.featured) return "center";
  if (story.featured_text_position === "left") return "left";
  if (story.featured_text_position === "right") return "right";
  return "auto";
}

function storyOrderValue(story: Pick<StoryPlacementRecord, "featured_order">) {
  return typeof story.featured_order === "number" && Number.isFinite(story.featured_order) && story.featured_order > 0
    ? story.featured_order
    : Number.MAX_SAFE_INTEGER;
}

function sortStoriesForPlacement<T extends StoryPlacementRecord>(stories: T[]) {
  return [...stories].sort((a, b) =>
    storyOrderValue(a) - storyOrderValue(b) ||
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime() ||
    a.id.localeCompare(b.id)
  );
}

function sortAdsForPlacement<T extends AdPlacementRecord>(ads: T[]) {
  return [...ads].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
    a.id.localeCompare(b.id)
  );
}

function moveIndex(currentIndex: number, length: number, action: string) {
  if (action === "first") return 0;
  if (action === "last") return length;
  if (action === "up") return Math.max(0, currentIndex - 1);
  if (action === "down") return Math.min(length, currentIndex + 1);
  return Math.max(0, Math.min(currentIndex, length));
}

function targetPositionIndex(position: string, length: number) {
  const numericPosition = Number(position);

  if (!Number.isFinite(numericPosition) || numericPosition < 1) {
    return null;
  }

  return Math.max(0, Math.min(Math.floor(numericPosition) - 1, length));
}

async function resequenceStories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stories: StoryPlacementRecord[]
) {
  await Promise.all(
    stories.map((story, index) =>
      supabase
        .from("stories")
        .update({
          featured: story.featured,
          featured_text_position: validTextPosition(story.featured_text_position),
          featured_order: index + 1
        })
        .eq("id", story.id)
    )
  );
}

async function resequenceAds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ads: AdPlacementRecord[]
) {
  const baseTime = Date.now() + ads.length * 60_000;

  await Promise.all(
    ads.map((ad, index) =>
      supabase
        .from("ads")
        .update({
          created_at: new Date(baseTime - index * 60_000).toISOString()
        })
        .eq("id", ad.id)
    )
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMissingColumn(error: { code?: string; message?: string } | null, column: string) {
  return Boolean(error && error.code === "PGRST204" && error.message?.includes(column));
}

function payloadWithEmbeddedMedia(story: StoryPayload) {
  if (typeof story.content !== "string") {
    return story;
  }

  return {
    ...story,
    content: embedMediaInContent(story.content, story.gallery_images, story.gallery_videos)
  };
}

function withoutGalleryMedia<T extends StoryPayloadInput>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => {
      const { gallery_images: _galleryImages, gallery_videos: _galleryVideos, ...story } = payloadWithEmbeddedMedia(item);
      return story;
    }) as T;
  }

  const { gallery_images: _galleryImages, gallery_videos: _galleryVideos, ...story } = payloadWithEmbeddedMedia(payload);
  return story as T;
}

async function mutateStoryWithGalleryFallback<T extends StoryPayloadInput>(
  payload: T,
  mutate: (payload: T) => PromiseLike<{ error: { code?: string; message?: string } | null }>
) {
  const result = await mutate(payload);

  if (isMissingColumn(result.error, "gallery_images") || isMissingColumn(result.error, "gallery_videos")) {
    return mutate(withoutGalleryMedia(payload));
  }

  return result;
}

export async function createStory(formData: FormData) {
  const { supabase, user, profile } = await requirePermission("stories");
  const title = value(formData, "title");
  const content = value(formData, "content");

  if (!title || !content) {
    redirect("/admin?error=nota-incompleta#nueva-nota");
  }

  const slug = await uniqueStorySlug(slugify(value(formData, "slug") || title));
  const publishedAt = value(formData, "published_at");
  const categoryId = value(formData, "category_id") || null;
  const imageUrl = await uploadImageFromForm(supabase, formData, "image_file", "stories", value(formData, "image_url"));
  const uploadedGalleryImages = await uploadImagesFromForm(supabase, formData, "gallery_files", "stories/gallery");
  const galleryImages = uniqueImageList([...parseImageList(value(formData, "gallery_image_urls")), ...uploadedGalleryImages]);
  const galleryVideos = uniqueImageList(parseImageList(value(formData, "gallery_video_urls")));

  const storyPayload = {
    title,
    slug,
    excerpt: value(formData, "excerpt"),
    content,
    category_id: categoryId,
    author_id: user.id,
    author_name: profile.display_name || profile.email || "Redacción",
    image_url: imageUrl,
    gallery_images: galleryImages,
    video_url: value(formData, "video_url"),
    gallery_videos: galleryVideos,
    ...placementPayload(formData, value(formData, "featured_text_position")),
    editors_pick: checkbox(formData, "editors_pick"),
    source_label: value(formData, "source_label"),
    source_url: value(formData, "source_url"),
    status: validStoryStatus(value(formData, "status") || "published"),
    published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString()
  };

  const { error } = await mutateStoryWithGalleryFallback(storyPayload, (payload) => supabase.from("stories").insert(payload));

  if (error) {
    redirect("/admin?error=guardar-nota#nueva-nota");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=nota#notas-publicadas");
}

export async function deleteStory(formData: FormData) {
  const { supabase } = await requirePermission("stories");
  const id = value(formData, "id");

  if (id) {
    await supabase.from("stories").delete().eq("id", id);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=nota-borrada#notas-publicadas");
}

export async function updateStory(formData: FormData) {
  const { supabase } = await requirePermission("stories");
  const id = value(formData, "id");
  const title = value(formData, "title");
  const content = value(formData, "content");

  if (!id || !title || !content) {
    redirect("/admin?error=editar-nota#notas-publicadas");
  }

  const slug = await uniqueStorySlugForUpdate(slugify(value(formData, "slug") || title), id);
  const publishedAt = value(formData, "published_at");
  const imageUrl = await uploadImageFromForm(supabase, formData, "image_file", "stories", value(formData, "image_url"));
  const uploadedGalleryImages = await uploadImagesFromForm(supabase, formData, "gallery_files", "stories/gallery");
  const galleryImages = uniqueImageList([...parseImageList(value(formData, "gallery_images")), ...uploadedGalleryImages]);
  const galleryVideos = uniqueImageList(parseImageList(value(formData, "gallery_videos")));
  const storyPayload = {
    title,
    slug,
    excerpt: value(formData, "excerpt"),
    content,
    category_id: value(formData, "category_id") || null,
    image_url: imageUrl,
    gallery_images: galleryImages,
    video_url: value(formData, "video_url"),
    gallery_videos: galleryVideos,
    editors_pick: checkbox(formData, "editors_pick"),
    source_label: value(formData, "source_label"),
    source_url: value(formData, "source_url"),
    status: validStoryStatus(value(formData, "status")),
    ...placementPayload(formData, value(formData, "featured_text_position")),
    published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString()
  };

  const { error } = await mutateStoryWithGalleryFallback(storyPayload, (payload) => supabase.from("stories").update(payload).eq("id", id));

  if (error) {
    redirect("/admin?error=editar-nota#notas-publicadas");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/article/${slug}`);
  redirect("/admin?ok=nota-editada#notas-publicadas");
}

export async function updateStoryPlacement(formData: FormData) {
  const { supabase } = await requirePermission("stories");
  const id = value(formData, "id");
  const positionAction = value(formData, "position_action") || "apply";
  const requestedPosition = value(formData, "target_position");

  if (!id) {
    redirect("/admin?error=editar-nota#notas-publicadas");
  }

  const [{ data: currentStory, error: currentError }, { data: allStories, error: allError }] = await Promise.all([
    supabase
      .from("stories")
      .select("id, featured, featured_order, featured_text_position, published_at")
      .eq("id", id)
      .maybeSingle<StoryPlacementRecord>(),
    supabase
      .from("stories")
      .select("id, featured, featured_order, featured_text_position, published_at")
      .returns<StoryPlacementRecord[]>()
  ]);

  if (currentError || allError || !currentStory || !allStories) {
    redirect("/admin?error=editar-nota#notas-publicadas");
  }

  const nextPlacement = placementFromHomepagePosition(normalizedHomepagePosition(formData));
  const currentGroup = storyPlacementGroup(currentStory);
  const targetStory: StoryPlacementRecord = {
    ...currentStory,
    featured: Boolean(nextPlacement.featured),
    featured_text_position: validTextPosition(String(nextPlacement.featured_text_position || "auto"))
  };
  const targetGroup = storyPlacementGroup(targetStory);

  if (currentGroup === targetGroup) {
    const orderedStories = sortStoriesForPlacement(
      allStories.filter((story) => storyPlacementGroup(story) === currentGroup)
    );
    const currentIndex = orderedStories.findIndex((story) => story.id === currentStory.id);

    if (currentIndex < 0) {
      redirect("/admin?error=editar-nota#notas-publicadas");
    }

    orderedStories.splice(currentIndex, 1);
    const targetIndex =
      targetPositionIndex(requestedPosition, orderedStories.length) ??
      moveIndex(currentIndex, orderedStories.length, positionAction);

    orderedStories.splice(targetIndex, 0, targetStory);
    await resequenceStories(supabase, orderedStories);
  } else {
    const destinationStories = sortStoriesForPlacement(
      allStories.filter((story) => story.id !== currentStory.id && storyPlacementGroup(story) === targetGroup)
    );
    const sourceStories = sortStoriesForPlacement(
      allStories.filter((story) => story.id !== currentStory.id && storyPlacementGroup(story) === currentGroup)
    );

    destinationStories.unshift(targetStory);

    await Promise.all([
      resequenceStories(supabase, destinationStories),
      resequenceStories(supabase, sourceStories)
    ]);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=nota-editada#notas-publicadas");
}

export async function duplicateStory(formData: FormData) {
  const { supabase, user, profile } = await requirePermission("stories");
  const id = value(formData, "id");

  if (!id) {
    redirect("/admin?error=duplicar-nota#notas-publicadas");
  }

  const { data: story, error } = await supabase.from("stories").select("*").eq("id", id).maybeSingle();
  if (error || !story) {
    redirect("/admin?error=duplicar-nota#notas-publicadas");
  }

  const title = `${story.title} (Copia)`;
  const slug = await uniqueStorySlug(slugify(title));
  const storyPayload = {
    title,
    slug,
    excerpt: story.excerpt ?? "",
    content: story.content ?? "",
    category_id: story.category_id ?? null,
    author_id: user.id,
    author_name: profile.display_name || profile.email || "Redacción",
    image_url: story.image_url ?? "",
    gallery_images: Array.isArray(story.gallery_images) ? story.gallery_images : [],
    video_url: story.video_url ?? "",
    gallery_videos: Array.isArray(story.gallery_videos) ? story.gallery_videos : [],
    featured: Boolean(story.featured),
    editors_pick: Boolean(story.editors_pick),
    featured_order: story.featured_order ?? null,
    featured_text_position: story.featured_text_position ?? "auto",
    source_label: story.source_label ?? "",
    source_url: story.source_url ?? "",
    status: "draft",
    published_at: new Date().toISOString()
  };

  const { error: insertError } = await mutateStoryWithGalleryFallback(storyPayload, (payload) => supabase.from("stories").insert(payload));

  if (insertError) {
    redirect("/admin?error=duplicar-nota#notas-publicadas");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=nota-duplicada#notas-publicadas");
}

export async function updateSettings(formData: FormData) {
  const { supabase } = await requirePermission("settings");
  const id = value(formData, "id");
  const rawRotation = Number(value(formData, "auto_rotation_seconds") || 45);
  const autoRotationSeconds = Number.isFinite(rawRotation) ? Math.max(10, Math.min(3600, Math.floor(rawRotation))) : 45;
  const rawCenterImageRotation = Number(value(formData, "center_image_rotation_seconds") || 5);
  const centerImageRotationSeconds = Number.isFinite(rawCenterImageRotation)
    ? Math.max(2, Math.min(120, Math.floor(rawCenterImageRotation)))
    : 5;
  const rawRightImageRotation = Number(value(formData, "right_image_rotation_seconds") || 5);
  const rightImageRotationSeconds = Number.isFinite(rawRightImageRotation)
    ? Math.max(2, Math.min(120, Math.floor(rawRightImageRotation)))
    : 5;

  const payload = {
    site_name: value(formData, "site_name"),
    tagline: value(formData, "tagline"),
    impact_background_image: value(formData, "impact_background_image"),
    auto_rotation_seconds: autoRotationSeconds,
    center_image_rotation_seconds: centerImageRotationSeconds,
    right_image_rotation_seconds: rightImageRotationSeconds
  };
  const fallbackPayload = {
    site_name: payload.site_name,
    tagline: payload.tagline,
    impact_background_image: payload.impact_background_image
  };

  const runMutation = (data: typeof payload | typeof fallbackPayload) =>
    id ? supabase.from("site_settings").update(data).eq("id", id) : supabase.from("site_settings").insert(data);

  const result = await runMutation(payload);
  if (
    isMissingColumn(result.error, "auto_rotation_seconds") ||
    isMissingColumn(result.error, "center_image_rotation_seconds") ||
    isMissingColumn(result.error, "right_image_rotation_seconds")
  ) {
    redirect("/admin?error=temporizadores-schema#ajustes-rapidos");
  } else if (result.error) {
    redirect("/admin?error=ajustes#ajustes-rapidos");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=ajustes#ajustes-rapidos");
}

export async function createAd(formData: FormData) {
  const { supabase } = await requirePermission("ads");
  const title = value(formData, "title");

  if (!title) {
    redirect("/admin?error=publicidad#crear-publicidad");
  }

  const imageUrl = await uploadImageFromForm(supabase, formData, "image_file", "ads", value(formData, "image_url"));

  const { error } = await supabase.from("ads").insert({
    label: value(formData, "label") || "Publicidad",
    title,
    description: value(formData, "description"),
    image_url: imageUrl,
    url: value(formData, "url"),
    active: checkbox(formData, "active")
  });

  if (error) {
    redirect("/admin?error=publicidad#crear-publicidad");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=publicidad#publicidad-activa");
}

export async function updateAd(formData: FormData) {
  const { supabase } = await requirePermission("ads");
  const id = value(formData, "id");
  const title = value(formData, "title");

  if (!id || !title) {
    redirect("/admin?error=editar-publicidad#publicidad-activa");
  }

  const { error } = await supabase
    .from("ads")
    .update({
      label: value(formData, "label") || "Publicidad",
      title,
      description: value(formData, "description"),
      image_url: value(formData, "image_url"),
      url: value(formData, "url"),
      active: checkbox(formData, "active")
    })
    .eq("id", id);

  if (error) {
    redirect("/admin?error=editar-publicidad#publicidad-activa");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=publicidad-editada#publicidad-activa");
}

export async function updateAdPosition(formData: FormData) {
  const { supabase } = await requirePermission("ads");
  const id = value(formData, "id");
  const positionAction = value(formData, "position_action") || "up";
  const requestedPosition = value(formData, "target_position");

  if (!id) {
    redirect("/admin?error=editar-publicidad#publicidad-activa");
  }

  const { data: ads, error } = await supabase.from("ads").select("id, created_at").returns<AdPlacementRecord[]>();

  if (error || !ads) {
    redirect("/admin?error=editar-publicidad#publicidad-activa");
  }

  const orderedAds = sortAdsForPlacement(ads);
  const currentIndex = orderedAds.findIndex((ad) => ad.id === id);

  if (currentIndex < 0) {
    redirect("/admin?error=editar-publicidad#publicidad-activa");
  }

  const [selectedAd] = orderedAds.splice(currentIndex, 1);
  const nextIndex = targetPositionIndex(requestedPosition, orderedAds.length) ?? moveIndex(currentIndex, orderedAds.length, positionAction);
  orderedAds.splice(nextIndex, 0, selectedAd);

  await resequenceAds(supabase, orderedAds);

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=publicidad-editada#publicidad-activa");
}

export async function duplicateAd(formData: FormData) {
  const { supabase } = await requirePermission("ads");
  const id = value(formData, "id");

  if (!id) {
    redirect("/admin?error=duplicar-publicidad#publicidad-activa");
  }

  const { data: ad, error } = await supabase.from("ads").select("*").eq("id", id).maybeSingle();
  if (error || !ad) {
    redirect("/admin?error=duplicar-publicidad#publicidad-activa");
  }

  const { error: insertError } = await supabase.from("ads").insert({
    label: ad.label ?? "Publicidad",
    title: `${ad.title} (Copia)`,
    description: ad.description ?? "",
    image_url: ad.image_url ?? "",
    url: ad.url ?? "",
    active: Boolean(ad.active)
  });

  if (insertError) {
    redirect("/admin?error=duplicar-publicidad#publicidad-activa");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=publicidad-duplicada#publicidad-activa");
}

export async function deleteAd(formData: FormData) {
  const { supabase } = await requirePermission("ads");
  const id = value(formData, "id");

  if (id) {
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (error) {
      redirect("/admin?error=borrar-publicidad#publicidad-activa");
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=publicidad-borrada#publicidad-activa");
}

export async function updateImpactCard(formData: FormData) {
  const { supabase } = await requirePermission("impact");
  const id = value(formData, "id");

  await supabase
    .from("impact_cards")
    .update({
      label: value(formData, "label"),
      title: value(formData, "title"),
      body: value(formData, "body"),
      sort_order: Number(value(formData, "sort_order") || 1)
    })
    .eq("id", id);

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=impacto#franja-impacto");
}

export async function updateProfilePermissions(formData: FormData) {
  const { supabase } = await requirePermission("users");
  const id = value(formData, "id");
  const permissions = selectedPermissions(formData);
  const newPassword = value(formData, "new_password");

  await supabase
    .from("profiles")
    .update({
      display_name: value(formData, "display_name"),
      role: profileRole(formData),
      active: checkbox(formData, "active"),
      permissions
    })
    .eq("id", id);

  if (newPassword) {
    if (newPassword.length < 8) {
      redirect("/admin?error=password-corta#equipo-editorial");
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      redirect("/admin?error=service-role#equipo-editorial");
    }

    const { error } = await admin.auth.admin.updateUserById(id, { password: newPassword });
    if (error) {
      redirect("/admin?error=password#equipo-editorial");
    }
  }

  revalidatePath("/admin");
  redirect("/admin?ok=usuario#equipo-editorial");
}

export async function createEditorialUser(formData: FormData) {
  await requirePermission("users");

  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const displayName = value(formData, "display_name") || email.split("@")[0];
  const role = profileRole(formData);
  const permissions = selectedPermissions(formData);
  const active = checkbox(formData, "active");

  if (!email || !password) {
    redirect("/admin?error=usuario-incompleto#equipo-editorial");
  }

  if (password.length < 8) {
    redirect("/admin?error=password-corta#equipo-editorial");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect("/admin?error=service-role#equipo-editorial");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      role,
      permissions: permissions.join(",")
    }
  });

  if (error || !data.user) {
    redirect("/admin?error=crear-usuario#equipo-editorial");
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    display_name: displayName,
    role,
    permissions,
    active
  });

  if (profileError) {
    redirect("/admin?error=perfil-usuario#equipo-editorial");
  }

  revalidatePath("/admin");
  redirect("/admin?ok=usuario-creado#equipo-editorial");
}

export async function syncEditorialUsers() {
  await requirePermission("users");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect("/admin?error=service-role#equipo-editorial");
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    redirect("/admin?error=sincronizar-usuarios#equipo-editorial");
  }

  const { data: existingProfiles, error: profilesError } = await admin.from("profiles").select("id");
  if (profilesError) {
    redirect("/admin?error=sincronizar-usuarios#equipo-editorial");
  }

  const existingIds = new Set((existingProfiles ?? []).map((item) => item.id));
  const missingUsers = data.users.filter((authUser) => Boolean(authUser.email) && !existingIds.has(authUser.id));

  if (missingUsers.length > 0) {
    const { error: insertError } = await admin.from("profiles").insert(
      missingUsers.map((authUser) => ({
        id: authUser.id,
        email: authUser.email ?? "",
        display_name: String(authUser.user_metadata?.display_name || authUser.email?.split("@")[0] || "Usuario"),
        role: "redactor",
        permissions: ["stories"],
        active: true
      }))
    );

    if (insertError) {
      redirect("/admin?error=sincronizar-usuarios#equipo-editorial");
    }
  }

  revalidatePath("/admin");
  redirect("/admin?ok=usuarios-sincronizados#equipo-editorial");
}

export async function importBackup(formData: FormData) {
  const { supabase, user, profile } = await requirePermission("stories");
  let rawBackup = value(formData, "backup_json");
  const backupFile = formData.get("backup_file");

  if (!rawBackup && backupFile instanceof File && backupFile.size > 0) {
    if (!backupFile.name.toLowerCase().endsWith(".json")) {
      redirect("/admin?error=backup-json#importar-exportar");
    }

    rawBackup = await backupFile.text();
  }

  if (!rawBackup) {
    redirect("/admin?error=backup-vacio#importar-exportar");
  }

  let backup: {
    settings?: Array<Record<string, unknown>>;
    categories?: Array<{ name: string; slug: string; sort_order?: number }>;
    stories?: Array<Record<string, unknown>>;
    ads?: Array<Record<string, unknown>>;
    impact_cards?: Array<Record<string, unknown>>;
  };

  try {
    backup = JSON.parse(rawBackup);
  } catch {
    redirect("/admin?error=backup-json#importar-exportar");
  }

  const categories = Array.isArray(backup.categories) ? backup.categories : [];
  if (categories.length > 0) {
    const { error } = await supabase.from("categories").upsert(
      categories.map((category, index) => ({
        name: String(category.name || category.slug || `Categoria ${index + 1}`),
        slug: slugify(String(category.slug || category.name || `categoria-${index + 1}`)),
        sort_order: Number(category.sort_order ?? (index + 1) * 10)
      })),
      { onConflict: "slug" }
    );

    if (error) {
      redirect("/admin?error=backup-categorias#importar-exportar");
    }
  }

  const { data: currentCategories, error: categoriesError } = await supabase.from("categories").select("id, slug");
  if (categoriesError) {
    redirect("/admin?error=backup-categorias#importar-exportar");
  }

  const categoryIds = new Map((currentCategories ?? []).map((category) => [category.slug, category.id]));
  const stories = Array.isArray(backup.stories) ? backup.stories : [];

  if (stories.length > 0) {
    const storyPayload = stories.map((story, index) => {
        const title = String(story.title || `Nota importada ${index + 1}`);
        const categorySlug = String(story.category_slug || story.category || "");
        const status = String(story.status || "published");
        const textPosition = String(story.featured_text_position || "auto");

        return {
          title,
          slug: slugify(String(story.slug || title)) || `nota-importada-${Date.now()}-${index}`,
          excerpt: String(story.excerpt || ""),
          content: String(story.content || story.body || ""),
          category_id: categoryIds.get(categorySlug) ?? null,
          author_id: user.id,
          author_name: profile.display_name || profile.email || "Redacción",
          image_url: String(story.image_url || story.image || ""),
          gallery_images: Array.isArray(story.gallery_images)
            ? story.gallery_images.map((image) => String(image)).filter(Boolean)
            : parseImageList(String(story.gallery_images || story.images || "")),
          video_url: String(story.video_url || ""),
          gallery_videos: Array.isArray(story.gallery_videos)
            ? story.gallery_videos.map((video) => String(video)).filter(Boolean)
            : parseImageList(String(story.gallery_videos || story.videos || "")),
          featured: Boolean(story.featured),
          editors_pick: Boolean(story.editors_pick),
          featured_order: story.featured_order === null || story.featured_order === undefined ? null : Number(story.featured_order),
          featured_text_position: ["auto", "left", "right"].includes(textPosition) ? textPosition : "auto",
          source_label: String(story.source_label || ""),
          source_url: String(story.source_url || ""),
          status: ["draft", "published", "archived"].includes(status) ? status : "published",
          published_at: story.published_at ? new Date(String(story.published_at)).toISOString() : new Date().toISOString()
        };
      });

    const { error } = await mutateStoryWithGalleryFallback(storyPayload, (payload) => supabase.from("stories").upsert(payload, { onConflict: "slug" }));

    if (error) {
      redirect("/admin?error=backup-notas#importar-exportar");
    }
  }

  const ads = Array.isArray(backup.ads) ? backup.ads : [];
  if (ads.length > 0) {
    const { error } = await supabase.from("ads").upsert(
      ads.map((ad) => ({
        ...(isUuid(String(ad.id || "")) ? { id: String(ad.id) } : {}),
        label: String(ad.label || "Publicidad"),
        title: String(ad.title || "Publicidad importada"),
        description: String(ad.description || ""),
        image_url: String(ad.image_url || ""),
        url: String(ad.url || ""),
        active: Boolean(ad.active)
      })),
      { onConflict: "id" }
    );

    if (error) {
      redirect("/admin?error=backup-publicidad#importar-exportar");
    }
  }

  const impactCards = Array.isArray(backup.impact_cards) ? backup.impact_cards : [];
  if (impactCards.length > 0) {
    const { error } = await supabase.from("impact_cards").upsert(
      impactCards.map((card, index) => ({
        label: String(card.label || ""),
        title: String(card.title || `Bloque importado ${index + 1}`),
        body: String(card.body || ""),
        sort_order: Number(card.sort_order ?? (index + 1) * 10)
      })),
      { onConflict: "id" }
    );

    if (error) {
      redirect("/admin?error=backup-impacto#importar-exportar");
    }
  }

  const settings = Array.isArray(backup.settings) ? backup.settings : [];
  if (settings.length > 0) {
    const [firstSetting] = settings;
    const { data: currentSettings } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
    const payload = {
      site_name: String(firstSetting.site_name || "Atlas Press Argentina"),
      tagline: String(firstSetting.tagline || ""),
      impact_background_image: String(firstSetting.impact_background_image || ""),
      auto_rotation_seconds: Number(firstSetting.auto_rotation_seconds ?? 45),
      center_image_rotation_seconds: Number(firstSetting.center_image_rotation_seconds ?? 5),
      right_image_rotation_seconds: Number(firstSetting.right_image_rotation_seconds ?? 5)
    };
    const fallbackPayload = {
      site_name: payload.site_name,
      tagline: payload.tagline,
      impact_background_image: payload.impact_background_image
    };
    const runMutation = (data: typeof payload | typeof fallbackPayload) =>
      currentSettings?.id
        ? supabase.from("site_settings").update(data).eq("id", currentSettings.id)
        : supabase.from("site_settings").insert(data);
    const result = await runMutation(payload);

    if (
      isMissingColumn(result.error, "auto_rotation_seconds") ||
      isMissingColumn(result.error, "center_image_rotation_seconds") ||
      isMissingColumn(result.error, "right_image_rotation_seconds")
    ) {
      const fallbackResult = await runMutation(fallbackPayload);
      if (fallbackResult.error) {
        redirect("/admin?error=backup-ajustes#importar-exportar");
      }
    } else if (result.error) {
      redirect("/admin?error=backup-ajustes#importar-exportar");
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=backup#importar-exportar");
}
