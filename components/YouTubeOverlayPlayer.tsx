"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { getYouTubeVideoId } from "@/lib/youtube";
import { useLocale, useT } from "./LocaleProvider";

/** فيديو مخفي لطلب الجودة (حسب طلب المنتج) — نفس المعرّف من الرابط المعطى */
const YT_QUALITY_BRIDGE_VIDEO_ID = "TAhTttsQZ54";

const YT_QUALITY_OPTIONS = ["hd1080", "hd720", "large", "medium", "small"] as const;

/** حالات مشغل يوتيوب: -1 لم يبدأ، 0 انتهى، 1 يعمل، 2 متوقف، 3 يحمّل، 5 جاهز */
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_ENDED = 0;

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getPlayerState: () => number;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  /** لم يعد يُطبَّق فعلياً من يوتيوب — يُترك للتوافق فقط */
  getAvailableQualityLevels?: () => string[];
  setPlaybackQuality?: (quality: string) => void;
  getPlaybackQuality?: () => string;
  mute?: () => void;
  destroy?: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
            onPlaybackQualityChange?: (e: { data: string }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
      className={`pointer-events-none absolute z-[25] max-w-[min(90%,14rem)] select-none rounded-md border border-white/25 bg-black/60 px-2 py-1.5 text-[10px] font-semibold text-white/95 shadow-lg backdrop-blur-sm sm:text-[11px] ${pos}`}
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
    <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center overflow-hidden select-none px-4" aria-hidden>
      <div className="-rotate-[20deg] text-center font-mono font-bold uppercase tracking-[0.22em] text-white/15 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] [font-size:clamp(1.4rem,6vw,4.5rem)]">
        {code}
      </div>
    </div>
  );
}

/**
 * مشغل فيديو يوتيوب مع طبقة علوية وزر تشغيل/إيقاف وشريط تقدم للتقديم والتأخير.
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const qualityBridgePlayerRef = useRef<YTPlayer | null>(null);
  const bridgeHostRef = useRef<HTMLDivElement>(null);
  const bridgePlayerDivRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [volume, setVolume] = useState(100);
  /** جودة معروضة في الواجهة (بعد اختيار المستخدم أو من يوتيوب) */
  const [currentQuality, setCurrentQuality] = useState<string>("");
  const [qualityOpen, setQualityOpen] = useState(false);
  const [qualityApplying, setQualityApplying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isIOS =
    typeof navigator !== "undefined" &&
    (/(iP(hone|od|ad))/i.test(navigator.userAgent) ||
      (/\bMacintosh\b/i.test(navigator.userAgent) && typeof window !== "undefined" && "ontouchend" in window));

  const videoId = getYouTubeVideoId(videoUrl);

  const qualityLabels: Record<string, string> = {
    highres: t("video.highestQuality", "Highest quality"),
    hd1080: "1080p",
    hd720: "720p",
    large: "480p",
    medium: "360p",
    small: "240p",
    tiny: "144p",
    auto: t("video.auto", "Auto"),
  };

  const stopProgressPoll = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
    // إخفاء شريط التحكم تلقائياً بعد ثانيتين أثناء التشغيل
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  }, []);

  const startProgressPoll = useCallback(() => {
    stopProgressPoll();
    progressIntervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const state = p.getPlayerState();
      if (state !== YT_PLAYING) return;
      const t = p.getCurrentTime();
      const d = p.getDuration();
      setCurrentTime(t);
      if (Number.isFinite(d) && d > 0) setDuration(d);
    }, 250);
  }, [stopProgressPoll]);

  const qualityApplyDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyPlaybackQualityToPlayers = useCallback((q: string) => {
    try {
      playerRef.current?.setPlaybackQuality?.(q);
    } catch {
      /* يوتيوب قد يتجاهل الطلب */
    }
    try {
      qualityBridgePlayerRef.current?.setPlaybackQuality?.(q);
    } catch {
      /* */
    }
    setCurrentQuality(q);
  }, []);

  const handleQualitySelect = useCallback(
    (q: string) => {
      setQualityOpen(false);
      if (qualityApplyDoneTimerRef.current) {
        clearTimeout(qualityApplyDoneTimerRef.current);
        qualityApplyDoneTimerRef.current = null;
      }
      setQualityApplying(true);

      const scheduleEnd = () => {
        qualityApplyDoneTimerRef.current = setTimeout(() => {
          qualityApplyDoneTimerRef.current = null;
          setQualityApplying(false);
        }, 1000);
      };

      const run = () => {
        if (!window.YT?.Player) {
          applyPlaybackQualityToPlayers(q);
          scheduleEnd();
          return;
        }
        if (qualityBridgePlayerRef.current) {
          try {
            qualityBridgePlayerRef.current.mute?.();
            qualityBridgePlayerRef.current.setVolume?.(0);
          } catch {
            /* */
          }
          applyPlaybackQualityToPlayers(q);
          scheduleEnd();
          return;
        }
        const host = bridgeHostRef.current;
        if (!host) {
          applyPlaybackQualityToPlayers(q);
          scheduleEnd();
          return;
        }
        const div = document.createElement("div");
        div.id = `yt-quality-bridge-${videoId}-${YT_QUALITY_BRIDGE_VIDEO_ID}`;
        bridgePlayerDivRef.current = div;
        host.appendChild(div);
        try {
          new window.YT.Player(div, {
            videoId: YT_QUALITY_BRIDGE_VIDEO_ID,
            playerVars: {
              controls: 0,
              playsinline: 1,
              rel: 0,
              mute: 1,
              ...(typeof window !== "undefined" && window.location?.origin
                ? { origin: window.location.origin }
                : {}),
            },
            events: {
              onReady: (ev: { target: YTPlayer }) => {
                qualityBridgePlayerRef.current = ev.target;
                try {
                  ev.target.mute?.();
                  ev.target.setVolume?.(0);
                  ev.target.pauseVideo?.();
                } catch {
                  /* */
                }
                applyPlaybackQualityToPlayers(q);
                scheduleEnd();
              },
              onError: () => {
                applyPlaybackQualityToPlayers(q);
                scheduleEnd();
              },
            },
          });
        } catch {
          applyPlaybackQualityToPlayers(q);
          scheduleEnd();
        }
      };

      run();
    },
    [applyPlaybackQualityToPlayers, videoId]
  );

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    const container = containerRef.current;
    let playerDiv: HTMLDivElement | null = null;

    const initPlayer = () => {
      if (!window.YT || !containerRef.current) return;
      if (document.getElementById("yt-player-" + videoId)) return;
      playerDiv = document.createElement("div");
      playerDiv.id = "yt-player-" + videoId;
      playerDiv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
      container.appendChild(playerDiv);
      new window.YT!.Player(playerDiv, {
        videoId,
        playerVars: {
          // iOS (iPhone) لا يدعم fullscreen الحقيقي للـ iframe عبر Fullscreen API،
          // لذلك نسمح بزر fullscreen الخاص بيوتيوب هناك فقط.
          controls: isIOS ? 1 : 0,
          disablekb: 1,
          fs: isIOS ? 1 : 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          ...(typeof window !== "undefined" && window.location?.origin
            ? { origin: window.location.origin }
            : {}),
        },
        events: {
          onReady(ev: { target: YTPlayer }) {
            playerRef.current = ev.target;
            const d = ev.target.getDuration();
            if (Number.isFinite(d) && d > 0) setDuration(d);
            try {
              const v = ev.target.getVolume();
              if (Number.isFinite(v)) setVolume(Math.round(v));
            } catch {}
            try {
              if (ev.target.getPlaybackQuality) {
                const q = ev.target.getPlaybackQuality();
                if (q && typeof q === "string") setCurrentQuality(q);
              }
            } catch {}
            setReady(true);
          },
          onPlaybackQualityChange(ev: { data: string }) {
            if (typeof ev.data === "string" && ev.data) setCurrentQuality(ev.data);
          },
          onStateChange(ev: { data: number }) {
            const state = ev.data;
            if (state === YT_PLAYING) {
              setIsPlaying(true);
              setShowControls(true);
              scheduleHideControls();
              startProgressPoll();
              setTimeout(() => {
                const p = playerRef.current;
                try {
                  if (p?.getPlaybackQuality) {
                    const q = p.getPlaybackQuality();
                    if (q && typeof q === "string") setCurrentQuality(q);
                  }
                } catch {}
              }, 500);
            } else {
              setIsPlaying(false);
              setShowControls(true);
              if (controlsTimerRef.current) {
                clearTimeout(controlsTimerRef.current);
                controlsTimerRef.current = null;
              }
              stopProgressPoll();
              if (state === YT_PAUSED || state === YT_ENDED) {
                const p = playerRef.current;
                if (p) setCurrentTime(p.getCurrentTime());
              }
            }
          },
        },
      });
    };

    if (window.YT) {
      initPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.getElementsByTagName("script")[0]?.parentNode?.insertBefore(tag, document.getElementsByTagName("script")[0]);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
    }
    return () => {
      stopProgressPoll();
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      if (qualityApplyDoneTimerRef.current) {
        clearTimeout(qualityApplyDoneTimerRef.current);
        qualityApplyDoneTimerRef.current = null;
      }
      try {
        qualityBridgePlayerRef.current?.destroy?.();
      } catch {
        /* */
      }
      qualityBridgePlayerRef.current = null;
      if (bridgePlayerDivRef.current?.parentNode) {
        bridgePlayerDivRef.current.parentNode.removeChild(bridgePlayerDivRef.current);
      }
      bridgePlayerDivRef.current = null;
      playerRef.current = null;
      setReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setQualityApplying(false);
      if (playerDiv?.parentNode) playerDiv.parentNode.removeChild(playerDiv);
    };
  }, [videoId, startProgressPoll, stopProgressPoll, isIOS]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  };

  const seekBySeconds = useCallback(
    (delta: number) => {
      const p = playerRef.current;
      if (!p) return;
      let d = duration;
      try {
        const pd = p.getDuration();
        if (Number.isFinite(pd) && pd > 0) d = pd;
      } catch {}
      let t = 0;
      try {
        t = p.getCurrentTime();
      } catch {}
      const next = Math.max(0, d > 0 ? Math.min(d, t + delta) : Math.max(0, t + delta));
      try {
        p.seekTo(next, true);
      } catch {}
      setCurrentTime(next);
    },
    [duration]
  );

  const pendingSingleTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ at: number; side: "left" | "right" } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const DOUBLE_TAP_MS = 320;

  const handleTapOrClick = useCallback(
    (clientX: number) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      const mid = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const side: "left" | "right" = clientX < mid ? "left" : "right";
      const now = Date.now();
      const last = lastTapRef.current;

      if (last && now - last.at <= DOUBLE_TAP_MS && last.side === side) {
        // دبل تاب/دبل كليك: تقديم/إرجاع 10 ثواني
        if (pendingSingleTapRef.current) {
          clearTimeout(pendingSingleTapRef.current);
          pendingSingleTapRef.current = null;
        }
        lastTapRef.current = null;
        seekBySeconds(side === "right" ? 10 : -10);
        return;
      }

      lastTapRef.current = { at: now, side };
      if (pendingSingleTapRef.current) {
        clearTimeout(pendingSingleTapRef.current);
        pendingSingleTapRef.current = null;
      }
      // نقرة واحدة: تشغيل/إيقاف (ننتظر قليلًا لتمييز الدبل تاب)
      pendingSingleTapRef.current = setTimeout(() => {
        pendingSingleTapRef.current = null;
        togglePlay();
      }, DOUBLE_TAP_MS);
    },
    [seekBySeconds, togglePlay]
  );


  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const value = parseFloat(e.target.value);
    const sec = value * duration;
    setIsSeeking(true);
    setCurrentTime(sec);
    p.seekTo(sec, true);
    setTimeout(() => setIsSeeking(false), 150);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const sec = percent * duration;
    setCurrentTime(sec);
    p.seekTo(sec, true);
  };

  const progressValue = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const handleMouseMove = () => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    setShowControls(true);
    scheduleHideControls();
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      // لما يطلع الماوس برّه أثناء التشغيل نخفي الشريط
      setShowControls(false);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const v = Math.max(0, Math.min(100, newVol));
    setVolume(v);
    const p = playerRef.current;
    if (p) p.setVolume(v);
  };

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void> | void;
      };
      const host = el as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };
      const iframe = el.querySelector("iframe") as (HTMLElement & {
        requestFullscreen?: () => Promise<void> | void;
        webkitRequestFullscreen?: () => Promise<void> | void;
      }) | null;

      const isFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement);

      // iOS: نعتمد على زر fullscreen داخل يوتيوب (controls/fs) للحصول على fullscreen الحقيقي
      if (isIOS) return;

      if (pseudoFullscreen) {
        setPseudoFullscreen(false);
        return;
      }

      if (!isFullscreen && !isIOS) {
        const requestFullscreen =
          host.requestFullscreen?.bind(host) ??
          host.webkitRequestFullscreen?.bind(host) ??
          iframe?.requestFullscreen?.bind(iframe) ??
          iframe?.webkitRequestFullscreen?.bind(iframe);
        if (requestFullscreen) {
          requestFullscreen();
        } else {
          setPseudoFullscreen(true);
        }
      } else {
        const exitFullscreen =
          doc.exitFullscreen?.bind(doc) ??
          doc.webkitExitFullscreen?.bind(doc);
        if (exitFullscreen && isFullscreen) exitFullscreen();
        else setPseudoFullscreen(true);
      }
    } catch {}
  };

  // قفل تمرير الصفحة عند pseudo fullscreen (مهم على iOS)
  useEffect(() => {
    if (!pseudoFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [pseudoFullscreen]);

  const handleOverlayPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      suppressClickUntilRef.current = Date.now() + DOUBLE_TAP_MS + 40;
      handleTapOrClick(e.clientX);
    },
    [handleTapOrClick]
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // بعض الأجهزة تولّد click بعد pointer/touch لنفس اللمسة
      if (Date.now() < suppressClickUntilRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      handleTapOrClick(e.clientX);
    },
    [handleTapOrClick]
  );

  if (!videoId) return null;

  return (
    <div
      ref={wrapperRef}
      className={
        pseudoFullscreen
          ? "fixed inset-0 z-[1000] h-[100svh] w-[100vw] overflow-hidden bg-black"
          : "relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-black"
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {/* حاوية مشغّل يوتيوب المخفي لطلب الجودة (نفس منطق المنتج) */}
      <div
        ref={bridgeHostRef}
        className="pointer-events-none absolute left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0"
        aria-hidden
        tabIndex={-1}
      />
      {studentCopyrightCode?.trim()
        ? (copyrightOverlayStyle === "watermark"
            ? <VideoCopyrightCenterWatermark code={studentCopyrightCode.trim()} />
            : <VideoCopyrightFloatingBadge code={studentCopyrightCode.trim()} label={t("video.copyrightCode", "Copyright code")} dir={textDir} />)
        : null}
      {qualityApplying ? (
        <div
          className="absolute inset-0 z-[45] flex flex-col items-center justify-center gap-3 bg-black/75 px-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="h-11 w-11 shrink-0 animate-spin rounded-full border-[3px] border-white/30 border-t-[var(--color-primary)]"
            aria-hidden
          />
          <p className="text-center text-sm font-medium text-white">{t("video.applyingQuality", "Applying quality...")}</p>
        </div>
      ) : null}
      {/* طبقة علوية للتحكم — لا تغطي شريط الأدوات */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end">
        {/* منطقة النقر للتشغيل في المنتصف — العلامة تظهر فقط عند الإيقاف */}
        <div
          className="absolute inset-0 flex touch-manipulation items-center justify-center"
          onPointerUp={handleOverlayPointerUp}
          onClick={handleOverlayClick}
          onDoubleClick={(e) => {
            // منع قيام المتصفح بتكبير/تحديد… إلخ، ونتعامل مع الدبل كليك بأنفسنا
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter" ? (e.preventDefault(), togglePlay()) : null)}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? t("video.pause", "Pause") : t("video.play", "Play")}
        >
          {!isPlaying && (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)]/90 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[var(--color-primary)] sm:h-20 sm:w-20">
              <svg className="mr-0.5 h-7 w-7 sm:mr-1 sm:h-10 sm:w-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* شريط التحكم في الأسفل */}
        <div
          className={`relative z-20 flex flex-col gap-1.5 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 transition-opacity duration-200 sm:gap-2 sm:px-3 sm:pb-2 sm:pt-8 ${
            isPlaying && !showControls ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          {/* الصوت والجودة */}
          <div className="flex items-center justify-end gap-2 sm:gap-4">
            {/* الصوت */}
            <div dir="ltr" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleVolumeChange(volume - 10)}
                disabled={!ready}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/20 disabled:opacity-50 sm:h-8 sm:w-8"
                aria-label={t("video.volumeDown", "Volume down")}
              >
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                disabled={!ready}
                className="h-1.5 w-14 cursor-pointer accent-[var(--color-primary)] disabled:opacity-50 sm:w-20"
                aria-label={t("video.volumeLevel", "Volume level")}
              />
              <button
                type="button"
                onClick={() => handleVolumeChange(volume + 10)}
                disabled={!ready}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/20 disabled:opacity-50 sm:h-8 sm:w-8"
                aria-label={t("video.volumeUp", "Volume up")}
              >
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm14 3v4h2v-4h2v-2h-2V9h-2v2h-2v2h2zm-2-3.99V7c0-1.1.9-2 2-2s2 .9 2 2v2.01c1.16.41 2 1.52 2 2.99 0 1.48-.84 2.58-2 2.99V17c0 1.1-.9 2-2 2s-2-.9-2-2v-2.01c-1.16-.41-2-1.52-2-2.99 0-1.48.84-2.58 2-2.99z" />
                </svg>
              </button>
            </div>
            {/* الجودة: قائمة + شاشة تحميل + مشغّل مخفي للمقطع المحدد ثم تطبيق الجودة */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQualityOpen((o) => !o);
                }}
                disabled={!ready || qualityApplying}
                className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] text-white transition hover:bg-white/30 disabled:opacity-50 sm:px-2.5 sm:py-1.5 sm:text-xs"
                aria-label={t("video.changeQuality", "Change quality")}
                aria-expanded={qualityOpen}
              >
                {currentQuality ? (qualityLabels[currentQuality] ?? currentQuality) : t("video.quality", "Quality")}
                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>
              {qualityOpen && !qualityApplying ? (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setQualityOpen(false)} />
                  <ul className="absolute bottom-full right-0 z-20 mb-1 max-h-48 min-w-[8rem] overflow-auto rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
                    {YT_QUALITY_OPTIONS.map((q) => (
                      <li key={q}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQualitySelect(q);
                          }}
                          className="w-full px-3 py-2 text-right text-sm text-[var(--color-foreground)] hover:bg-[var(--color-border)]/50"
                        >
                          {qualityLabels[q] ?? q}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
          {/* شريط التقديم والتأخير */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!ready}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 disabled:opacity-50 sm:h-9 sm:w-9"
              aria-label={isPlaying ? t("video.pause", "Pause") : t("video.play", "Play")}
            >
              {isPlaying ? (
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="ml-0.5 h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="min-w-[2.1rem] text-right text-[10px] text-white/90 tabular-nums sm:min-w-[2.5rem] sm:text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div
              dir="ltr"
              className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/30 sm:h-2"
              onClick={handleProgressClick}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-75"
                style={{ width: `${progressValue * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={isSeeking ? progressValue : currentTime / (duration || 1)}
                onChange={handleSeek}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label={t("video.seek", "Seek video")}
              />
            </div>
            {!isIOS ? (
              <button
                type="button"
                onClick={toggleFullscreen}
                disabled={!ready}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 disabled:opacity-50 sm:h-9 sm:w-9"
                aria-label={t("video.fullscreen", "Fullscreen")}
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
