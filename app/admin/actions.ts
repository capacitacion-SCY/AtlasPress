"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type Permission = "stories" | "ads" | "impact" | "settings" | "users";

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

async function uniqueStorySlug(baseSlug: string) {
  const supabase = await createClient();
  const base = baseSlug || `nota-${Date.now()}`;
  const { data } = await supabase.from("stories").select("slug").ilike("slug", `${base}%`);
  const existing = new Set((data ?? []).map((item) => item.slug));

  if (!existing.has(base)) return base;
  return `${base}-${Date.now()}`;
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

  const { error } = await supabase.from("stories").insert({
    title,
    slug,
    excerpt: value(formData, "excerpt"),
    content,
    category_id: categoryId,
    author_id: user.id,
    author_name: profile.display_name || profile.email || "Redacción",
    image_url: imageUrl,
    video_url: value(formData, "video_url"),
    featured: checkbox(formData, "featured"),
    editors_pick: checkbox(formData, "editors_pick"),
    source_label: value(formData, "source_label"),
    source_url: value(formData, "source_url"),
    status: value(formData, "status") || "published",
    published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString()
  });

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

  await supabase.from("ads").insert({
    label: value(formData, "label") || "Publicidad",
    title,
    description: value(formData, "description"),
    image_url: imageUrl,
    url: value(formData, "url"),
    active: checkbox(formData, "active")
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=publicidad#publicidad-activa");
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
  const rawBackup = value(formData, "backup_json");

  if (!rawBackup) {
    redirect("/admin?error=backup-vacio#importar-exportar");
  }

  let backup: {
    categories?: Array<{ name: string; slug: string; sort_order?: number }>;
    stories?: Array<Record<string, unknown>>;
  };

  try {
    backup = JSON.parse(rawBackup);
  } catch {
    redirect("/admin?error=backup-json#importar-exportar");
  }

  const categories = Array.isArray(backup.categories) ? backup.categories : [];
  if (categories.length > 0) {
    await supabase.from("categories").upsert(
      categories.map((category, index) => ({
        name: String(category.name || category.slug || `Categoria ${index + 1}`),
        slug: slugify(String(category.slug || category.name || `categoria-${index + 1}`)),
        sort_order: Number(category.sort_order ?? (index + 1) * 10)
      })),
      { onConflict: "slug" }
    );
  }

  const { data: currentCategories } = await supabase.from("categories").select("id, slug");
  const categoryIds = new Map((currentCategories ?? []).map((category) => [category.slug, category.id]));
  const stories = Array.isArray(backup.stories) ? backup.stories : [];

  if (stories.length > 0) {
    await supabase.from("stories").upsert(
      stories.map((story, index) => {
        const title = String(story.title || `Nota importada ${index + 1}`);
        const categorySlug = String(story.category_slug || story.category || "");

        return {
          title,
          slug: slugify(String(story.slug || title)) || `nota-importada-${Date.now()}-${index}`,
          excerpt: String(story.excerpt || ""),
          content: String(story.content || story.body || ""),
          category_id: categoryIds.get(categorySlug) ?? null,
          author_id: user.id,
          author_name: profile.display_name || profile.email || "Redacción",
          image_url: String(story.image_url || story.image || ""),
          video_url: String(story.video_url || ""),
          featured: Boolean(story.featured),
          editors_pick: Boolean(story.editors_pick),
          source_label: String(story.source_label || ""),
          source_url: String(story.source_url || ""),
          status: String(story.status || "published"),
          published_at: story.published_at ? new Date(String(story.published_at)).toISOString() : new Date().toISOString()
        };
      }),
      { onConflict: "slug" }
    );
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?ok=backup#importar-exportar");
}
