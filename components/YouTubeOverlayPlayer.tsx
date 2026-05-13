"use client";

import { useEffect, useRef, useState } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import { getYouTubeVideoId } from "@/lib/youtube";
import { useLocale, useT } from "./LocaleProvider";

type Props = {
  videoUrl: string;
  title: string;
  /** للطلاب: كود حقوق الطبع والنشر */
  studentCopyrightCode?: string | null;
  /** شكل ظهور كود حقوق الطبع */
  copyrightOverlayStyle?: "floating" | "watermark";
};

/** علامة مائية صغيرة تتنقل على المشغّل (تقليل فعالية حذفها من تسجيل شاشة ثابت) */
function VideoCopyrightFloatingBadge({ code, label, dir }: { code: string; label: string; dir: "rtl" | "ltr" }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const positions = [
    "right-3 top-3",
    "left-3 bottom-16",
    "left-3 top-10",
    "right-3 bottom-20",
    "left-1/2 top-4 -translate-x-1/2",
    "right-1/2 bottom-14 translate-x-1/2",
  ];
  const pos = positions[tick % positions.length];
  return (
    <div
      className={`pointer-events-none absolute z-[35] max-w-[min(90%,14rem)] select-none rounded-md border border-white/25 bg-black/60 px-2 py-1.5 text-[10px] font-semibold text-white/95 shadow-lg backdrop-blur-sm sm:text-[11px] ${pos}`}
      dir={dir}
      aria-hidden
    >
      <div className="text-[9px] font-normal text-white/75">{label}</div>
      <div className="font-mono tracking-widest">{code}</div>
    </div>
  );
}

/** علامة مائية ثابتة كبيرة في منتصف الفيديو */
function VideoCopyrightCenterWatermark({ code }: { code: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[35] flex items-center justify-center overflow-hidden select-none px-4" aria-hidden>
      <div className="-rotate-[20deg] text-center font-mono font-bold uppercase tracking-[0.22em] text-white/15 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] [font-size:clamp(1.4rem,6vw,4.5rem)]">
        {code}
      </div>
    </div>
  );
}

/**
 * مشغّل دروس يعتمد على Plyr مع مزوّد YouTube (واجهة موحّدة + fullscreen + جودة من القائمة).
 */
export function YouTubeOverlayPlayer({
  videoUrl,
  title,
  studentCopyrightCode,
  copyrightOverlayStyle = "floating",
}: Props) {
  const t = useT();
  const locale = useLocale();
  const textDir = locale === "ar" ? "rtl" : "ltr";
  const targetRef = useRef<HTMLDivElement>(null);
  /** شريط علوي فوق منطقة الفيديو في fullscreen */
  const fullscreenTopGuardRef = useRef<HTMLDivElement | null>(null);
  /** إعادة تثبيت الحارس فوق الـ iframe عندما يعيد Plyr ترتيب العقد */
  const fullscreenTopGuardMoRef = useRef<MutationObserver | null>(null);
  const fullscreenShieldTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const videoId = getYouTubeVideoId(videoUrl);

  useEffect(() => {
    if (!videoId || !targetRef.current) return;
    const el = targetRef.current;

    const clearFullscreenShieldTimers = () => {
      for (const t of fullscreenShieldTimersRef.current) clearTimeout(t);
      fullscreenShieldTimersRef.current = [];
    };

    const removeShieldNodeOnly = () => {
      fullscreenTopGuardMoRef.current?.disconnect();
      fullscreenTopGuardMoRef.current = null;
      fullscreenTopGuardRef.current?.remove();
      fullscreenTopGuardRef.current = null;
    };

    const removeFullscreenShield = () => {
      clearFullscreenShieldTimers();
      removeShieldNodeOnly();
    };

    const attachBlockHandlers = (node: HTMLElement) => {
      const stop: EventListener = (e) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      };
      node.addEventListener("pointerdown", stop, true);
      node.addEventListener("pointerup", stop, true);
      node.addEventListener("click", stop, true);
      node.addEventListener("touchstart", stop, { capture: true, passive: false });
      node.addEventListener("touchend", stop, { capture: true, passive: false });
    };

    /** شريط علوي فقط داخل منطقة الفيديو — لا عناصر في الأسفل */
    const mountFullscreenShield = (player: Plyr) => {
      removeShieldNodeOnly();
      const container = player.elements?.container;
      if (!container || !(container instanceof HTMLElement)) return;

      const videoWrap =
        (container.querySelector(".plyr__video-wrapper") as HTMLElement | null) ?? container;
      const wPos = getComputedStyle(videoWrap).position;
      if (wPos === "static") videoWrap.style.position = "relative";

      const topGuard = document.createElement("div");
      topGuard.setAttribute("aria-hidden", "true");
      topGuard.setAttribute("data-lesson-yt-top-guard", "");
      topGuard.className = "pointer-events-auto bg-transparent";
      topGuard.style.touchAction = "none";
      topGuard.style.position = "absolute";
      topGuard.style.left = "0";
      topGuard.style.right = "0";
      topGuard.style.top = "0";
      topGuard.style.width = "100%";
      topGuard.style.boxSizing = "border-box";
      topGuard.style.zIndex = "2147483647";
      topGuard.style.height = "clamp(9rem, min(30%, 28vmin), 22rem)";
      topGuard.style.minHeight = "9rem";
      topGuard.style.maxHeight = "45%";
      attachBlockHandlers(topGuard);
      const stopMove: EventListener = (e) => {
        e.stopPropagation();
      };
      topGuard.addEventListener("mousemove", stopMove, true);
      topGuard.addEventListener("mouseover", stopMove, true);

      const pinGuardOnTop = () => {
        const g = fullscreenTopGuardRef.current;
        if (!g?.isConnected || videoWrap.lastElementChild === g) return;
        videoWrap.appendChild(g);
      };

      videoWrap.appendChild(topGuard);
      fullscreenTopGuardRef.current = topGuard;
      pinGuardOnTop();

      fullscreenTopGuardMoRef.current?.disconnect();
      const mo = new MutationObserver(() => pinGuardOnTop());
      mo.observe(videoWrap, { childList: true });
      fullscreenTopGuardMoRef.current = mo;
    };

    const player = new Plyr(el, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "settings",
        "pip",
        "fullscreen",
      ],
      settings: ["quality", "speed"],
      ratio: "16:9",
      fullscreen: { enabled: true, fallback: true, iosNative: true },
      hideControls: true,
      clickToPlay: true,
      keyboard: { focused: true, global: false },
      youtube: {
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
        cc_load_policy: 0,
        ...(typeof window !== "undefined" && window.location?.origin ? { origin: window.location.origin } : {}),
      },
    });

    const onEnterFullscreen = () => {
      mountFullscreenShield(player);
      requestAnimationFrame(() => {
        mountFullscreenShield(player);
        const t1 = setTimeout(() => mountFullscreenShield(player), 80);
        const t2 = setTimeout(() => mountFullscreenShield(player), 250);
        const t3 = setTimeout(() => mountFullscreenShield(player), 500);
        fullscreenShieldTimersRef.current.push(t1, t2, t3);
      });
    };
    const onExitFullscreen = () => {
      removeFullscreenShield();
    };

    player.on("enterfullscreen", onEnterFullscreen);
    player.on("exitfullscreen", onExitFullscreen);

    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    const onDocumentFullscreenChange = () => {
      if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
        removeFullscreenShield();
      }
    };
    document.addEventListener("fullscreenchange", onDocumentFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onDocumentFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onDocumentFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onDocumentFullscreenChange);
      player.off("enterfullscreen", onEnterFullscreen);
      player.off("exitfullscreen", onExitFullscreen);
      removeFullscreenShield();
      try {
        player.destroy();
      } catch {
        /* */
      }
    };
  }, [videoId]);

  if (!videoId) return null;

  return (
    <div className="plyr-lesson-video relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-black">
      <div key={videoId} className="h-full w-full [&_.plyr]:h-full [&_.plyr]:max-h-none">
        <div
          ref={targetRef}
          data-plyr-provider="youtube"
          data-plyr-embed-id={videoId}
          data-plyr-title={title}
          className="h-full w-full"
        />
      </div>
      {/* يمنع النقر على عنوان/شريط يوتيوب العلوي (لا يظهر شيء بصريًا) */}
      <div
        className="absolute inset-x-0 top-0 z-[40] h-14 touch-none bg-transparent sm:h-16"
        aria-hidden
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      {studentCopyrightCode?.trim()
        ? copyrightOverlayStyle === "watermark"
          ? <VideoCopyrightCenterWatermark code={studentCopyrightCode.trim()} />
          : <VideoCopyrightFloatingBadge code={studentCopyrightCode.trim()} label={t("video.copyrightCode", "Copyright code")} dir={textDir} />
        : null}
    </div>
  );
}
