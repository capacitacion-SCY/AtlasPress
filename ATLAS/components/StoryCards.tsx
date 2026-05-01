import Link from "next/link";
import { RotatingStoryImage } from "@/components/RotatingStoryImage";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { Ad, Story } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { getVideoEmbed } from "@/lib/media";

function storyImages(story: Story) {
  return [story.image_url, ...(story.gallery_images ?? [])].filter(Boolean);
}

function storyVideos(story: Story) {
  return [story.video_url, ...(story.gallery_videos ?? [])].filter(Boolean);
}

function cardExcerpt(value: string, maxLength = 220) {
  const firstParagraph = value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean) ?? "";
  const normalized = firstParagraph.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clipped = normalized.slice(0, maxLength + 1);
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("? "), clipped.lastIndexOf("! "));
  const wordEnd = clipped.lastIndexOf(" ");
  const cutAt = sentenceEnd >= 90 ? sentenceEnd + 1 : wordEnd > 90 ? wordEnd : maxLength;

  return `${normalized.slice(0, cutAt).trim()}...`;
}

export function BriefStoryCard({ story }: { story: Story }) {
  const excerpt = cardExcerpt(story.excerpt, 190);

  return (
    <article className="brief-card" data-category={story.categories?.slug}>
      <p className="eyebrow">{story.categories?.name ?? "Historias"}</p>
      <h3>{story.title}</h3>
      <p className="story-excerpt">{excerpt}</p>
      <Link className="read-more-link" href={`/article/${story.slug}`}>
        Leer más
      </Link>
    </article>
  );
}

export function FeatureStoryCard({
  story,
  index = 0,
  imageRotationSeconds
}: {
  story: Story;
  index?: number;
  imageRotationSeconds?: number | string;
}) {
  const sideClass = index % 2 === 0 ? "feature-story--text-right" : "feature-story--text-left";
  const images = storyImages(story);
  const video = getVideoEmbed(storyVideos(story)[0] || "");
  const isYouTubeVideo = Boolean(video?.type === "iframe" && /youtube\.com|youtube-nocookie\.com/.test(video.src));
  const excerpt = cardExcerpt(story.excerpt, 230);

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
          <VideoPlayer video={video} title={story.title} pauseWhenHidden={isYouTubeVideo} />
          <Link className="compact-story__video-overlay" href={`/article/${story.slug}`} aria-label={story.title} />
        </div>
      ) : (
        <Link className="feature-story__media" href={`/article/${story.slug}`}>
          <RotatingStoryImage
            images={images}
            alt={story.title}
            imageClassName="feature-story__img"
            fallbackClassName="feature-story__fallback"
            fallbackText="Imagen no disponible"
            rotationSeconds={imageRotationSeconds}
          />
        </Link>
      )}
      <div className="feature-story__body">
        <div className="feature-story__flow">
          <p className="story-excerpt feature-story__text-block">{excerpt}</p>
          <Link className="read-more-link feature-story__text-block" href={`/article/${story.slug}`}>
            Leer más
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CompactStoryCard({ story, imageRotationSeconds }: { story: Story; imageRotationSeconds?: number | string }) {
  const images = storyImages(story);
  const video = getVideoEmbed(storyVideos(story)[0] || "");
  const isYouTubeCompactVideo = Boolean(video?.type === "iframe" && /youtube\.com|youtube-nocookie\.com/.test(video.src));
  const excerpt = cardExcerpt(story.excerpt, 170);

  if (video) {
    return (
      <article className="compact-story compact-story--video compact-story--video-link" data-category={story.categories?.slug}>
        <p className="eyebrow compact-story__kicker">{story.categories?.name ?? "Historias"}</p>
        <div className="compact-story__thumb compact-story__video">
          <VideoPlayer video={video} title={story.title} pauseWhenHidden={isYouTubeCompactVideo} />
          <Link className="compact-story__video-overlay" href={`/article/${story.slug}`} aria-label={story.title} />
        </div>
      </article>
    );
  }

  return (
    <article className="compact-story" data-category={story.categories?.slug}>
      <p className="eyebrow compact-story__kicker">{story.categories?.name ?? "Historias"}</p>
      <Link className="compact-story__thumb" href={`/article/${story.slug}`}>
        <RotatingStoryImage
          images={images}
          alt={story.title}
          imageClassName="compact-story__img"
          fallbackClassName="compact-story__fallback"
          fallbackText="Foto"
          rotationSeconds={imageRotationSeconds}
        />
      </Link>
      <div className="compact-story__body">
        <h3>
          <Link href={`/article/${story.slug}`}>{story.title}</Link>
        </h3>
        <p className="story-excerpt">{excerpt}</p>
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
