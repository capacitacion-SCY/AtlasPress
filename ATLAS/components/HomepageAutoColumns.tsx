"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefStoryCard, CompactAdCard, CompactStoryCard } from "@/components/StoryCards";
import type { Ad, Story } from "@/lib/types";
import type { ReactNode } from "react";

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeRotationSeconds(value: number | string | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 45;
  return Math.max(10, Math.min(3600, Math.floor(numeric)));
}

function splitAutomaticStories(autoStories: Story[], cycle: number) {
  const left: Story[] = [];
  const right: Story[] = [];

  autoStories.forEach((story) => {
    const targetSide = hashString(`${story.id}:${cycle}`) % 2 === 0 ? "left" : "right";
    if (targetSide === "left") {
      left.push(story);
    } else {
      right.push(story);
    }
  });

  return { left, right };
}

export function HomepageAutoColumns({
  explicitLeftStories,
  explicitRightStories,
  automaticStories,
  ads,
  rotationSeconds,
  rightImageRotationSeconds,
  children
}: {
  explicitLeftStories: Story[];
  explicitRightStories: Story[];
  automaticStories: Story[];
  ads: Ad[];
  rotationSeconds?: number | string;
  rightImageRotationSeconds?: number | string;
  children?: ReactNode;
}) {
  const safeRotationSeconds = normalizeRotationSeconds(rotationSeconds);
  const safeAds = Array.isArray(ads) ? ads : [];
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (automaticStories.length === 0) return;
    const timer = window.setInterval(() => {
      setCycle((prev) => prev + 1);
    }, safeRotationSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [automaticStories.length, safeRotationSeconds]);

  const automaticSplit = useMemo(() => splitAutomaticStories(automaticStories, cycle), [automaticStories, cycle]);
  const leftStories = useMemo(() => [...explicitLeftStories, ...automaticSplit.left], [explicitLeftStories, automaticSplit.left]);
  const rightStories = useMemo(() => [...explicitRightStories, ...automaticSplit.right], [explicitRightStories, automaticSplit.right]);

  return (
    <>
      {leftStories.length > 0 && (
        <aside className="news-column news-column--left">
          <div id="leftColumn">{leftStories.map((story) => <BriefStoryCard key={story.id} story={story} />)}</div>
        </aside>
      )}

      {children}

      {(rightStories.length > 0 || safeAds.length > 0) && (
        <aside className="news-column news-column--right">
          <div id="rightColumn">
            {rightStories.map((story) => (
              <CompactStoryCard key={story.id} story={story} imageRotationSeconds={rightImageRotationSeconds} />
            ))}
            {safeAds.map((ad) => <CompactAdCard key={ad.id} ad={ad} />)}
          </div>
        </aside>
      )}
    </>
  );
}
