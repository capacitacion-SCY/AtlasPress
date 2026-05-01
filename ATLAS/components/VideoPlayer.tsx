"use client";

import Hls from "hls.js";
import { useEffect, useId, useMemo, useRef } from "react";
import type { VideoEmbed } from "@/lib/media";

type VideoPlayerProps = {
  className?: string;
  title: string;
  video: VideoEmbed;
  pauseWhenHidden?: boolean;
};

function withAutoplayParams(src: string) {
  try {
    const url = new URL(src);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      url.searchParams.set("autoplay", "1");
      url.searchParams.set("mute", "1");
      url.searchParams.set("playsinline", "1");
      url.searchParams.set("rel", "0");
      url.searchParams.set("enablejsapi", "1");
      url.searchParams.set("origin", window.location.origin);
    }

    if (hostname === "player.vimeo.com") {
      url.searchParams.set("autoplay", "1");
      url.searchParams.set("muted", "1");
      url.searchParams.set("playsinline", "1");
      url.searchParams.set("api", "1");
    }

    return url.toString();
  } catch {
    return src;
  }
}

export function VideoPlayer({ className, title, video, pauseWhenHidden = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeId = useId().replace(/:/g, "");
  const iframeSrc = useMemo(() => {
    if (video.type !== "iframe") return "";

    try {
      const url = new URL(withAutoplayParams(video.src));
      const hostname = url.hostname.replace(/^www\./, "");

      if (hostname === "player.vimeo.com") {
        url.searchParams.set("player_id", iframeId);
      }

      return url.toString();
    } catch {
      return withAutoplayParams(video.src);
    }
  }, [iframeId, video.src, video.type]);

  useEffect(() => {
    if (video.type !== "hls" || !videoRef.current) return;

    const player = videoRef.current;
    player.muted = true;

    if (player.canPlayType("application/vnd.apple.mpegurl")) {
      player.src = video.src;
      return;
    }

    if (!Hls.isSupported()) return;

    const hls = new Hls();
    hls.loadSource(video.src);
    hls.attachMedia(player);

    return () => hls.destroy();
  }, [video.src, video.type]);

  useEffect(() => {
    if (video.type !== "hls" || !videoRef.current) return;

    const player = videoRef.current;
    let shouldPlay = false;

    const play = () => {
      if (!shouldPlay) return;
      player.play().catch(() => {
        // Browsers can still block autoplay in strict modes; controls remain available.
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        shouldPlay = entry.isIntersecting && entry.intersectionRatio >= 0.35;

        if (shouldPlay) {
          play();
          return;
        }

        player.pause();
      },
      { threshold: [0, 0.35, 0.75] }
    );

    observer.observe(player);
    player.addEventListener("loadedmetadata", play);
    player.addEventListener("canplay", play);

    return () => {
      observer.disconnect();
      player.removeEventListener("loadedmetadata", play);
      player.removeEventListener("canplay", play);
    };
  }, [video.type]);

  useEffect(() => {
    if (video.type !== "iframe" || !iframeRef.current || !pauseWhenHidden) return;

    const frame = iframeRef.current;
    let isVisible = false;

    const postCommand = (command: "play" | "pause") => {
      const target = frame.contentWindow;
      if (!target) return;

      try {
        const url = new URL(frame.src);
        const hostname = url.hostname.replace(/^www\./, "");

        if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
          target.postMessage(
            JSON.stringify({
              event: "command",
              func: command === "play" ? "playVideo" : "pauseVideo",
              args: []
            }),
            "*"
          );
          return;
        }

        if (hostname === "player.vimeo.com") {
          target.postMessage({ method: command }, "*");
        }
      } catch {
        // Leave manual controls available if the provider URL is not usable.
      }
    };

    const syncPlayback = () => {
      postCommand(isVisible ? "play" : "pause");
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        syncPlayback();
      },
      { threshold: [0, 0.35, 0.75] }
    );

    observer.observe(frame);
    frame.addEventListener("load", syncPlayback);

    return () => {
      observer.disconnect();
      frame.removeEventListener("load", syncPlayback);
    };
  }, [pauseWhenHidden, video.type, iframeSrc]);

  if (video.type === "iframe") {
    return (
      <iframe
        ref={iframeRef}
        id={iframeId}
        className={className}
        src={iframeSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      title={title}
      controls
      autoPlay
      muted
      playsInline
      preload="auto"
    />
  );
}
