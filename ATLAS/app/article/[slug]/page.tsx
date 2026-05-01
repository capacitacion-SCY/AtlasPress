import Link from "next/link";
import { RotatingStoryImage } from "@/components/RotatingStoryImage";
import { SiteHeader } from "@/components/SiteHeader";
import { CompactStoryCard } from "@/components/StoryCards";
import { StoryVideoRotator } from "@/components/StoryVideoRotator";
import { getCategories, getPublishedStories, getSiteSettings, getStoryBySlug } from "@/lib/content";
import { formatDate, splitParagraphs } from "@/lib/format";
import { getVideoEmbed } from "@/lib/media";

export default async function ArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [settings, categories, story, publishedStories] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getStoryBySlug(slug),
    getPublishedStories()
  ]);
  const storyImages = [story.image_url, ...(story.gallery_images ?? [])].filter(Boolean);
  const storyVideos = [story.video_url, ...(story.gallery_videos ?? [])].filter(Boolean);
  const video = getVideoEmbed(storyVideos[0] || "");
  const hasVideoGallery = storyVideos.length > 1;
  const hasImageGallery = !video && storyImages.length > 1;
  const hasMediaGallery = hasVideoGallery || hasImageGallery;
  const relatedStories = publishedStories
    .filter((candidate) => candidate.id !== story.id && candidate.categories?.slug === story.categories?.slug)
    .slice(0, 6);
  const recommendedStories = publishedStories.filter((candidate) => candidate.id !== story.id).slice(0, 6);
  const sidebarStories = relatedStories.length > 0 ? relatedStories : recommendedStories;
  const sidebarTitle = relatedStories.length > 0 ? `Mas sobre ${story.categories?.name ?? "esta historia"}` : "Tambien para leer";
  const sidebarEyebrow = relatedStories.length > 0 ? "Relacionadas" : "Recomendaciones";
  const articleMedia = video ? (
    <div className="article-cover">
      <StoryVideoRotator title={story.title} videoUrls={storyVideos} thumbsTargetId={hasVideoGallery ? "articleMediaGalleryRail" : undefined} />
    </div>
  ) : storyImages.length > 0 ? (
    <div className="article-cover">
      <RotatingStoryImage
        images={storyImages}
        alt={story.title}
        imageClassName="article-cover__img"
        fallbackClassName="image-slot image-slot--empty"
        fallbackText="Imagen no disponible"
        rotate={false}
        showThumbnails
        thumbsTargetId={hasImageGallery ? "articleMediaGalleryRail" : undefined}
      />
    </div>
  ) : (
    <div className="article-cover article-cover--link">
      <span className="image-slot image-slot--empty">
        <span>{story.title}</span>
        <strong>Imagen no disponible</strong>
      </span>
    </div>
  );

  return (
    <div className="site-shell">
      <SiteHeader settings={settings} categories={categories} />
      <main className={`article-layout ${sidebarStories.length > 0 ? "article-layout--with-sidebar" : "article-layout--single"}`} id="articleView">
        <article className={`article-content ${hasMediaGallery ? "article-content--with-media-gallery" : ""}`}>
          <header className="article-hero">
            <p className="eyebrow">{story.categories?.name ?? "Historias"}</p>
            <h1 className="article-title">{story.title}</h1>
            <p className="story-excerpt">{story.excerpt}</p>
          </header>
          <div className="article-media">{articleMedia}</div>
          {hasMediaGallery && (
            <aside id="articleMediaGalleryRail" className="article-media-gallery-rail" aria-label={hasVideoGallery ? "Galeria de videos" : "Galeria de imagenes"} />
          )}
          <section className="article-body">
            {splitParagraphs(story.content).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
          <footer className="article-footer-meta">
            <div className="story-meta meta-line">
              <span>{story.author_name}</span>
              <span>{formatDate(story.published_at)}</span>
            </div>
            {story.source_url && (
              <p className="meta-line">
                Fuente base:{" "}
                <a href={story.source_url} target="_blank" rel="noreferrer">
                  {story.source_label || "Ver fuente"}
                </a>
              </p>
            )}
          </footer>
          <Link className="back-link" href="/">
            Volver a la portada
          </Link>
        </article>
        {sidebarStories.length > 0 && (
          <aside className="article-sidebar" aria-label={sidebarTitle}>
            <div className="article-sidebar__heading">
              <p className="eyebrow">{sidebarEyebrow}</p>
              <h2>{sidebarTitle}</h2>
            </div>
            <div className="article-sidebar__grid">
              {sidebarStories.map((sidebarStory) => (
                <CompactStoryCard key={sidebarStory.id} story={sidebarStory} />
              ))}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
