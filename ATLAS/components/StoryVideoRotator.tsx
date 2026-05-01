"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getHlsPreviewEmbedUrl, getVideoEmbed } from "@/lib/media";

type StoryVideoRotatorProps = {
  title: string;
  videoUrls: string[];
  className?: string;
  thumbsTargetId?: string;
};

export function StoryVideoRotator({ title, videoUrls, className = "article-cover__video", thumbsTargetId }: StoryVideoRotatorProps) {
  const sanitizedUrls = useMemo(() => videoUrls.map((url) => url.trim()).filter(Boolean), [videoUrls]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [thumbsTarget, setThumbsTarget] = useState<HTMLElement | null>(null);
  const activeUrl = sanitizedUrls[activeIndex] || "";
  const activeVideo = getVideoEmbed(activeUrl);

  useEffect(() => {
    if (!thumbsTargetId) {
      setThumbsTarget(null);
      return;
    }

    setThumbsTarget(document.getElementById(thumbsTargetId));
  }, [thumbsTargetId]);

  if (!activeVideo) {
    return null;
  }

  const thumbsNode = sanitizedUrls.length > 1 ? (
    <span className="story-image-rotator__thumbs" aria-label="Videos adicionales">
      {sanitizedUrls.map((url, index) => {
        const thumbVideo = getVideoEmbed(url);
        const isActive = index === activeIndex;

        return (
          <button
            key={`${url}-${index}`}
            type="button"
            className="story-image-rotator__thumb story-video-rotator__thumb"
            onClick={() => setActiveIndex(index)}
            aria-pressed={isActive}
            aria-label={`Ver video adicional ${index + 1}`}
          >
            {thumbVideo?.type === "hls" ? (
              getHlsPreviewEmbedUrl(thumbVideo.src) ? (
                <iframe
                  src={getHlsPreviewEmbedUrl(thumbVideo.src)}
                  className="story-video-rotator__preview"
                  title={`Preview video ${index + 1}`}
                  aria-hidden="true"
                  tabIndex={-1}
                />
              ) : (
                <span className="story-video-rotator__thumb-label">Video {index + 1}</span>
              )
            ) : thumbVideo?.type === "iframe" ? (
              <iframe
                src={`${thumbVideo.src}${thumbVideo.src.includes("?") ? "&" : "?"}autoplay=0&mute=1&controls=0&playsinline=1`}
                className="story-video-rotator__preview"
                title={`Preview video ${index + 1}`}
                aria-hidden="true"
                tabIndex={-1}
              />
            ) : (
              <span className="story-video-rotator__thumb-label">Video {index + 1}</span>
            )}
          </button>
        );
      })}
    </span>
  ) : null;

  return (
    <>
      <span className="story-image-rotator story-video-rotator">
        <span className="story-image-rotator__img story-video-rotator__stage">
          <div className={className}>
            <VideoPlayer video={activeVideo} title={title} />
          </div>
        </span>
        {!thumbsTargetId && thumbsNode}
      </span>
      {thumbsTargetId && thumbsTarget && thumbsNode ? createPortal(thumbsNode, thumbsTarget) : null}
    </>
  );
}
