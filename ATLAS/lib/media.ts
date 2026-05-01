export type VideoEmbed = {
  src: string;
  type: "iframe" | "hls";
};

const scientologyAnthemStream = "https://www.scientology.tv/video-playback/scientology-anthem-tv_90sec_en/master.m3u8";
const scientologyPageStreamMap: Record<string, string> = {
  "/": "https://stream6.scientology.org/master.m3u8",
  "/es/films/dianetics/what-is-dianetics.html": "https://www.scientology.tv/video-playback/lrh-article-what-is-dianetics_article_es/master.m3u8",
  "/es-es/films/dianetics/what-is-dianetics.html": "https://www.scientology.tv/video-playback/lrh-article-what-is-dianetics_article_es-es/master.m3u8",
  "/films/dianetics/what-is-dianetics.html": "https://www.scientology.tv/video-playback/lrh-article-what-is-dianetics_article_en/master.m3u8",
  "/es/films-on-scientology-principles/problems-of-work.html": "https://www.scientology.tv/video-playback/the-problems-of-work_tv-program_es/master.m3u8",
  "/es-es/films-on-scientology-principles/problems-of-work.html": "https://www.scientology.tv/video-playback/the-problems-of-work_tv-program_es-es/master.m3u8",
  "/films-on-scientology-principles/problems-of-work.html": "https://www.scientology.tv/video-playback/the-problems-of-work_tv-program_en/master.m3u8"
};

function normalizeUrlWithoutSearch(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function getVideoEmbed(rawUrl: string): VideoEmbed | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (url.pathname.endsWith(".m3u8")) {
      return { src: url.toString(), type: "hls" };
    }

    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? { src: `https://www.youtube.com/embed/${id}`, type: "iframe" } : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return { src: `https://www.youtube.com/embed/${id}`, type: "iframe" };
      if (url.pathname.startsWith("/embed/")) return { src: url.toString(), type: "iframe" };
      if (url.pathname.startsWith("/shorts/")) {
        const shortId = url.pathname.split("/").filter(Boolean)[1];
        return shortId ? { src: `https://www.youtube.com/embed/${shortId}`, type: "iframe" } : null;
      }
    }

    if (hostname === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? { src: `https://player.vimeo.com/video/${id}`, type: "iframe" } : null;
    }

    if (hostname === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
      return { src: url.toString(), type: "iframe" };
    }

    if (hostname === "scientology.tv" || hostname.endsWith(".scientology.tv")) {
      if (url.pathname.startsWith("/video-playback/")) {
        return { src: url.toString(), type: "hls" };
      }

      const mappedStream = scientologyPageStreamMap[url.pathname.toLowerCase()];
      if (mappedStream) {
        return { src: mappedStream, type: "hls" };
      }

      url.searchParams.set("iframe", "1");
      return { src: url.toString(), type: "iframe" };
    }
  } catch {
    return null;
  }

  return null;
}

export function getEmbeddableVideoUrl(rawUrl: string) {
  const embed = getVideoEmbed(rawUrl);
  return embed?.src ?? "";
}

export function getVideoThumbnailUrl(rawUrl: string) {
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtube-nocookie.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

      const parts = url.pathname.split("/").filter(Boolean);
      if ((parts[0] === "embed" || parts[0] === "shorts") && parts[1]) {
        return `https://img.youtube.com/vi/${parts[1]}/hqdefault.jpg`;
      }
    }
  } catch {
    return "";
  }

  return "";
}

export function getHlsPreviewEmbedUrl(rawUrl: string) {
  if (!rawUrl) return "";

  const normalizedInput = normalizeUrlWithoutSearch(rawUrl);

  for (const [path, streamUrl] of Object.entries(scientologyPageStreamMap)) {
    if (normalizeUrlWithoutSearch(streamUrl) === normalizedInput) {
      const previewUrl = new URL(`https://www.scientology.tv${path}`);
      previewUrl.searchParams.set("iframe", "1");
      previewUrl.searchParams.set("autoplay", "0");
      previewUrl.searchParams.set("mute", "1");
      previewUrl.searchParams.set("controls", "0");
      previewUrl.searchParams.set("playsinline", "1");
      return previewUrl.toString();
    }
  }

  if (normalizeUrlWithoutSearch(scientologyAnthemStream) === normalizedInput) {
    const fallback = new URL("https://www.scientology.tv/es/");
    fallback.searchParams.set("iframe", "1");
    fallback.searchParams.set("autoplay", "0");
    fallback.searchParams.set("mute", "1");
    fallback.searchParams.set("controls", "0");
    fallback.searchParams.set("playsinline", "1");
    return fallback.toString();
  }

  return "";
}
