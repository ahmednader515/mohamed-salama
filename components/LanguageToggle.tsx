"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/constants";
import { useLocale, useT } from "./LocaleProvider";

export function LanguageToggle() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const nextLocale = locale === "ar" ? "en" : "ar";

  function handleToggle() {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs font-semibold tracking-wide text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/50"
      aria-label={nextLocale === "ar" ? t("lang.switchToAr", "Switch to Arabic") : t("lang.switchToEn", "Switch to English")}
      title={nextLocale === "ar" ? t("lang.switchToAr", "Switch to Arabic") : t("lang.switchToEn", "Switch to English")}
    >
      {nextLocale === "ar" ? t("lang.shortAr", "AR") : t("lang.shortEn", "EN")}
    </button>
  );
}
