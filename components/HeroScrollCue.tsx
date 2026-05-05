"use client";

import { useEffect, useState } from "react";

export function HeroScrollCue() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const SCROLL_HIDE_THRESHOLD = 40;
    const handleScroll = () => {
      setIsVisible(window.scrollY <= SCROLL_HIDE_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    const nextSection = document.getElementById("home-next-section");
    if (!nextSection) return;
    nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`hero-scroll-cue absolute bottom-20 left-1/2 z-20 -translate-x-1/2 ${
        isVisible ? "hero-scroll-cue-visible" : "hero-scroll-cue-hidden"
      }`}
      aria-label="النزول إلى القسم التالي"
    >
      <span className="hero-scroll-chevron" />
      <span className="hero-scroll-chevron" />
      <span className="hero-scroll-chevron" />
    </button>
  );
}
