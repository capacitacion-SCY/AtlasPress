"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";
import type { VideoEmbed } from "@/lib/media";

type VideoPlayerProps = {
  className?: string;
  title: string;
  video: VideoEmbed;
};

export function VideoPlayer({ className, title, video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video.type !== "hls" || !videoRef.current) return;

    const player = videoRef.current;
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

  if (video.type === "iframe") {
    return (
      <iframe
        className={className}
        src={video.src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
      muted
      playsInline
      preload="metadata"
    />
  );
}
