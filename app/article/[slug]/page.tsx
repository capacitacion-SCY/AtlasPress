import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getCategories, getSiteSettings, getStoryBySlug } from "@/lib/content";
import { formatDate, splitParagraphs } from "@/lib/format";

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

  return (
    <div className="site-shell">
      <SiteHeader settings={settings} categories={categories} />
      <main className="article-layout" id="articleView">
        <section className="article-hero">
          <div>
            <p className="eyebrow">{story.categories?.name ?? "Historias"}</p>
            <h1 className="article-title">{story.title}</h1>
            <p className="story-excerpt">{story.excerpt}</p>
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
          </div>
          {story.image_url ? (
            <div className="article-cover">
              <img className="article-cover__img" src={story.image_url} alt={story.title} />
            </div>
          ) : (
            <div className="article-cover article-cover--link">
              <span className="image-slot image-slot--empty">
                <span>{story.title}</span>
                <strong>Imagen no disponible</strong>
              </span>
            </div>
          )}
        </section>
        <section className="article-body">
          {splitParagraphs(story.content).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
        <Link className="back-link" href="/">
          Volver a la portada
        </Link>
      </main>
    </div>
  );
}
