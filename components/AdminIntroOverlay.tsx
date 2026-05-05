"use client";

import { useEffect, useState } from "react";

const HIDE_DELAY_MS = 2325;

export function AdminIntroOverlay() {
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const raf = requestAnimationFrame(() => {
      setLoaded(true);
      hideTimer = setTimeout(() => setHidden(true), HIDE_DELAY_MS);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className={`admin-intro-loader ${loaded ? "loaded" : ""}`} aria-hidden>
      <div className="admin-intro-stripe" />
      <div className="admin-intro-stripe" />
      <div className="admin-intro-stripe" />
      <div className="admin-intro-stripe" />

      <div className="admin-intro-claim">
        <span>مرحبًا</span>
        <span>أدمن</span>
        <span>المنصة</span>
      </div>
    </div>
  );
}
