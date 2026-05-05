"use client";

import { useEffect } from "react";
import { useStoreSplashOptional } from "@/components/StoreSplashProvider";

/** يُبلّغ مزوّد شاشة الدخول بعد إطار الرسم حتى يكون محتوى المتجر تحت الغطاء جاهزًا. */
export function StorePageReadyBeacon() {
  const splash = useStoreSplashOptional();

  useEffect(() => {
    if (!splash) return;
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) splash.notifyStoreRoutePainted();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [splash]);

  return null;
}
