import type { Locale } from "@/lib/i18n/types";

/** When locale is English, swap known Arabic DB defaults for i18n message keys; otherwise show DB or fallback. */
export function homepageDefaultForLocale(
  locale: Locale,
  raw: string,
  arCanonical: string,
  messageKey: string,
  t: (key: string, fallback?: string) => string,
  enFallback: string,
): string {
  if (locale === "en" && (raw === arCanonical || raw === "")) return t(messageKey, enFallback);
  return raw || t(messageKey, enFallback);
}
