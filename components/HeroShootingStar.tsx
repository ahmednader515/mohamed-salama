"use client";

import { useEffect, useState } from "react";

type StarState = {
  top: number;
  left: number;
  visible: boolean;
  key: number;
};

const STAR_TRAVEL_MS = 1300;
const STAR_COOLDOWN_MS = 5000;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function HeroShootingStar() {
  const [star, setStar] = useState<StarState>({
    top: 18,
    left: 12,
    visible: false,
    key: 0,
  });

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let nextTimer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      setStar({
        top: randomBetween(8, 42),
        left: randomBetween(4, 55),
        visible: true,
        key: Date.now(),
      });

      hideTimer = setTimeout(() => {
        setStar((prev) => ({ ...prev, visible: false }));
        nextTimer = setTimeout(trigger, STAR_COOLDOWN_MS);
      }, STAR_TRAVEL_MS);
    };

    trigger();

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      if (nextTimer) clearTimeout(nextTimer);
    };
  }, []);

  return (
    <div className="hero-night" aria-hidden>
      {star.visible ? (
        <span
          key={star.key}
          className="hero-shooting-star"
          style={{ top: `${star.top}%`, left: `${star.left}%` }}
        />
      ) : null}
    </div>
  );
}
