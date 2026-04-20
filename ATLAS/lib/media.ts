export type VideoEmbed = {
  src: string;
  type: "iframe" | "hls";
};

const scientologyAnthemStream = "https://www.scientology.tv/video-playback/scientology-anthem-tv_90sec_en/master.m3u8";

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

      return { src: scientologyAnthemStream, type: "hls" };
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
