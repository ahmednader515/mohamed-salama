import type { Locale } from "./types";

export function pickLocalizedText(
  locale: Locale,
  arabicValue: string | null | undefined,
  englishValue: string | null | undefined,
): string {
  const ar = (arabicValue ?? "").trim();
  const en = (englishValue ?? "").trim();
  if (locale === "en") return en || ar;
  return ar || en;
}
