"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type RotatingStoryImageProps = {
  alt: string;
  fallbackClassName: string;
  fallbackText: string;
  imageClassName: string;
  images: string[];
  rotate?: boolean;
  rotationSeconds?: number | string;
  showThumbnails?: boolean;
  thumbsTargetId?: string;
};

function randomIndex(length: number, previousIndex?: number) {
  if (length <= 1) return 0;

  let nextIndex = Math.floor(Math.random() * length);
  if (nextIndex === previousIndex) {
    nextIndex = (nextIndex + 1) % length;
  }

  return nextIndex;
}

export function RotatingStoryImage({
  alt,
  fallbackClassName,
  fallbackText,
  imageClassName,
  images,
  rotate = true,
  rotationSeconds = 5,
  showThumbnails = false,
  thumbsTargetId
}: RotatingStoryImageProps) {
  const cleanImages = Array.from(new Set(images.filter(Boolean)));
  const thumbnailImages = cleanImages.slice(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [orientationByImage, setOrientationByImage] = useState<Record<string, "landscape" | "portrait" | "square">>({});
  const [thumbsTarget, setThumbsTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActiveIndex(rotate ? randomIndex(cleanImages.length) : 0);
  }, [cleanImages.length, rotate]);

  useEffect(() => {
    if (!rotate || cleanImages.length <= 1) return;
    const numericRotationSeconds = Number(rotationSeconds);
    const safeRotationSeconds = Number.isFinite(numericRotationSeconds)
      ? Math.max(2, Math.min(120, Math.floor(numericRotationSeconds)))
      : 5;

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => randomIndex(cleanImages.length, currentIndex));
    }, safeRotationSeconds * 1000);

    return () => window.clearInterval(interval);
  }, [cleanImages.length, rotate, rotationSeconds]);

  useEffect(() => {
    if (!thumbsTargetId) {
      setThumbsTarget(null);
      return;
    }

    setThumbsTarget(document.getElementById(thumbsTargetId));
  }, [thumbsTargetId]);

  if (cleanImages.length === 0) {
    return <span className={fallbackClassName}>{fallbackText}</span>;
  }

  const activeImage = cleanImages[activeIndex];
  const activeOrientation = orientationByImage[activeImage];
  const orientationClass = activeOrientation ? ` story-image-rotator--${activeOrientation}` : "";

  const thumbnails = showThumbnails && thumbnailImages.length > 0 ? (
    <span className="story-image-rotator__thumbs" aria-label="Imagenes adicionales">
      {thumbnailImages.map((image, index) => {
        const imageIndex = index + 1;
        const thumbOrientation = orientationByImage[image];
        const thumbOrientationClass = thumbOrientation ? ` story-image-rotator__thumb--${thumbOrientation}` : "";
        return (
          <button
            key={image}
            type="button"
            className={`story-image-rotator__thumb${thumbOrientationClass}`}
            aria-label={`Ver imagen adicional ${imageIndex}`}
            aria-pressed={activeIndex === imageIndex}
            onClick={() => setActiveIndex(imageIndex)}
          >
            <img
              src={image}
              alt=""
              onLoad={(event) => {
                const thumbnail = event.currentTarget;
                const orientation =
                  Math.abs(thumbnail.naturalWidth - thumbnail.naturalHeight) < 24
                    ? "square"
                    : thumbnail.naturalHeight > thumbnail.naturalWidth
                      ? "portrait"
                      : "landscape";

                setOrientationByImage((current) => (current[image] === orientation ? current : { ...current, [image]: orientation }));
              }}
            />
          </button>
        );
      })}
    </span>
  ) : null;

  return (
    <>
      <span className={`story-image-rotator${orientationClass}`}>
        <img
          key={activeImage}
          className={`${imageClassName} story-image-rotator__img`}
          src={activeImage}
          alt={alt}
          onLoad={(event) => {
            const image = event.currentTarget;
            const orientation =
              Math.abs(image.naturalWidth - image.naturalHeight) < 24
                ? "square"
                : image.naturalHeight > image.naturalWidth
                  ? "portrait"
                  : "landscape";

            setOrientationByImage((current) => (current[activeImage] === orientation ? current : { ...current, [activeImage]: orientation }));
          }}
        />
        {!thumbsTargetId && thumbnails}
      </span>
      {thumbsTargetId && thumbsTarget && thumbnails ? createPortal(thumbnails, thumbsTarget) : null}
    </>
  );
}
