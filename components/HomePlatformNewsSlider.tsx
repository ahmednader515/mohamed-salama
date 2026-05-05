"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlatformNewsItem } from "@/lib/types";

const AUTO_MS = 5000;

export function HomePlatformNewsSlider({ items }: { items: PlatformNewsItem[] }) {
  const slides = useMemo(
    () =>
      items
        .map((s) => ({
          id: s.id,
          src: String(s.imageUrl).trim(),
          text: String(s.description).trim(),
        }))
        .filter((s) => Boolean(s.src) && Boolean(s.text)),
    [items],
  );
  const [active, setActive] = useState(0);
  const canSlide = slides.length > 1;

  useEffect(() => {
    setActive(0);
  }, [slides.length]);

  useEffect(() => {
    if (!canSlide) return;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [canSlide, slides.length]);

  if (slides.length === 0) return null;

  const goPrev = () => setActive((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setActive((prev) => (prev + 1) % slides.length);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black/5 shadow-[var(--shadow-card)]">
      <div className="relative aspect-[16/9] w-full min-h-[200px] sm:min-h-[280px]">
        {slides.map((slide, idx) => (
          <img
            key={slide.id}
            src={slide.src}
            alt=""
            className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-500 ease-out ${
              idx === active ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={idx !== active}
          />
        ))}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 z-20 p-4 pb-10 sm:p-6 sm:pb-12">
          {slides.map((slide, idx) => (
            <p
              key={slide.id}
              className={`text-lg font-bold leading-snug text-white drop-shadow sm:text-xl ${
                idx === active ? "block" : "hidden"
              }`}
            >
              {slide.text}
            </p>
          ))}
        </div>

        {canSlide ? (
          <>
            <button
              type="button"
              aria-label="الخبر السابق"
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded border border-white/30 bg-transparent text-2xl font-bold leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] transition hover:opacity-90"
            >
              <span aria-hidden className="-translate-x-[1px]">
                ›
              </span>
            </button>
            <button
              type="button"
              aria-label="الخبر التالي"
              onClick={goNext}
              className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded border border-white/30 bg-transparent text-2xl font-bold leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] transition hover:opacity-90"
            >
              <span aria-hidden className="translate-x-[1px]">
                ‹
              </span>
            </button>
          </>
        ) : null}

        {canSlide ? (
          <div
            className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5"
            role="tablist"
            aria-label="مؤشرات الأخبار"
          >
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={idx === active}
                aria-label={`الخبر ${idx + 1}`}
                onClick={() => setActive(idx)}
                className={`rounded-full transition ${
                  idx === active
                    ? "h-2.5 w-2.5 bg-white"
                    : "h-1.5 w-1.5 bg-white/40 hover:bg-white/65"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
