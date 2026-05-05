import type { PlatformNewsItem } from "./types";

export const PLATFORM_NEWS_MAX_ITEMS = 12;

export function parsePlatformNewsItems(raw: string | null | undefined): PlatformNewsItem[] {
  if (!raw || !String(raw).trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed
      .filter((x): x is Record<string, unknown> => x && typeof x === "object")
      .map((item, idx) => {
        const imageUrl = String(item.imageUrl ?? "").trim();
        const description = String(item.description ?? "").trim();
        const descriptionEnRaw = String(item.descriptionEn ?? "").trim();
        if (!imageUrl || !description) return null;
        const normalizedItem: PlatformNewsItem = {
          id: String(item.id ?? `platform-news-${idx + 1}`).trim() || `platform-news-${idx + 1}`,
          imageUrl: imageUrl.slice(0, 4000),
          description: description.slice(0, 1000),
          descriptionEn: descriptionEnRaw ? descriptionEnRaw.slice(0, 1000) : null,
        };
        return normalizedItem;
      })
      .filter((x): x is PlatformNewsItem => !!x)
      .slice(0, PLATFORM_NEWS_MAX_ITEMS);
    return clean;
  } catch {
    return [];
  }
}
