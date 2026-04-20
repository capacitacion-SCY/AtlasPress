"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/format";
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

function validTextPosition(position: string) {
  return ["auto", "left", "right"].includes(position) ? position : "auto";
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

function placementPayload(formData: FormData, featuredTextPosition = "auto") {
  const position = homepagePosition(formData);

  if (position === "center") {
    return {
      featured: true,
      featured_text_position: validTextPosition(featuredTextPosition)
    };
  }

  return {
    featured: false,
    featured_text_position: position === "left" || position === "right" ? position : "auto"
  };
}

function isMissingGalleryColumn(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      error.code === "PGRST204" &&
      error.message?.includes("gallery_images")
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function withoutGalleryImages<T extends StoryPayloadInput>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map(({ gallery_images: _galleryImages, ...story }) => story) as T;
  }

  const { gallery_images: _galleryImages, ...story } = payload;
  return story as T;
}

async function mutateStoryWithGalleryFallback<T extends StoryPayloadInput>(
  payload: T,
  mutate: (payload: T) => PromiseLike<{ error: { code?: string; message?: string } | null }>
) {
  const result = await mutate(payload);

  if (isMissingGalleryColumn(result.error)) {
    const payloads = Array.isArray(payload) ? payload : [payload];
    const hasGalleryImages = payloads.some((story) => Array.isArray(story.gallery_images) && story.gallery_images.length > 0);

    if (hasGalleryImages) {
      redirect("/admin?error=galeria-pendiente#nueva-nota");
    }

    return mutate(withoutGalleryImages(payload));
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
  const featuredOrder = value(formData, "featured_order");
  const imageUrl = await uploadImageFromForm(supabase, formData, "image_file", "stories", value(formData, "image_url"));
  const uploadedGalleryImages = await uploadImagesFromForm(supabase, formData, "gallery_files", "stories/gallery");
  const galleryImages = uniqueImageList([...parseImageList(value(formData, "gallery_images")), ...uploadedGalleryImages]);
  const storyPayload = {
    title,
    slug,
    excerpt: value(formData, "excerpt"),
    content,
    category_id: value(formData, "category_id") || null,
    image_url: imageUrl,
    gallery_images: galleryImages,
    video_url: value(formData, "video_url"),
    ...placementPayload(formData, value(formData, "featured_text_position")),
    editors_pick: checkbox(formData, "editors_pick"),
    featured_order: featuredOrder ? Number(featuredOrder) : null,
    source_label: value(formData, "source_label"),
    source_url: value(formData, "source_url"),
    status: validStoryStatus(value(formData, "status")),
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

  if (!id) {
    redirect("/admin?error=editar-nota#notas-publicadas");
  }

  const { error } = await supabase
    .from("stories")
    .update(placementPayload(formData, value(formData, "featured_text_position")))
    .eq("id", id);

  if (error) {
    redirect("/admin?error=editar-nota#notas-publicadas");
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

  const payload = {
    site_name: value(formData, "site_name"),
    tagline: value(formData, "tagline"),
    impact_background_image: value(formData, "impact_background_image")
  };

  const query = id
    ? supabase.from("site_settings").update(payload).eq("id", id)
    : supabase.from("site_settings").insert(payload);

  await query;
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
      impact_background_image: String(firstSetting.impact_background_image || "")
    };
    const { error } = currentSettings?.id
      ? await supabase.from("site_settings").update(payload).eq("id", currentSettings.id)
      : await supabase.from("site_settings").insert(payload);

    if (error) {
      redirect("/admin?error=backup-ajustes#importar-exportar");
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=backup#importar-exportar");
}
