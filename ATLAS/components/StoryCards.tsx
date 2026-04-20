import Link from "next/link";
import { RotatingStoryImage } from "@/components/RotatingStoryImage";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { Ad, Story } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { getVideoEmbed } from "@/lib/media";

function storyImages(story: Story) {
  return [story.image_url, ...(story.gallery_images ?? [])].filter(Boolean);
}

export function BriefStoryCard({ story }: { story: Story }) {
  return (
    <article className="brief-card" data-category={story.categories?.slug}>
      <p className="eyebrow">{story.categories?.name ?? "Historias"}</p>
      <h3>{story.title}</h3>
      <p className="story-excerpt">{story.excerpt}</p>
      <Link className="read-more-link" href={`/article/${story.slug}`}>
        Leer más
      </Link>
    </article>
  );
}

export function FeatureStoryCard({ story, index = 0 }: { story: Story; index?: number }) {
  const sideClass = index % 2 === 0 ? "feature-story--text-right" : "feature-story--text-left";
  const images = storyImages(story);
  const video = getVideoEmbed(story.video_url);

  return (
    <article className={`feature-story feature-story--landscape ${sideClass} ${video ? "feature-story--video" : ""}`} data-category={story.categories?.slug}>
      <p className="eyebrow feature-story__kicker">{story.categories?.name ?? "Historias"}</p>
      <div className="feature-story__intro">
        <h2>
          <Link href={`/article/${story.slug}`}>{story.title}</Link>
        </h2>
        <p className="meta-line">
          {story.author_name} - {formatDate(story.published_at)}
        </p>
      </div>
      {video ? (
        <div className="feature-story__media feature-story__video">
          <VideoPlayer video={video} title={story.title} />
        </div>
      ) : (
        <Link className="feature-story__media" href={`/article/${story.slug}`}>
          <RotatingStoryImage
            images={images}
            alt={story.title}
            imageClassName="feature-story__img"
            fallbackClassName="feature-story__fallback"
            fallbackText="Imagen no disponible"
          />
        </Link>
      )}
      <div className="feature-story__body">
        <div className="feature-story__flow">
          <p className="story-excerpt">{story.excerpt}</p>
          <Link className="read-more-link" href={`/article/${story.slug}`}>
            Leer más
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CompactStoryCard({ story }: { story: Story }) {
  const images = storyImages(story);
  const video = getVideoEmbed(story.video_url);

  return (
    <article className={`compact-story ${video ? "compact-story--video" : ""}`} data-category={story.categories?.slug}>
      <p className="eyebrow compact-story__kicker">{story.categories?.name ?? "Historias"}</p>
      {video ? (
        <div className="compact-story__thumb compact-story__video">
          <VideoPlayer video={video} title={story.title} />
        </div>
      ) : (
        <Link className="compact-story__thumb" href={`/article/${story.slug}`}>
          <RotatingStoryImage
            images={images}
            alt={story.title}
            imageClassName="compact-story__img"
            fallbackClassName="compact-story__fallback"
            fallbackText="Foto"
          />
        </Link>
      )}
      <div className="compact-story__body">
        <h3>
          <Link href={`/article/${story.slug}`}>{story.title}</Link>
        </h3>
        <p className="story-excerpt">{story.excerpt}</p>
        <Link className="read-more-link" href={`/article/${story.slug}`}>
          Leer más
        </Link>
      </div>
    </article>
  );
}

export function CompactAdCard({ ad }: { ad: Ad }) {
  return (
    <article className="compact-ad">
      <p className="eyebrow compact-ad__kicker">{ad.label}</p>
      <a className="compact-ad__thumb" href={ad.url || "#"} target="_blank" rel="noreferrer">
        {ad.image_url ? <img className="compact-ad__img" src={ad.image_url} alt={ad.title} /> : <span className="compact-ad__fallback">Ad</span>}
      </a>
      <div className="compact-ad__body">
        <h3>
          <a href={ad.url || "#"} target="_blank" rel="noreferrer">
            {ad.title}
          </a>
        </h3>
        <p className="story-excerpt">{ad.description}</p>
        {ad.url && (
          <a className="read-more-link" href={ad.url} target="_blank" rel="noreferrer">
            Abrir enlace
          </a>
        )}
      </div>
    </article>
  );
}
