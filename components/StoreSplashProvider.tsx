"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { StoreNetflixSplashOverlay } from "@/components/StoreNetflixSplashOverlay";

type StoreSplashContextValue = {
  startStoreSplashTransition: () => void;
  notifyStoreRoutePainted: () => void;
};

const StoreSplashContext = createContext<StoreSplashContextValue | null>(null);

export function useStoreSplash() {
  const ctx = useContext(StoreSplashContext);
  if (!ctx) {
    throw new Error("useStoreSplash يجب أن يُستدعى داخل StoreSplashProvider");
  }
  return ctx;
}

/** للصفحات التي لا تستخدم السياق (مثل الـ beacon) */
export function useStoreSplashOptional() {
  return useContext(StoreSplashContext);
}

export function StoreSplashProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const splashActiveRef = useRef(false);
  const animDoneRef = useRef(false);
  const storeReadyRef = useRef(false);
  const exitingRef = useRef(false);
  /** وصلنا لمسار المتجر مرةً أثناء هذه الجلسة (لتمييز «رجوع» عن تأخر تحديث المسار عند الفتح) */
  const reachedStoreDuringSplashRef = useRef(false);

  const tryBeginFadeOut = useCallback(() => {
    if (!splashActiveRef.current || exitingRef.current) return;
    if (!animDoneRef.current || !storeReadyRef.current) return;
    exitingRef.current = true;
    setExiting(true);
  }, []);

  const startStoreSplashTransition = useCallback(() => {
    void router.prefetch("/store");
    splashActiveRef.current = true;
    animDoneRef.current = false;
    storeReadyRef.current = false;
    exitingRef.current = false;
    reachedStoreDuringSplashRef.current = false;
    setExiting(false);
    setOpen(true);
    router.push("/store");
  }, [router]);

  const notifyStoreRoutePainted = useCallback(() => {
    if (!splashActiveRef.current) return;
    storeReadyRef.current = true;
    tryBeginFadeOut();
  }, [tryBeginFadeOut]);

  const handleScaleAnimationComplete = useCallback(() => {
    if (!splashActiveRef.current) return;
    animDoneRef.current = true;
    tryBeginFadeOut();
  }, [tryBeginFadeOut]);

  const handleExitFadeComplete = useCallback(() => {
    splashActiveRef.current = false;
    exitingRef.current = false;
    animDoneRef.current = false;
    storeReadyRef.current = false;
    reachedStoreDuringSplashRef.current = false;
    setExiting(false);
    setOpen(false);
  }, []);

  const forceCloseSplash = useCallback(() => {
    splashActiveRef.current = false;
    exitingRef.current = false;
    animDoneRef.current = false;
    storeReadyRef.current = false;
    reachedStoreDuringSplashRef.current = false;
    setExiting(false);
    setOpen(false);
  }, []);

  /** رجوع/أمام المتصفح: إن لم نعد على /store أغلق الغطاء فوراً (حتى لو لم يُبلّغ المتجر عن الجاهزية) */
  useEffect(() => {
    const onPopState = () => {
      queueMicrotask(() => {
        if (!splashActiveRef.current) return;
        const path =
          typeof window !== "undefined" ? window.location.pathname : "";
        if (!path.startsWith("/store")) {
          forceCloseSplash();
        }
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [forceCloseSplash]);

  /** تنقل داخل التطبيق بعيداً عن المتجر أثناء بقاء الغطاء (مثلاً رابط) */
  useEffect(() => {
    if (!splashActiveRef.current) return;
    const p = pathname ?? "";
    if (p.startsWith("/store")) {
      reachedStoreDuringSplashRef.current = true;
      return;
    }
    if (reachedStoreDuringSplashRef.current) {
      forceCloseSplash();
    }
  }, [pathname, open, forceCloseSplash]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (!splashActiveRef.current) return;
      splashActiveRef.current = false;
      exitingRef.current = false;
      animDoneRef.current = false;
      storeReadyRef.current = false;
      reachedStoreDuringSplashRef.current = false;
      setExiting(false);
      setOpen(false);
    }, 15_000);
    return () => window.clearTimeout(t);
  }, [open]);

  const value = useMemo(
    () => ({ startStoreSplashTransition, notifyStoreRoutePainted }),
    [startStoreSplashTransition, notifyStoreRoutePainted]
  );

  return (
    <StoreSplashContext.Provider value={value}>
      {children}
      <StoreNetflixSplashOverlay
        open={open}
        exiting={exiting}
        onScaleAnimationComplete={handleScaleAnimationComplete}
        onExitFadeComplete={handleExitFadeComplete}
      />
    </StoreSplashContext.Provider>
  );
}
