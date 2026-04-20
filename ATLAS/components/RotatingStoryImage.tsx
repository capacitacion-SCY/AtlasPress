"use client";

import { useEffect, useState } from "react";

type RotatingStoryImageProps = {
  alt: string;
  fallbackClassName: string;
  fallbackText: string;
  imageClassName: string;
  images: string[];
  rotate?: boolean;
  showThumbnails?: boolean;
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
  showThumbnails = false
}: RotatingStoryImageProps) {
  const cleanImages = Array.from(new Set(images.filter(Boolean)));
  const thumbnailImages = cleanImages.slice(1);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(rotate ? randomIndex(cleanImages.length) : 0);
  }, [cleanImages.length, rotate]);

  useEffect(() => {
    if (!rotate || cleanImages.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => randomIndex(cleanImages.length, currentIndex));
    }, 5200);

    return () => window.clearInterval(interval);
  }, [cleanImages.length, rotate]);

  if (cleanImages.length === 0) {
    return <span className={fallbackClassName}>{fallbackText}</span>;
  }

  return (
    <span className="story-image-rotator">
      <img key={cleanImages[activeIndex]} className={`${imageClassName} story-image-rotator__img`} src={cleanImages[activeIndex]} alt={alt} />
      {showThumbnails && thumbnailImages.length > 0 && (
        <span className="story-image-rotator__thumbs" aria-label="Imagenes adicionales">
          {thumbnailImages.map((image, index) => {
            const imageIndex = index + 1;
            return (
              <button
                key={image}
                type="button"
                className="story-image-rotator__thumb"
                aria-label={`Ver imagen adicional ${imageIndex}`}
                aria-pressed={activeIndex === imageIndex}
                onClick={() => setActiveIndex(imageIndex)}
              >
                <img src={image} alt="" />
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}
