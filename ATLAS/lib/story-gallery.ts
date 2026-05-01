const galleryMarkerPattern = /\s*<!-- atlas-gallery:([\s\S]*?) -->\s*$/;
const videoMarkerPattern = /\s*<!-- atlas-videos:([\s\S]*?) -->\s*$/;

function cleanMediaList(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function removeMediaMarkers(content: string) {
  return content.replace(galleryMarkerPattern, "").replace(videoMarkerPattern, "").trim();
}

function parseMarker(content: string, pattern: RegExp) {
  const match = content.match(pattern);
  if (!match) return [];

  try {
    return cleanMediaList(JSON.parse(match[1]));
  } catch {
    return [];
  }
}

export function extractEmbeddedGallery(content: string) {
  const galleryImages = parseMarker(content, galleryMarkerPattern);
  const cleanContent = removeMediaMarkers(content);

  return {
    content: cleanContent,
    galleryImages
  };
}

export function extractEmbeddedVideos(content: string) {
  const galleryVideos = parseMarker(content, videoMarkerPattern);
  const cleanContent = removeMediaMarkers(content);

  return {
    content: cleanContent,
    galleryVideos
  };
}

export function extractEmbeddedMedia(content: string) {
  const galleryImages = parseMarker(content, galleryMarkerPattern);
  const galleryVideos = parseMarker(content, videoMarkerPattern);
  const cleanContent = removeMediaMarkers(content);

  return {
    content: cleanContent,
    galleryImages,
    galleryVideos
  };
}

export function embedMediaInContent(content: string, images: unknown, videos: unknown) {
  const galleryImages = cleanMediaList(images);
  const galleryVideos = cleanMediaList(videos);
  const cleanContent = removeMediaMarkers(content);
  const markers: string[] = [];

  if (galleryImages.length > 0) {
    markers.push(`<!-- atlas-gallery:${JSON.stringify(galleryImages)} -->`);
  }

  if (galleryVideos.length > 0) {
    markers.push(`<!-- atlas-videos:${JSON.stringify(galleryVideos)} -->`);
  }

  if (markers.length === 0) {
    return cleanContent;
  }

  return `${cleanContent}\n\n${markers.join("\n")}`;
}

export function embedGalleryInContent(content: string, images: unknown) {
  const embedded = extractEmbeddedMedia(content);
  return embedMediaInContent(embedded.content, images, embedded.galleryVideos);
}

export function normalizeStoryGallery<
  T extends { content: string; gallery_images?: string[] | null; gallery_videos?: string[] | null }
>(story: T): T {
  const embedded = extractEmbeddedMedia(story.content || "");
  const existingGallery = cleanMediaList(story.gallery_images);
  const existingVideos = cleanMediaList(story.gallery_videos);

  return {
    ...story,
    content: embedded.content,
    gallery_images: existingGallery.length > 0 ? existingGallery : embedded.galleryImages,
    gallery_videos: existingVideos.length > 0 ? existingVideos : embedded.galleryVideos
  };
}

export function normalizeStoriesGallery<
  T extends { content: string; gallery_images?: string[] | null; gallery_videos?: string[] | null }
>(stories: T[]) {
  return stories.map((story) => normalizeStoryGallery(story));
}
