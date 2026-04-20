import Link from "next/link";
import { RotatingStoryImage } from "@/components/RotatingStoryImage";
import { SiteHeader } from "@/components/SiteHeader";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getCategories, getSiteSettings, getStoryBySlug } from "@/lib/content";
import { formatDate, splitParagraphs } from "@/lib/format";
import { getVideoEmbed } from "@/lib/media";

export default async function ArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [settings, categories, story] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getStoryBySlug(slug)
  ]);
  const storyImages = [story.image_url, ...(story.gallery_images ?? [])].filter(Boolean);
  const video = getVideoEmbed(story.video_url);
  const articleMedia = video ? (
    <div className="article-cover article-cover__video">
      <VideoPlayer video={video} title={story.title} />
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
      <main className="article-layout" id="articleView">
        <article className="article-content">
          <div className="article-media">{articleMedia}</div>
          <header className="article-hero">
            <p className="eyebrow">{story.categories?.name ?? "Historias"}</p>
            <h1 className="article-title">{story.title}</h1>
            <p className="story-excerpt">{story.excerpt}</p>
          </header>
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
        </article>
        <Link className="back-link" href="/">
          Volver a la portada
        </Link>
      </main>
    </div>
  );
}
