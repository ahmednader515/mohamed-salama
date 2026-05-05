"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./store-netflix-splash.css";

/** تدرجات تركواز / سماوي / فيروزي — قريبة من لون الثيم */
const BEAM_COLORS = [
  "#2dd4bf",
  "#5eead4",
  "#14b8a6",
  "#0d9488",
  "#22d3ee",
  "#06b6d4",
  "#67e8f9",
  "#2dd4bf",
  "#99f6e4",
  "#0ea5e9",
  "#38bdf8",
  "#5eead4",
];

/** أقل شرائح = أقل عمل رسم أثناء الحركة */
const NUM_STRIPS = 12;

type StripDatum = { left: string; width: string; bg: string; color: string };
type BeamDatum = { left: string; width: string; color: string };

function generateStripData(): StripDatum[] {
  const data: StripDatum[] = [];
  const stripWidth = 100 / NUM_STRIPS;
  for (let i = 0; i < NUM_STRIPS; i++) {
    const left = i * stripWidth;
    const width = stripWidth + 0.5;
    const fillPercentage = 10 + Math.random() * 40;
    const fadePoint = 60 + Math.random() * 40;
    const color = BEAM_COLORS[Math.floor(Math.random() * BEAM_COLORS.length)]!;
    const bg = `linear-gradient(to bottom, ${color} 0%, ${color} ${fillPercentage}%, rgba(0, 0, 0, 0) ${fadePoint}%, rgba(0, 0, 0, 0) 100%)`;
    data.push({
      left: `${left}%`,
      width: `${width}%`,
      bg,
      color,
    });
  }
  return data;
}

function generateBeamData(): BeamDatum[] {
  const numBeams = 14;
  const data: BeamDatum[] = [];
  for (let i = 0; i < numBeams; i++) {
    const color = BEAM_COLORS[Math.floor(Math.random() * BEAM_COLORS.length)]!;
    const width = (0.5 + Math.random() * 2.5).toFixed(1);
    const left = ((i / numBeams) * 100 + (Math.random() * 1.5 - 0.75)).toFixed(1);
    data.push({ left: `${left}%`, width: `${width}%`, color });
  }
  return data.sort((a, b) => parseFloat(a.left) - parseFloat(b.left));
}

function createStrips(container: HTMLElement | null, stripData: StripDatum[]) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  stripData.forEach((strip, index) => {
    const el = document.createElement("span");
    el.className = `nfs-strip-${index + 1}`;
    el.style.left = strip.left;
    el.style.width = strip.width;
    el.style.background = strip.bg;
    el.style.zIndex = String(index);
    fragment.appendChild(el);
  });
  container.appendChild(fragment);
}

function createBeams(container: HTMLElement | null, beamData: BeamDatum[]) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  beamData.forEach((beam, index) => {
    const el = document.createElement("span");
    el.className = `nfs-beam nfs-beam-${index + 1} ${index % 2 === 0 ? "nfs-beam-left" : "nfs-beam-right"}`;
    el.style.left = beam.left;
    el.style.width = beam.width;
    el.style.setProperty("--color", beam.color);
    el.style.animationDelay = `${(Math.random() * 0.6).toFixed(2)}s`;
    fragment.appendChild(el);
  });
  container.appendChild(fragment);
}

export function StoreNetflixSplashOverlay({
  open,
  exiting,
  onScaleAnimationComplete,
  onExitFadeComplete,
}: {
  open: boolean;
  exiting: boolean;
  onScaleAnimationComplete: () => void;
  onExitFadeComplete: () => void;
}) {
  const splashRef = useRef<HTMLDivElement>(null);
  const gradD1Ref = useRef<HTMLDivElement>(null);
  const gradD2Ref = useRef<HTMLDivElement>(null);
  const gradLRef = useRef<HTMLDivElement>(null);
  const gradRRef = useRef<HTMLDivElement>(null);
  const beamsRef = useRef<HTMLDivElement>(null);
  const scaleReportedRef = useRef(false);
  const fadeReportedRef = useRef(false);

  const onScaleAnimationCompleteRef = useRef(onScaleAnimationComplete);
  const onExitFadeCompleteRef = useRef(onExitFadeComplete);
  onScaleAnimationCompleteRef.current = onScaleAnimationComplete;
  onExitFadeCompleteRef.current = onExitFadeComplete;

  const reportScaleComplete = useCallback(() => {
    if (scaleReportedRef.current) return;
    scaleReportedRef.current = true;
    onScaleAnimationCompleteRef.current();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    scaleReportedRef.current = false;
    fadeReportedRef.current = false;
    const gd1 = gradD1Ref.current;
    const gd2 = gradD2Ref.current;
    const gl = gradLRef.current;
    const gr = gradRRef.current;
    const b1 = beamsRef.current;
    [gd1, gd2, gl, gr, b1].forEach((el) => {
      if (el) el.innerHTML = "";
    });

    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        const stripData = generateStripData();
        const beamData = generateBeamData();
        createStrips(gd1, stripData);
        createStrips(gd2, stripData);
        createStrips(gl, stripData);
        createStrips(gr, stripData);
        createBeams(b1, beamData);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      [gd1, gd2, gl, gr, b1].forEach((el) => {
        if (el) el.innerHTML = "";
      });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const splash = splashRef.current;
    const onAnimEnd = (ev: AnimationEvent) => {
      if (ev.animationName !== "nfs-scale-up") return;
      reportScaleComplete();
    };
    splash?.addEventListener("animationend", onAnimEnd);
    const fallback = window.setTimeout(reportScaleComplete, 5000);
    return () => {
      document.body.style.overflow = "";
      splash?.removeEventListener("animationend", onAnimEnd);
      window.clearTimeout(fallback);
    };
  }, [open, reportScaleComplete]);

  const handleWrapTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (!exiting) return;
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "opacity") return;
    if (fadeReportedRef.current) return;
    fadeReportedRef.current = true;
    onExitFadeCompleteRef.current();
  }, [exiting]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`nfs-wrap${exiting ? " nfs-wrap--exiting" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="جاري فتح المتجر"
      onTransitionEnd={handleWrapTransitionEnd}
    >
      <div ref={splashRef} className="nfs-splash">
        <div className="nfs-seg nfs-seg-m-d1">
          <div ref={gradD1Ref} className="nfs-grad" />
        </div>
        <div className="nfs-seg nfs-seg-m-d2">
          <div ref={gradD2Ref} className="nfs-grad" />
        </div>
        <div className="nfs-seg nfs-seg-m-l">
          <div ref={gradLRef} className="nfs-grad" />
          <div ref={beamsRef} className="nfs-beams" />
        </div>
        <div className="nfs-seg nfs-seg-m-r">
          <div ref={gradRRef} className="nfs-grad" />
        </div>
      </div>
    </div>,
    document.body
  );
}
