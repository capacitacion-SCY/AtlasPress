import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { AdminTabsController } from "@/components/AdminTabsController";
import { BackupFileInput } from "@/components/BackupFileInput";
import {
  createAd,
  createEditorialUser,
  createStory,
  deleteAd,
  deleteStory,
  duplicateAd,
  duplicateStory,
  importBackup,
  syncEditorialUsers,
  updateAd,
  updateImpactCard,
  updateProfilePermissions,
  updateStoryPlacement,
  updateStory,
  updateSettings
} from "./actions";
import { getAllAds, getAllStories, getCategories, getImpactCards, getSiteSettings } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Ad, Profile, Story } from "@/lib/types";

const permissions = [
  { key: "stories", label: "Notas" },
  { key: "ads", label: "Publicidad" },
  { key: "impact", label: "Franja de impacto" },
  { key: "settings", label: "Ajustes" },
  { key: "users", label: "Usuarios" }
];

const feedbackMessages: Record<string, string> = {
  "archivo-invalido": "El archivo debe ser una imagen JPG, PNG, WebP u otro formato de imagen valido.",
  "archivo-pesado": "La imagen supera el limite de 6 MB. Reduce el peso y vuelve a intentarlo.",
  "galeria-pendiente": "La nota se puede publicar, pero la galeria necesita ejecutar primero supabase/story-gallery.sql en Supabase.",
  "guardar-nota": "No se pudo guardar la nota. Revisa permisos, categoria, imagenes y que la migracion de galeria este aplicada.",
  "nota-incompleta": "Completa al menos titulo y contenido para publicar la nota.",
  "publicidad": "No se pudo crear la publicidad. Revisa titulo, imagen y permisos de publicidad.",
  "subir-imagen": "No se pudo subir la imagen al bucket atlas-media. Revisa que el bucket y sus politicas existan en Supabase.",
  "backup-vacio": "Selecciona un archivo JSON o pega el contenido del backup.",
  "backup-json": "El archivo no parece ser un JSON válido de Atlas.",
  "backup-categorias": "No se pudieron importar las categorías. Revisa permisos de ajustes.",
  "backup-notas": "No se pudieron importar las notas. Revisa permisos y formato del backup.",
  "backup-publicidad": "Las notas se procesaron, pero falló la publicidad. Revisa permisos de publicidad.",
  "backup-impacto": "Las notas se procesaron, pero falló la franja de impacto. Revisa permisos de impacto.",
  "backup-ajustes": "Las notas se procesaron, pero fallaron los ajustes del sitio.",
  "editar-nota": "No se pudo editar la nota. Revisa título, contenido, slug o permisos.",
  "duplicar-nota": "No se pudo duplicar la nota.",
  "editar-publicidad": "No se pudo editar la publicidad.",
  "duplicar-publicidad": "No se pudo duplicar la publicidad.",
  "borrar-publicidad": "No se pudo borrar la publicidad."
};

function can(profile: Profile, permission: string) {
  return profile.role === "admin" || profile.permissions.includes(permission);
}

function storyStatusLabel(status: Story["status"]) {
  if (status === "draft") return "Borrador";
  if (status === "archived") return "Archivada";
  return "Publicada";
}

function storyImageSet(story: Story) {
  return [story.image_url, ...(story.gallery_images ?? [])].filter(Boolean);
}

function storyHomepagePosition(story: Story) {
  if (story.featured) return "center";
  if (story.featured_text_position === "left") return "left";
  if (story.featured_text_position === "right") return "right";
  return "auto";
}

function storyHomepagePositionLabel(story: Story) {
  const position = storyHomepagePosition(story);
  if (position === "center") return "Columna central";
  if (position === "left") return "Columna izquierda";
  if (position === "right") return "Columna derecha";
  return "Automatico";
}

function PlacementChoice({ value, label, current }: { value: string; label: string; current: string }) {
  return (
    <label className="placement-choice">
      <input type="radio" name="homepage_position" value={value} defaultChecked={current === value} />
      <span>{label}</span>
    </label>
  );
}

function StoryRow({ story, categories, allowManage }: { story: Story; categories: Awaited<ReturnType<typeof getCategories>>; allowManage: boolean }) {
  const publishedDate = story.published_at ? story.published_at.slice(0, 16) : "";
  const images = storyImageSet(story);

  return (
    <article className="story-row story-library-row">
      <div className="story-library-row__thumb">
        {story.image_url ? <img src={story.image_url} alt="" /> : "Sin imagen"}
        {images.length > 1 && <span className="story-library-row__gallery-count">{images.length} fotos</span>}
      </div>
      <div className="story-library-row__content">
        <strong>{story.title}</strong>
        <p>{story.excerpt || story.content}</p>
        <div className="story-library-row__meta">
          <span>{story.categories?.name ?? "Sin categoría"}</span>
          <span>{formatDate(story.published_at)}</span>
          <span>{storyStatusLabel(story.status)}</span>
          <span>{storyHomepagePositionLabel(story)}</span>
        </div>
      </div>
      {allowManage && (
        <form action={updateStoryPlacement} className="story-placement-form" aria-label={`Ubicacion de ${story.title}`}>
          <input type="hidden" name="id" value={story.id} />
          <input type="hidden" name="featured_text_position" value={story.featured_text_position ?? "auto"} />
          <div className="story-placement-form__choices">
            <PlacementChoice value="left" label="Izquierda" current={storyHomepagePosition(story)} />
            <PlacementChoice value="center" label="Central" current={storyHomepagePosition(story)} />
            <PlacementChoice value="right" label="Derecha" current={storyHomepagePosition(story)} />
            <PlacementChoice value="auto" label="Auto" current={storyHomepagePosition(story)} />
          </div>
          <button className="button button--ghost" type="submit">Aplicar</button>
        </form>
      )}
      <div className="story-row__actions">
        <Link className="button button--ghost" href={`/article/${story.slug}`}>
          Ver
        </Link>
        {allowManage && (
          <form action={duplicateStory}>
            <input type="hidden" name="id" value={story.id} />
            <button className="button button--ghost" type="submit">
              Duplicar
            </button>
          </form>
        )}
        {allowManage && (
          <form action={deleteStory}>
            <input type="hidden" name="id" value={story.id} />
            <button className="button" type="submit">
              Borrar
            </button>
          </form>
        )}
      </div>
      {allowManage && (
        <details className="admin-edit-details">
          <summary>Editar publicación</summary>
          <form action={updateStory} className="admin-edit-form">
            <input type="hidden" name="id" value={story.id} />
            <div className="form-split">
              <label><span>Título</span><input name="title" defaultValue={story.title} required /></label>
              <label><span>Slug</span><input name="slug" defaultValue={story.slug} required /></label>
            </div>
            <label><span>Resumen breve</span><textarea name="excerpt" defaultValue={story.excerpt} /></label>
            <label><span>Contenido</span><textarea name="content" defaultValue={story.content} required /></label>
            <div className="form-split">
              <label>
                <span>Categoría</span>
                <select name="category_id" defaultValue={story.categories?.id ?? ""}>
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Estado</span>
                <select name="status" defaultValue={story.status}>
                  <option value="draft">Borrador</option>
                  <option value="published">Publicada</option>
                  <option value="archived">Archivada</option>
                </select>
              </label>
            </div>
            <div className="form-split">
              <label><span>URL de imagen</span><input name="image_url" defaultValue={story.image_url} placeholder="https://..." /></label>
              <label><span>Video</span><input name="video_url" defaultValue={story.video_url} placeholder="https://..." /></label>
            </div>
            <div className="story-gallery-preview" aria-label="Imagenes cargadas en esta publicacion">
              {images.length > 0 ? (
                images.map((image, index) => (
                  <figure key={`${story.id}-${image}-${index}`}>
                    <img src={image} alt="" />
                    <figcaption>{index === 0 ? "Principal" : `Galeria ${index}`}</figcaption>
                  </figure>
                ))
              ) : (
                <p>No hay imagenes cargadas.</p>
              )}
            </div>
            <div className="form-split form-split--media">
              <label className="image-upload-card">
                <span className="image-upload-card__title">Cambiar imagen principal</span>
                <span className="image-upload-card__copy">Si cargas una imagen nueva, reemplaza la URL principal.</span>
                <input type="file" name="image_file" accept="image/*" />
              </label>
              <label className="image-upload-card">
                <span className="image-upload-card__title">Agregar imagenes a la galeria</span>
                <span className="image-upload-card__copy">Puedes seleccionar varias imagenes para sumarlas a esta nota.</span>
                <input type="file" name="gallery_files" accept="image/*" multiple />
              </label>
            </div>
            <label>
              <span>Galeria de imagenes</span>
              <textarea name="gallery_images" defaultValue={(story.gallery_images ?? []).join("\n")} placeholder="Una URL por linea. Borra una URL para quitarla de la rotacion." />
            </label>
            <div className="form-split">
              <label><span>Fuente</span><input name="source_label" defaultValue={story.source_label} /></label>
              <label><span>URL de fuente</span><input name="source_url" defaultValue={story.source_url} placeholder="https://..." /></label>
            </div>
            <div className="form-split">
              <label><span>Fecha de publicación</span><input type="datetime-local" name="published_at" defaultValue={publishedDate} /></label>
              <label><span>Orden destacada</span><input type="number" name="featured_order" defaultValue={story.featured_order ?? ""} /></label>
            </div>
            <label>
              <span>Posición de texto</span>
              <select name="featured_text_position" defaultValue={story.featured_text_position ?? "auto"}>
                <option value="auto">Automática</option>
                <option value="left">Izquierda</option>
                <option value="right">Derecha</option>
              </select>
            </label>
            <div className="form-split form-split--toggles">
              <fieldset className="placement-fieldset">
                <legend>Ubicacion en portada</legend>
                <div className="story-placement-form__choices">
                  <PlacementChoice value="left" label="Izquierda" current={storyHomepagePosition(story)} />
                  <PlacementChoice value="center" label="Central" current={storyHomepagePosition(story)} />
                  <PlacementChoice value="right" label="Derecha" current={storyHomepagePosition(story)} />
                  <PlacementChoice value="auto" label="Auto" current={storyHomepagePosition(story)} />
                </div>
              </fieldset>
              <label className="checkbox"><input type="checkbox" name="editors_pick" defaultChecked={story.editors_pick} /><span>Selección editorial</span></label>
            </div>
            <button className="button button--primary" type="submit">Guardar cambios</button>
          </form>
        </details>
      )}
    </article>
  );
}

function AdRow({ ad, allowManage }: { ad: Ad; allowManage: boolean }) {
  return (
    <article className="ad-admin-card">
      <div className="ad-admin-card__media">{ad.image_url ? <img src={ad.image_url} alt="" /> : "Publicidad"}</div>
      <div className="ad-admin-card__body">
        <div className="ad-admin-card__meta">
          <span>{ad.label}</span>
          <small>{ad.active ? "Activa" : "Pausada"}</small>
        </div>
        <h4>{ad.title}</h4>
        <p>{ad.description}</p>
        {ad.url && (
          <a className="ad-admin-card__url" href={ad.url} target="_blank" rel="noreferrer">
            {ad.url}
          </a>
        )}
        {allowManage && (
          <div className="ad-admin-card__actions">
            <form action={duplicateAd}>
              <input type="hidden" name="id" value={ad.id} />
              <button className="button button--ghost" type="submit">Duplicar publicidad</button>
            </form>
            <form action={deleteAd}>
              <input type="hidden" name="id" value={ad.id} />
              <button className="button" type="submit">Borrar publicidad</button>
            </form>
          </div>
        )}
        {allowManage && (
          <details className="admin-edit-details">
            <summary>Editar publicidad</summary>
            <form action={updateAd} className="admin-edit-form">
              <input type="hidden" name="id" value={ad.id} />
              <div className="form-split">
                <label><span>Etiqueta</span><input name="label" defaultValue={ad.label} /></label>
                <label><span>Título</span><input name="title" defaultValue={ad.title} required /></label>
              </div>
              <label><span>Descripción</span><textarea name="description" defaultValue={ad.description} /></label>
              <div className="form-split">
                <label><span>URL de imagen</span><input name="image_url" defaultValue={ad.image_url} placeholder="https://..." /></label>
                <label><span>Enlace</span><input name="url" defaultValue={ad.url} placeholder="https://..." /></label>
              </div>
              <label className="checkbox"><input type="checkbox" name="active" defaultChecked={ad.active} /><span>Publicidad activa</span></label>
              <button className="button button--primary" type="submit">Guardar publicidad</button>
            </form>
          </details>
        )}
      </div>
    </article>
  );
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (!getSupabaseEnv()) {
    redirect("/login?error=config");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  if (!profile?.active) {
    redirect("/login");
  }

  const [settings, categories, stories, ads, impactCards, profilesResult] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getAllStories(),
    getAllAds(),
    getImpactCards(),
    can(profile, "users") ? supabase.from("profiles").select("*").order("created_at", { ascending: false }).returns<Profile[]>() : Promise.resolve({ data: [] })
  ]);
  const profiles = profilesResult.data ?? [];
  const activeProfiles = profiles.filter((member) => member.active);
  const inactiveProfiles = profiles.length - activeProfiles.length;
  const canUseAdminUsers = hasSupabaseAdminEnv();

  return (
    <div className="admin-shell">
      <section className="admin-panel">
        <div className="admin-hero">
          <div>
            <p className="eyebrow">Panel editorial seguro</p>
            <h1>Atlas CMS</h1>
            <p className="admin-copy">
              Sesión activa como {profile.display_name || profile.email}. Los cambios se guardan en Supabase con permisos por usuario.
            </p>
          </div>
          <div className="admin-quick-actions">
            <Link className="button button--ghost" href="/">
              Ver sitio
            </Link>
            <form action={signOut}>
              <button className="button button--ghost" type="submit">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        {(params.ok || params.error) && (
          <p className="publish-feedback">
            {params.ok ? "Cambios guardados correctamente." : feedbackMessages[params.error ?? ""] ?? "No se pudo completar la acción. Revisa permisos o datos requeridos."}
          </p>
        )}

        <nav className="admin-tabs" aria-label="Secciones del panel">
          <a className="admin-tab is-active" href="#ajustes-rapidos">Ajustes rápidos</a>
          <a className="admin-tab" href="#nueva-nota">Nueva nota</a>
          <a className="admin-tab" href="#crear-publicidad">Crear publicidad</a>
          <a className="admin-tab" href="#franja-impacto">Franja de impacto</a>
          <a className="admin-tab" href="#notas-publicadas">Notas publicadas</a>
          <a className="admin-tab" href="#publicidad-activa">Publicidad activa</a>
          <a className="admin-tab" href="#importar-exportar">Importar / Exportar</a>
          <a className="admin-tab" href="#equipo-editorial">Equipo editorial</a>
        </nav>
        <AdminTabsController />

        <section id="ajustes-rapidos" className="editor-card admin-card-panel">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Configuración</p>
              <h2>Ajustes rápidos</h2>
            </div>
          </div>
          {can(profile, "settings") ? (
            <form action={updateSettings} id="settingsForm" className="settings-form">
              <input type="hidden" name="id" value={settings.id} />
              <label>
                <span>Nombre del sitio</span>
                <input name="site_name" defaultValue={settings.site_name} required />
              </label>
              <label>
                <span>Eslogan</span>
                <textarea name="tagline" defaultValue={settings.tagline} />
              </label>
              <label>
                <span>Imagen de franja de impacto</span>
                <input name="impact_background_image" defaultValue={settings.impact_background_image} placeholder="https://..." />
              </label>
              <button className="button button--primary" type="submit">Guardar ajustes</button>
            </form>
          ) : (
            <p className="empty-state">Tu usuario no tiene permiso para editar ajustes.</p>
          )}
        </section>

        <section id="nueva-nota" className="story-editor-card admin-card-panel">
          <div className="story-editor-header">
            <div>
              <p className="eyebrow">Redacción</p>
              <h2>Nueva nota</h2>
            </div>
            <span className="story-editor-icon">AP</span>
          </div>
          {can(profile, "stories") ? (
            <form action={createStory} id="storyForm" className="story-admin-form">
              <div className="form-section">
                <label>
                  <span>Título</span>
                  <input name="title" required />
                </label>
                <label>
                  <span>Resumen breve</span>
                  <textarea name="excerpt" />
                </label>
                <label>
                  <span>Contenido</span>
                  <textarea name="content" required />
                </label>
              </div>
              <div className="form-split">
                <label>
                  <span>Categoria</span>
                  <select name="category_id">
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Estado</span>
                  <select name="status" defaultValue="published">
                    <option value="published">Publicada</option>
                    <option value="draft">Borrador</option>
                    <option value="archived">Archivada</option>
                  </select>
                </label>
              </div>
              <div className="form-split form-split--media">
                <label className="image-upload-card">
                  <span className="image-upload-card__title">Subir imagen principal</span>
                  <span className="image-upload-card__copy">JPG, PNG o WebP. Máximo recomendado: 6 MB.</span>
                  <input type="file" name="image_file" accept="image/*" />
                </label>
                <label>
                  <span>O pegar URL de imagen</span>
                  <input name="image_url" placeholder="https://..." />
                </label>
              </div>
              <div className="form-split">
                <label>
                  <span>Video</span>
                  <input name="video_url" placeholder="https://..." />
                </label>
              </div>
              <div className="form-split form-split--media">
                <label className="image-upload-card">
                  <span className="image-upload-card__title">Agregar galeria de imagenes</span>
                  <span className="image-upload-card__copy">Selecciona varias fotos para que la publicacion rote imagenes de forma elegante.</span>
                  <input type="file" name="gallery_files" accept="image/*" multiple />
                </label>
                <label>
                  <span>O pegar URLs adicionales</span>
                  <textarea name="gallery_image_urls" placeholder="Una URL por linea" />
                </label>
              </div>
              <div className="form-split">
                <label>
                  <span>Fuente</span>
                  <input name="source_label" />
                </label>
                <label>
                  <span>URL de fuente</span>
                  <input name="source_url" placeholder="https://..." />
                </label>
              </div>
              <div className="form-split form-split--toggles">
                <label className="checkbox">
                  <input type="checkbox" name="featured" />
                  <span>Destacar en portada</span>
                </label>
                <label className="checkbox">
                  <input type="checkbox" name="editors_pick" />
                  <span>Selección editorial</span>
                </label>
              </div>
              <button className="button button--primary" type="submit">Publicar nota</button>
            </form>
          ) : (
            <p className="empty-state">Tu usuario no tiene permiso para crear notas.</p>
          )}
        </section>

        <section id="crear-publicidad" className="editor-card admin-card-panel">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Comercial</p>
              <h2>Crear publicidad</h2>
            </div>
          </div>
          {can(profile, "ads") ? (
            <form action={createAd} className="ad-form">
              <label><span>Etiqueta</span><input name="label" defaultValue="Publicidad" /></label>
              <label><span>Título</span><input name="title" required /></label>
              <label><span>Descripción</span><textarea name="description" /></label>
              <label className="image-upload-card">
                <span className="image-upload-card__title">Subir imagen</span>
                <span className="image-upload-card__copy">Se guardará en el bucket atlas-media.</span>
                <input type="file" name="image_file" accept="image/*" />
              </label>
              <label><span>O pegar URL de imagen</span><input name="image_url" placeholder="https://..." /></label>
              <label><span>Enlace</span><input name="url" placeholder="https://..." /></label>
              <label className="checkbox"><input type="checkbox" name="active" defaultChecked /><span>Activa</span></label>
              <button className="button button--primary" type="submit">Crear publicidad</button>
            </form>
          ) : (
            <p className="empty-state">Tu usuario no tiene permiso para crear publicidad.</p>
          )}
        </section>

        <section id="franja-impacto" className="editor-card admin-card-panel">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Portada</p>
              <h2>Franja de impacto</h2>
            </div>
          </div>
          <div className="stories-table">
            {impactCards.map((card) => (
              <form action={updateImpactCard} className="form-section" key={card.id}>
                <input type="hidden" name="id" value={card.id} />
                <label><span>Etiqueta</span><input name="label" defaultValue={card.label} disabled={!can(profile, "impact")} /></label>
                <label><span>Título</span><input name="title" defaultValue={card.title} disabled={!can(profile, "impact")} /></label>
                <label><span>Texto</span><textarea name="body" defaultValue={card.body} disabled={!can(profile, "impact")} /></label>
                <input type="hidden" name="sort_order" value={card.sort_order} />
                {can(profile, "impact") && <button className="button" type="submit">Guardar bloque</button>}
              </form>
            ))}
          </div>
        </section>

        <section id="notas-publicadas" className="editor-card admin-card-panel">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Archivo editorial</p>
              <h2>Notas publicadas</h2>
            </div>
            <span className="inline-badge inline-badge--forest">{stories.length} notas</span>
          </div>
          <div className="stories-table">
            {stories.map((story) => <StoryRow key={story.id} story={story} categories={categories} allowManage={can(profile, "stories")} />)}
          </div>
        </section>

        <section id="publicidad-activa" className="editor-card admin-card-panel">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Inventario</p>
              <h2>Publicidad activa</h2>
            </div>
          </div>
          <div className="stories-table">
            {ads.map((ad) => <AdRow key={ad.id} ad={ad} allowManage={can(profile, "ads")} />)}
          </div>
        </section>

        <section id="importar-exportar" className="editor-card admin-card-panel">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Respaldo</p>
              <h2>Importar / Exportar</h2>
            </div>
          </div>
          <div className="import-export-grid">
            <div className="import-export-card">
              <h3>Exportar copia de seguridad</h3>
              <p className="admin-copy">Descarga un JSON con notas, categorías, publicidad, ajustes y franja de impacto.</p>
              <a className="button button--primary" href="/admin/export">Descargar backup</a>
            </div>
            <form action={importBackup} className="import-export-card">
              <h3>Importar publicaciones</h3>
              <p className="admin-copy">Sube un backup JSON exportado desde Atlas, o pega el contenido manualmente. Las notas se actualizan por slug para evitar duplicados.</p>
              <BackupFileInput disabled={!can(profile, "stories")} />
              <textarea name="backup_json" placeholder='{"categories":[],"stories":[]}' />
              <button className="button" type="submit" disabled={!can(profile, "stories")}>Importar contenido</button>
            </form>
          </div>
        </section>

        <section id="equipo-editorial" className="editor-card admin-card-panel">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">Seguridad</p>
              <h2>Equipo editorial</h2>
            </div>
            {can(profile, "users") && <span className="inline-badge inline-badge--forest">{profiles.length} usuarios</span>}
          </div>
          {can(profile, "users") ? (
            <div className="editorial-team">
              <div className="editorial-team__summary">
                <article>
                  <span>Total</span>
                  <strong>{profiles.length}</strong>
                  <small>perfiles editoriales</small>
                </article>
                <article>
                  <span>Activos</span>
                  <strong>{activeProfiles.length}</strong>
                  <small>pueden ingresar</small>
                </article>
                <article>
                  <span>Inactivos</span>
                  <strong>{inactiveProfiles}</strong>
                  <small>acceso pausado</small>
                </article>
              </div>

              <div className="editorial-team__help">
                <div>
                  <p className="eyebrow">Administracion de accesos</p>
                  <h3>Crear y ordenar el equipo</h3>
                  <p className="admin-copy">
                    Desde aqui puedes crear usuarios, activar o pausar accesos, cambiar contrasenas y limitar cada cuenta por seccion.
                  </p>
                </div>
                <form action={syncEditorialUsers}>
                  <button className="button button--ghost" type="submit" disabled={!canUseAdminUsers}>
                    Sincronizar usuarios
                  </button>
                </form>
              </div>

              {!canUseAdminUsers && (
                <div className="service-role-warning">
                  <strong>Falta activar la administracion completa.</strong>
                  <p>
                    Para crear usuarios, cambiar contrasenas y sincronizar la lista desde Atlas, agrega
                    <code>SUPABASE_SERVICE_ROLE_KEY</code> en las variables de entorno de Vercel. No la subas a GitHub.
                  </p>
                  <a className="button button--ghost" href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer">
                    Abrir Supabase Auth
                  </a>
                </div>
              )}

              <form action={createEditorialUser} className="editorial-user-create">
                <div>
                  <p className="eyebrow">Nuevo usuario</p>
                  <h3>Agregar integrante editorial</h3>
                  <p className="admin-copy">Crea el acceso y define desde el inicio que partes del sitio puede administrar.</p>
                </div>
                <div className="form-split">
                  <label><span>Email de acceso</span><input type="email" name="email" placeholder="usuario@dominio.com" required disabled={!canUseAdminUsers} /></label>
                  <label><span>Nombre visible</span><input name="display_name" placeholder="Nombre y apellido" disabled={!canUseAdminUsers} /></label>
                </div>
                <div className="form-split">
                  <label><span>Contrasena inicial</span><input type="password" name="password" minLength={8} placeholder="Minimo 8 caracteres" required disabled={!canUseAdminUsers} /></label>
                  <label>
                    <span>Rol</span>
                    <select name="role" defaultValue="redactor" disabled={!canUseAdminUsers}>
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="redactor">Redactor</option>
                      <option value="publicidad">Publicidad</option>
                      <option value="revisor">Revisor</option>
                    </select>
                  </label>
                </div>
                <div className="permissions-grid">
                  {permissions.map((permission) => (
                    <label className="checkbox checkbox--stacked" key={permission.key}>
                      <input type="checkbox" name={permission.key} defaultChecked={permission.key === "stories"} disabled={!canUseAdminUsers} />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
                <div className="dashboard-actions">
                  <label className="checkbox"><input type="checkbox" name="active" defaultChecked disabled={!canUseAdminUsers} /><span>Usuario activo</span></label>
                  <button className="button button--primary" type="submit" disabled={!canUseAdminUsers}>Crear usuario</button>
                </div>
              </form>

              <div className="stories-table">
                {profiles.length === 0 && <p className="empty-state">Todavia no hay perfiles editoriales para administrar.</p>}
                {profiles.map((member) => (
                  <form action={updateProfilePermissions} className="user-form editorial-user-card" key={member.id}>
                    <input type="hidden" name="id" value={member.id} />
                    <div className="editorial-user-card__header">
                      <div>
                        <p className="eyebrow">{member.active ? "Usuario activo" : "Usuario inactivo"}</p>
                        <h3>{member.display_name || member.email}</h3>
                        <span>{member.email}</span>
                      </div>
                      <span className="inline-badge">{member.role}</span>
                    </div>
                    <div className="form-split">
                      <label><span>Nombre visible</span><input name="display_name" defaultValue={member.display_name} /></label>
                      <label>
                        <span>Rol</span>
                        <select name="role" defaultValue={member.role}>
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="redactor">Redactor</option>
                          <option value="publicidad">Publicidad</option>
                          <option value="revisor">Revisor</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      <span>Nueva contrasena</span>
                      <input type="password" name="new_password" minLength={8} placeholder="Dejar vacio para no cambiarla" disabled={!canUseAdminUsers} />
                    </label>
                    <div className="permissions-grid">
                      {permissions.map((permission) => (
                        <label className="checkbox checkbox--stacked" key={permission.key}>
                          <input type="checkbox" name={permission.key} defaultChecked={member.permissions.includes(permission.key)} />
                          <span>{permission.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="dashboard-actions">
                      <label className="checkbox"><input type="checkbox" name="active" defaultChecked={member.active} /><span>Usuario activo</span></label>
                      <button className="button" type="submit">Guardar usuario</button>
                    </div>
                  </form>
                ))}
              </div>
            </div>
          ) : (
            <p className="empty-state">Tu usuario no tiene permiso para administrar el equipo editorial.</p>
          )}
        </section>
      </section>
    </div>
  );
}
