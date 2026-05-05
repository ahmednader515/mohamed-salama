"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  HomepageSetting,
  HeroBgPreset,
  PlatformDetailsItem,
  PlatformDetailsPresetIcon,
  PlatformNewsItem,
} from "@/lib/types";
import { HERO_BG_PRESET_GRADIENTS, normalizeHeroHex } from "@/lib/hero-bg";
import {
  DEFAULT_PLATFORM_DETAILS_ITEMS,
  PLATFORM_DETAILS_PRESET_ICON_OPTIONS,
  parsePlatformDetailsItems,
} from "@/lib/platform-details";
import { parsePlatformNewsItems, PLATFORM_NEWS_MAX_ITEMS } from "@/lib/platform-news";
import { useT } from "@/components/LocaleProvider";
import { fillMessage } from "@/lib/i18n/interpolate";

const HERO_BG_PRESET_IDS: HeroBgPreset[] = [
  "navy",
  "indigo",
  "purple",
  "teal",
  "forest",
  "slate",
  "crimson",
  "rose",
  "sunset",
  "sky",
  "cyan",
  "stone",
  "midnight",
  "wine",
];

type HeroTemplate = "classic" | "image_slider" | "coming_soon";
type SliderImageKey =
  | "heroSliderImage1"
  | "heroSliderImage2"
  | "heroSliderImage3"
  | "heroSliderImage4"
  | "heroSliderImage5";
type SliderCourseIdKey =
  | "heroSliderCourseId1"
  | "heroSliderCourseId2"
  | "heroSliderCourseId3"
  | "heroSliderCourseId4"
  | "heroSliderCourseId5";

type PublishedCourseOption = {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
};

const SLIDER_IMAGE_FIELDS: Array<{
  idx: 1 | 2 | 3 | 4 | 5;
  key: SliderImageKey;
  courseIdKey: SliderCourseIdKey;
}> = [
  { idx: 1, key: "heroSliderImage1", courseIdKey: "heroSliderCourseId1" },
  { idx: 2, key: "heroSliderImage2", courseIdKey: "heroSliderCourseId2" },
  { idx: 3, key: "heroSliderImage3", courseIdKey: "heroSliderCourseId3" },
  { idx: 4, key: "heroSliderImage4", courseIdKey: "heroSliderCourseId4" },
  { idx: 5, key: "heroSliderImage5", courseIdKey: "heroSliderCourseId5" },
];

function initialHeroBgCustom(settings: HomepageSetting): {
  useCustom: boolean;
  from: string;
  to: string;
} {
  const a = normalizeHeroHex(settings.heroBgCustomFrom ?? "");
  const b = normalizeHeroHex(settings.heroBgCustomTo ?? "");
  if (a && b) return { useCustom: true, from: a, to: b };
  const preset = String(settings.heroBgPreset ?? "navy");
  const g = HERO_BG_PRESET_GRADIENTS[preset] ?? HERO_BG_PRESET_GRADIENTS.navy;
  return { useCustom: false, from: g.from, to: g.to };
}

function renderPresetIcon(icon: PlatformDetailsPresetIcon, className: string) {
  const common = { className, fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
  switch (icon) {
    case "book":
      return <svg viewBox="0 0 24 24" {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5V21" /></svg>;
    case "pencil":
      return <svg viewBox="0 0 24 24" {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4z" /></svg>;
    case "bulb":
      return <svg viewBox="0 0 24 24" {...common}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8 14a6 6 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5C9.5 16 9 15 8 14z" /></svg>;
    case "users":
      return <svg viewBox="0 0 24 24" {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="3.5" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a3.5 3.5 0 0 1 0 6.75" /></svg>;
    case "rocket":
      return <svg viewBox="0 0 24 24" {...common}><path d="M5 15c-1 0-2.5 0-3 1.5S1 20 1 20s2-.5 3.5-1S6 17 6 16" /><path d="M14 10 4 20" /><path d="M12 2s5 0 8 3 3 8 3 8-4 1-8-3-3-8-3-8z" /></svg>;
    case "target":
      return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.5" /></svg>;
    case "certificate":
      return <svg viewBox="0 0 24 24" {...common}><path d="M7 4h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4l-3 3v-3H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    case "chat":
    default:
      return <svg viewBox="0 0 24 24" {...common}><path d="M21 12a8 8 0 0 1-8 8H6l-3 3v-8a8 8 0 1 1 18-3z" /></svg>;
  }
}

export function HomepageSettingsForm({
  initialSettings,
  publishedCourses,
}: {
  initialSettings: HomepageSetting;
  publishedCourses: PublishedCourseOption[];
}) {
  const router = useRouter();
  const t = useT();
  const Hp = "dashboard.homepageSettingsForm";
  const fh = (key: string) => t(`${Hp}.${key}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const initialHeroBg = initialHeroBgCustom(initialSettings);
  const [form, setForm] = useState({
    heroTemplate: ((initialSettings.heroTemplate as HeroTemplate) || "classic") as HeroTemplate,
    teacherImageUrl: initialSettings.teacherImageUrl ?? "",
    heroTitle: initialSettings.heroTitle ?? "",
    heroTitleEn: initialSettings.heroTitleEn ?? "",
    heroSlogan: initialSettings.heroSlogan ?? "",
    heroSloganEn: initialSettings.heroSloganEn ?? "",
    platformName: initialSettings.platformName ?? "",
    platformNameEn: initialSettings.platformNameEn ?? "",
    headerLogoUrl: initialSettings.headerLogoUrl ?? "",
    primaryColor: initialSettings.primaryColor ?? "",
    youtubeUrl: initialSettings.youtubeUrl ?? "",
    linkedinUrl: initialSettings.linkedinUrl ?? "",
    pageTitle: initialSettings.pageTitle ?? "",
    pageTitleEn: initialSettings.pageTitleEn ?? "",
    whatsappUrl: initialSettings.whatsappUrl ?? "",
    facebookUrl: initialSettings.facebookUrl ?? "",
    telegramUrl: initialSettings.telegramUrl ?? "",
    teamYoutubeUrl: initialSettings.teamYoutubeUrl ?? "",
    teamLinkedinUrl: initialSettings.teamLinkedinUrl ?? "",
    teamWhatsappUrl: initialSettings.teamWhatsappUrl ?? "",
    teamFacebookUrl: initialSettings.teamFacebookUrl ?? "",
    teamTelegramUrl: initialSettings.teamTelegramUrl ?? "",
    socialRightLabel: initialSettings.socialRightLabel ?? "",
    socialRightLabelEn: initialSettings.socialRightLabelEn ?? "",
    socialLeftLabel: initialSettings.socialLeftLabel ?? "",
    socialLeftLabelEn: initialSettings.socialLeftLabelEn ?? "",
    socialLeftEnabled: initialSettings.socialLeftEnabled ?? true,
    heroBgPreset: (initialSettings.heroBgPreset as HeroBgPreset) || "navy",
    heroBgUseCustom: initialHeroBg.useCustom,
    heroBgCustomFrom: initialHeroBg.from,
    heroBgCustomTo: initialHeroBg.to,
    heroFloatImage1: initialSettings.heroFloatImage1 ?? "",
    heroFloatImage2: initialSettings.heroFloatImage2 ?? "",
    heroFloatImage3: initialSettings.heroFloatImage3 ?? "",
    heroSliderImage1: initialSettings.heroSliderImage1 ?? "",
    heroSliderImage2: initialSettings.heroSliderImage2 ?? "",
    heroSliderImage3: initialSettings.heroSliderImage3 ?? "",
    heroSliderImage4: initialSettings.heroSliderImage4 ?? "",
    heroSliderImage5: initialSettings.heroSliderImage5 ?? "",
    heroSliderCourseId1: initialSettings.heroSliderCourseId1 ?? "",
    heroSliderCourseId2: initialSettings.heroSliderCourseId2 ?? "",
    heroSliderCourseId3: initialSettings.heroSliderCourseId3 ?? "",
    heroSliderCourseId4: initialSettings.heroSliderCourseId4 ?? "",
    heroSliderCourseId5: initialSettings.heroSliderCourseId5 ?? "",
    heroSliderIntervalSeconds: String(
      Math.min(20, Math.max(2, Math.round((initialSettings.heroSliderIntervalMs ?? 5000) / 1000))),
    ),
    hero3Title: initialSettings.hero3Title ?? "",
    hero3TitleEn: initialSettings.hero3TitleEn ?? "",
    hero3Subtitle: initialSettings.hero3Subtitle ?? "",
    hero3SubtitleEn: initialSettings.hero3SubtitleEn ?? "",
    hero3PhoneImageUrl: initialSettings.hero3PhoneImageUrl ?? "",
    hero3PhoneBgColor: initialSettings.hero3PhoneBgColor ?? "#FACC15",
    hero3StoreBadge1ImageUrl: initialSettings.hero3StoreBadge1ImageUrl ?? "",
    hero3StoreBadge1Link: initialSettings.hero3StoreBadge1Link ?? "",
    hero3StoreBadge2ImageUrl: initialSettings.hero3StoreBadge2ImageUrl ?? "",
    hero3StoreBadge2Link: initialSettings.hero3StoreBadge2Link ?? "",
    footerTitle: initialSettings.footerTitle ?? "",
    footerTitleEn: initialSettings.footerTitleEn ?? "",
    footerTagline: initialSettings.footerTagline ?? "",
    footerTaglineEn: initialSettings.footerTaglineEn ?? "",
    footerCopyright: initialSettings.footerCopyright ?? "",
    footerCopyrightEn: initialSettings.footerCopyrightEn ?? "",
    reviewsSectionTitle: initialSettings.reviewsSectionTitle ?? "",
    reviewsSectionTitleEn: initialSettings.reviewsSectionTitleEn ?? "",
    reviewsSectionSubtitle: initialSettings.reviewsSectionSubtitle ?? "",
    reviewsSectionSubtitleEn: initialSettings.reviewsSectionSubtitleEn ?? "",
    ctaBadgeText: initialSettings.ctaBadgeText ?? "",
    ctaBadgeTextEn: initialSettings.ctaBadgeTextEn ?? "",
    ctaTitle: initialSettings.ctaTitle ?? "",
    ctaTitleEn: initialSettings.ctaTitleEn ?? "",
    ctaDescription: initialSettings.ctaDescription ?? "",
    ctaDescriptionEn: initialSettings.ctaDescriptionEn ?? "",
    ctaButtonText: initialSettings.ctaButtonText ?? "",
    ctaButtonTextEn: initialSettings.ctaButtonTextEn ?? "",
    platformDetailsEnabled: Boolean(initialSettings.platformDetailsEnabled ?? false),
    platformDetailsTitle: initialSettings.platformDetailsTitle ?? "",
    platformDetailsTitleEn: initialSettings.platformDetailsTitleEn ?? "",
    platformDetailsSubtitle: initialSettings.platformDetailsSubtitle ?? "",
    platformDetailsSubtitleEn: initialSettings.platformDetailsSubtitleEn ?? "",
    platformDetailsBackgroundColor: initialSettings.platformDetailsBackgroundColor ?? "",
    platformNewsEnabled: Boolean(initialSettings.platformNewsEnabled ?? false),
    platformNewsSectionTitle: initialSettings.platformNewsSectionTitle ?? "",
    platformNewsSectionTitleEn: initialSettings.platformNewsSectionTitleEn ?? "",
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [floatImageUploading, setFloatImageUploading] = useState<1 | 2 | 3 | null>(null);
  const [sliderImageUploading, setSliderImageUploading] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [hero3Uploading, setHero3Uploading] = useState<"phone" | "badge1" | "badge2" | null>(null);
  const [platformItemUploading, setPlatformItemUploading] = useState<string | null>(null);
  const [platformDetailsItems, setPlatformDetailsItems] = useState<PlatformDetailsItem[]>(
    parsePlatformDetailsItems(initialSettings.platformDetailsItems),
  );
  const [platformNewsItems, setPlatformNewsItems] = useState<PlatformNewsItem[]>(
    parsePlatformNewsItems(initialSettings.platformNewsItems),
  );
  const [platformNewsUploading, setPlatformNewsUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    const ic = initialHeroBgCustom(initialSettings);
    setForm((f) => ({
      ...f,
      heroBgPreset: (initialSettings.heroBgPreset as HeroBgPreset) || "navy",
      heroBgUseCustom: ic.useCustom,
      heroBgCustomFrom: ic.from,
      heroBgCustomTo: ic.to,
    }));
  }, [
    initialSettings.heroBgPreset,
    initialSettings.heroBgCustomFrom,
    initialSettings.heroBgCustomTo,
  ]);

  function normalizeTelegramInput(value: string): string {
    const raw = value.trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^t\.me\//i.test(raw) || /^telegram\.me\//i.test(raw)) return `https://${raw}`;
    return raw;
  }

  useEffect(() => {
    setPlatformDetailsItems(parsePlatformDetailsItems(initialSettings.platformDetailsItems));
  }, [initialSettings.platformDetailsItems]);

  useEffect(() => {
    setPlatformNewsItems(parsePlatformNewsItems(initialSettings.platformNewsItems));
  }, [initialSettings.platformNewsItems]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      platformNewsSectionTitle: initialSettings.platformNewsSectionTitle ?? "",
    }));
  }, [initialSettings.platformNewsSectionTitle]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      heroSliderCourseId1: initialSettings.heroSliderCourseId1 ?? "",
      heroSliderCourseId2: initialSettings.heroSliderCourseId2 ?? "",
      heroSliderCourseId3: initialSettings.heroSliderCourseId3 ?? "",
      heroSliderCourseId4: initialSettings.heroSliderCourseId4 ?? "",
      heroSliderCourseId5: initialSettings.heroSliderCourseId5 ?? "",
    }));
  }, [
    initialSettings.heroSliderCourseId1,
    initialSettings.heroSliderCourseId2,
    initialSettings.heroSliderCourseId3,
    initialSettings.heroSliderCourseId4,
    initialSettings.heroSliderCourseId5,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const customFromNorm = normalizeHeroHex(form.heroBgCustomFrom);
      const customToNorm = normalizeHeroHex(form.heroBgCustomTo);
      if (form.heroBgUseCustom && (!customFromNorm || !customToNorm)) {
        throw new Error(t(`${Hp}.validation.gradientCustomMissing`));
      }
      const primaryNorm = form.primaryColor.trim()
        ? normalizeHeroHex(form.primaryColor.trim())
        : null;
      if (form.primaryColor.trim() && !primaryNorm) {
        throw new Error(t(`${Hp}.validation.primaryColorHex`));
      }
      const intervalSecondsRaw = Number(form.heroSliderIntervalSeconds.trim());
      if (!Number.isFinite(intervalSecondsRaw) || intervalSecondsRaw < 2 || intervalSecondsRaw > 20) {
        throw new Error(t(`${Hp}.validation.sliderIntervalSeconds`));
      }
      const hero3PhoneBgNorm = form.hero3PhoneBgColor.trim()
        ? normalizeHeroHex(form.hero3PhoneBgColor.trim())
        : null;
      if (form.hero3PhoneBgColor.trim() && !hero3PhoneBgNorm) {
        throw new Error(t(`${Hp}.validation.hero3PhoneBgHex`));
      }
      if (platformDetailsItems.length > 4) {
        throw new Error(t(`${Hp}.validation.platformDetailsCardsMax`));
      }
      if (
        platformDetailsItems.some(
          (item) =>
            !item.title.trim() ||
            !item.description.trim() ||
            (item.iconType === "upload" && !item.customIconUrl?.trim()),
        )
      ) {
        throw new Error(t(`${Hp}.validation.platformDetailsCardsComplete`));
      }
      const platformDetailsBgNorm = form.platformDetailsBackgroundColor.trim()
        ? normalizeHeroHex(form.platformDetailsBackgroundColor.trim())
        : null;
      if (form.platformDetailsBackgroundColor.trim() && !platformDetailsBgNorm) {
        throw new Error(t(`${Hp}.validation.platformDetailsBgHex`));
      }
      if (platformNewsItems.length > PLATFORM_NEWS_MAX_ITEMS) {
        throw new Error(
          fillMessage(t(`${Hp}.validation.platformNewsMax`), { max: PLATFORM_NEWS_MAX_ITEMS }),
        );
      }
      if (
        platformNewsItems.some(
          (item) =>
            (item.imageUrl.trim() && !item.description.trim()) ||
            (!item.imageUrl.trim() && item.description.trim()),
        )
      ) {
        throw new Error(t(`${Hp}.validation.platformNewsPairs`));
      }
      const heroTemplate: HeroTemplate =
        form.heroTemplate === "classic" ||
        form.heroTemplate === "image_slider" ||
        form.heroTemplate === "coming_soon"
          ? form.heroTemplate
          : "classic";
      const res = await fetch("/api/dashboard/settings/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroTemplate,
          teacherImageUrl: form.teacherImageUrl.trim() || null,
          heroTitle: form.heroTitle.trim() || null,
          heroTitleEn: form.heroTitleEn.trim() || null,
          heroSlogan: form.heroSlogan.trim() || null,
          heroSloganEn: form.heroSloganEn.trim() || null,
          platformName: form.platformName.trim() || null,
          platformNameEn: form.platformNameEn.trim() || null,
          headerLogoUrl: form.headerLogoUrl.trim() || null,
          primaryColor: primaryNorm,
          youtubeUrl: form.youtubeUrl.trim() || null,
          linkedinUrl: form.linkedinUrl.trim() || null,
          pageTitle: form.pageTitle.trim() || null,
          pageTitleEn: form.pageTitleEn.trim() || null,
          whatsappUrl: form.whatsappUrl.trim() || null,
          facebookUrl: form.facebookUrl.trim() || null,
          telegramUrl: normalizeTelegramInput(form.telegramUrl) || null,
          teamYoutubeUrl: form.teamYoutubeUrl.trim() || null,
          teamLinkedinUrl: form.teamLinkedinUrl.trim() || null,
          teamWhatsappUrl: form.teamWhatsappUrl.trim() || null,
          teamFacebookUrl: form.teamFacebookUrl.trim() || null,
          teamTelegramUrl: normalizeTelegramInput(form.teamTelegramUrl) || null,
          socialRightLabel: form.socialRightLabel.trim() || null,
          socialRightLabelEn: form.socialRightLabelEn.trim() || null,
          socialLeftLabel: form.socialLeftLabel.trim() || null,
          socialLeftLabelEn: form.socialLeftLabelEn.trim() || null,
          socialLeftEnabled: form.socialLeftEnabled,
          heroBgPreset: form.heroBgPreset || null,
          heroBgCustomFrom: form.heroBgUseCustom ? customFromNorm : null,
          heroBgCustomTo: form.heroBgUseCustom ? customToNorm : null,
          heroFloatImage1: form.heroFloatImage1.trim() || null,
          heroFloatImage2: form.heroFloatImage2.trim() || null,
          heroFloatImage3: form.heroFloatImage3.trim() || null,
          heroSliderImage1: form.heroSliderImage1.trim() || null,
          heroSliderImage2: form.heroSliderImage2.trim() || null,
          heroSliderImage3: form.heroSliderImage3.trim() || null,
          heroSliderImage4: form.heroSliderImage4.trim() || null,
          heroSliderImage5: form.heroSliderImage5.trim() || null,
          heroSliderCourseId1: form.heroSliderCourseId1.trim() || null,
          heroSliderCourseId2: form.heroSliderCourseId2.trim() || null,
          heroSliderCourseId3: form.heroSliderCourseId3.trim() || null,
          heroSliderCourseId4: form.heroSliderCourseId4.trim() || null,
          heroSliderCourseId5: form.heroSliderCourseId5.trim() || null,
          heroSliderIntervalSeconds: Math.round(intervalSecondsRaw),
          hero3Title: form.hero3Title.trim() || null,
          hero3TitleEn: form.hero3TitleEn.trim() || null,
          hero3Subtitle: form.hero3Subtitle.trim() || null,
          hero3SubtitleEn: form.hero3SubtitleEn.trim() || null,
          hero3PhoneImageUrl: form.hero3PhoneImageUrl.trim() || null,
          hero3PhoneBgColor: hero3PhoneBgNorm,
          hero3StoreBadge1ImageUrl: form.hero3StoreBadge1ImageUrl.trim() || null,
          hero3StoreBadge1Link: form.hero3StoreBadge1Link.trim() || null,
          hero3StoreBadge2ImageUrl: form.hero3StoreBadge2ImageUrl.trim() || null,
          hero3StoreBadge2Link: form.hero3StoreBadge2Link.trim() || null,
          footerTitle: form.footerTitle.trim() || null,
          footerTitleEn: form.footerTitleEn.trim() || null,
          footerTagline: form.footerTagline.trim() || null,
          footerTaglineEn: form.footerTaglineEn.trim() || null,
          footerCopyright: form.footerCopyright.trim() || null,
          footerCopyrightEn: form.footerCopyrightEn.trim() || null,
          reviewsSectionTitle: form.reviewsSectionTitle.trim() || null,
          reviewsSectionTitleEn: form.reviewsSectionTitleEn.trim() || null,
          reviewsSectionSubtitle: form.reviewsSectionSubtitle.trim() || null,
          reviewsSectionSubtitleEn: form.reviewsSectionSubtitleEn.trim() || null,
          ctaBadgeText: form.ctaBadgeText.trim() || null,
          ctaBadgeTextEn: form.ctaBadgeTextEn.trim() || null,
          ctaTitle: form.ctaTitle.trim() || null,
          ctaTitleEn: form.ctaTitleEn.trim() || null,
          ctaDescription: form.ctaDescription.trim() || null,
          ctaDescriptionEn: form.ctaDescriptionEn.trim() || null,
          ctaButtonText: form.ctaButtonText.trim() || null,
          ctaButtonTextEn: form.ctaButtonTextEn.trim() || null,
          platformDetailsEnabled: form.platformDetailsEnabled,
          platformDetailsTitle: form.platformDetailsTitle.trim() || null,
          platformDetailsTitleEn: form.platformDetailsTitleEn.trim() || null,
          platformDetailsSubtitle: form.platformDetailsSubtitle.trim() || null,
          platformDetailsSubtitleEn: form.platformDetailsSubtitleEn.trim() || null,
          platformDetailsBackgroundColor: platformDetailsBgNorm,
          platformDetailsItems,
          platformNewsEnabled: form.platformNewsEnabled,
          platformNewsSectionTitle: form.platformNewsSectionTitle.trim() || null,
          platformNewsSectionTitleEn: form.platformNewsSectionTitleEn.trim() || null,
          platformNewsItems: platformNewsItems.filter(
            (item) => item.imageUrl.trim() && item.description.trim(),
          ),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${Hp}.saveFailed`));
      setSuccess(t(`${Hp}.saveSuccess`));
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t(`${Hp}.saveSettingsGeneric`));
    } finally {
      setSaving(false);
    }
  }

  const canAddPlatformDetailItem = platformDetailsItems.length < 4;
  const canAddPlatformNewsItem = platformNewsItems.length < PLATFORM_NEWS_MAX_ITEMS;

  function addPlatformNewsItem() {
    if (!canAddPlatformNewsItem) return;
    setPlatformNewsItems((prev) => [
      ...prev,
      { id: `platform-news-${Date.now()}`, imageUrl: "", description: "", descriptionEn: null },
    ]);
  }

  function addPlatformDetailsItem() {
    if (!canAddPlatformDetailItem) return;
    setPlatformDetailsItems((prev) => [
      ...prev,
      {
        id: `platform-detail-${Date.now()}`,
        title: "",
        titleEn: null,
        description: "",
        descriptionEn: null,
        iconType: "preset",
        presetIcon: "chat",
        customIconUrl: null,
      },
    ]);
  }

  return (
    <>
      <form
        id="homepage-settings-form"
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
      >
      {saving ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
          <div className="w-[min(92vw,22rem)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center shadow-[var(--shadow-hover)]">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">{t(`${Hp}.savingOverlayTitle`)}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${Hp}.savingOverlaySubtitle`)}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="loading-dot h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] [animation-delay:-0.32s]" />
              <span className="loading-dot h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] [animation-delay:-0.16s]" />
              <span className="loading-dot h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
            </div>
          </div>
        </div>
      ) : null}
      {error && (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-[var(--radius-btn)] bg-emerald-500/15 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {success}
        </div>
      )}

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-foreground)]">{fh("layoutTitle")}</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">{fh("layoutIntro")}</p>

        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <input
              type="radio"
              name="heroTemplate"
              className="mt-1 accent-[var(--color-primary)]"
              checked={form.heroTemplate === "classic"}
              onChange={() => setForm((f) => ({ ...f, heroTemplate: "classic" }))}
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--color-foreground)]">{fh("templateClassicTitle")}</span>
              <span className="text-xs text-[var(--color-muted)]">{fh("templateClassicDesc")}</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <input
              type="radio"
              name="heroTemplate"
              className="mt-1 accent-[var(--color-primary)]"
              checked={form.heroTemplate === "image_slider"}
              onChange={() => setForm((f) => ({ ...f, heroTemplate: "image_slider" }))}
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--color-foreground)]">{fh("templateSliderTitle")}</span>
              <span className="text-xs text-[var(--color-muted)]">{fh("templateSliderDesc")}</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <input
              type="radio"
              name="heroTemplate"
              className="mt-1 accent-[var(--color-primary)]"
              checked={form.heroTemplate === "coming_soon"}
              onChange={() => setForm((f) => ({ ...f, heroTemplate: "coming_soon" }))}
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--color-foreground)]">{fh("templateAppTitle")}</span>
              <span className="text-xs text-[var(--color-muted)]">{fh("templateAppDesc")}</span>
            </span>
          </label>
        </div>

        {form.heroTemplate === "coming_soon" ? (
          <div className="mt-4 space-y-4 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("hero3TitleLabel")}</label>
              <input
                type="text"
                value={form.hero3Title}
                onChange={(e) => setForm((f) => ({ ...f, hero3Title: e.target.value }))}
                maxLength={300}
                placeholder={fh("hero3TitleArPh")}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
              <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("hero3TitleEnLabel")}</label>
              <input
                type="text"
                value={form.hero3TitleEn}
                onChange={(e) => setForm((f) => ({ ...f, hero3TitleEn: e.target.value }))}
                maxLength={300}
                placeholder={fh("hero3TitleEnPh")}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("hero3SubtitleLabel")}</label>
              <input
                type="text"
                value={form.hero3Subtitle}
                onChange={(e) => setForm((f) => ({ ...f, hero3Subtitle: e.target.value }))}
                maxLength={600}
                placeholder={fh("hero3SubtitleArPh")}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
              <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("hero3SubtitleEnLabel")}</label>
              <input
                type="text"
                value={form.hero3SubtitleEn}
                onChange={(e) => setForm((f) => ({ ...f, hero3SubtitleEn: e.target.value }))}
                maxLength={600}
                placeholder={fh("hero3SubtitleEnPh")}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("hero3PhoneLabel")}</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {form.hero3PhoneImageUrl ? (
                  <img
                    src={form.hero3PhoneImageUrl}
                    alt={fh("hero3PhonePreviewAlt")}
                    className="h-14 w-12 rounded border border-[var(--color-border)] object-cover"
                  />
                ) : null}
                <input
                  type="text"
                  value={form.hero3PhoneImageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, hero3PhoneImageUrl: e.target.value }))}
                  placeholder={fh("hero3PhoneUrlPh")}
                  className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                />
                <label className="shrink-0 cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/20 disabled:opacity-50">
                  {hero3Uploading === "phone" ? fh("uploading") : fh("hero3UploadPhone")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={hero3Uploading !== null}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setHero3Uploading("phone");
                      try {
                        const fd = new FormData();
                        fd.set("file", f);
                        const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data.url) {
                          setForm((prev) => ({ ...prev, hero3PhoneImageUrl: data.url }));
                        }
                      } finally {
                        setHero3Uploading(null);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, hero3PhoneImageUrl: "" }))}
                  className="shrink-0 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/40"
                >
                  {fh("hero3DeletePhone")}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("hero3PhoneBgLabel")}</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={normalizeHeroHex(form.hero3PhoneBgColor) ?? "#facc15"}
                  onChange={(e) => setForm((f) => ({ ...f, hero3PhoneBgColor: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={form.hero3PhoneBgColor}
                  onChange={(e) => setForm((f) => ({ ...f, hero3PhoneBgColor: e.target.value }))}
                  placeholder="#FACC15"
                  className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
            {[
              { id: "1", imageKey: "hero3StoreBadge1ImageUrl", linkKey: "hero3StoreBadge1Link", uploading: "badge1" as const, labelKey: "hero3Badge1" as const },
              { id: "2", imageKey: "hero3StoreBadge2ImageUrl", linkKey: "hero3StoreBadge2Link", uploading: "badge2" as const, labelKey: "hero3Badge2" as const },
            ].map((badge) => {
              const badgeLabel = fh(badge.labelKey);
              const imageValue = form[badge.imageKey as "hero3StoreBadge1ImageUrl" | "hero3StoreBadge2ImageUrl"];
              const linkValue = form[badge.linkKey as "hero3StoreBadge1Link" | "hero3StoreBadge2Link"];
              return (
                <div key={badge.id} className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <p className="mb-2 text-xs font-semibold text-[var(--color-muted)]">{badgeLabel}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {imageValue ? (
                      <img
                        src={imageValue}
                        alt={fillMessage(fh("previewLabeled"), { label: badgeLabel })}
                        className="h-10 rounded border border-[var(--color-border)] object-contain bg-black/10 px-2"
                      />
                    ) : null}
                    <input
                      type="text"
                      value={imageValue}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [badge.imageKey]: e.target.value }))
                      }
                      placeholder={fillMessage(fh("badgeImageUrlFor"), { label: badgeLabel })}
                      className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    />
                    <label className="shrink-0 cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-xs font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/20 disabled:opacity-50">
                      {hero3Uploading === badge.uploading ? fh("uploading") : fh("uploadBadge")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={hero3Uploading !== null}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setHero3Uploading(badge.uploading);
                          try {
                            const fd = new FormData();
                            fd.set("file", f);
                            const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                            const data = await res.json().catch(() => ({}));
                            if (res.ok && data.url) {
                              setForm((prev) => ({ ...prev, [badge.imageKey]: data.url }));
                            }
                          } finally {
                            setHero3Uploading(null);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          [badge.imageKey]: "",
                          [badge.linkKey]: "",
                        }))
                      }
                      className="shrink-0 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/40"
                    >
                      {fh("deleteBadge")}
                    </button>
                  </div>
                  <input
                    type="url"
                    value={linkValue}
                    onChange={(e) => setForm((f) => ({ ...f, [badge.linkKey]: e.target.value }))}
                    placeholder={fillMessage(fh("linkForBadge"), { label: badgeLabel })}
                    className="mt-2 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {form.heroTemplate === "image_slider" ? (
          <div className="mt-4 space-y-4 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <p className="text-sm text-[var(--color-muted)]">{fh("sliderIntro")}</p>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("sliderIntervalLabel")}</label>
              <input
                type="number"
                min={2}
                max={20}
                step={1}
                value={form.heroSliderIntervalSeconds}
                onChange={(e) => setForm((f) => ({ ...f, heroSliderIntervalSeconds: e.target.value }))}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </div>
            {SLIDER_IMAGE_FIELDS.map(({ idx, key, courseIdKey }) => {
              const current = form[key];
              const courseIdValue = form[courseIdKey];
              return (
                <div key={idx}>
                  <label className="block text-sm font-medium text-[var(--color-foreground)]">
                    {fillMessage(fh("sliderImageN"), { n: idx })}
                  </label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {current ? (
                      <img
                        src={current}
                        alt={fillMessage(fh("sliderPreviewN"), { n: idx })}
                        className="h-12 w-16 rounded border border-[var(--color-border)] object-cover"
                      />
                    ) : null}
                    <input
                      type="text"
                      value={current}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={fh("sliderUrlPh")}
                      className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                    />
                    <label className="shrink-0 cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/20 disabled:opacity-50">
                      {sliderImageUploading === idx ? fh("uploading") : fillMessage(fh("uploadN"), { n: idx })}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={sliderImageUploading !== null}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setSliderImageUploading(idx as 1 | 2 | 3 | 4 | 5);
                          try {
                            const fd = new FormData();
                            fd.set("file", f);
                            const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                            const data = await res.json().catch(() => ({}));
                            if (res.ok && data.url) {
                              setForm((prev) => ({ ...prev, [key]: data.url }));
                            }
                          } finally {
                            setSliderImageUploading(null);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                  <label className="mt-2 block text-sm font-medium text-[var(--color-foreground)]">
                    {fh("linkPublishedCourse")}
                  </label>
                  <select
                    value={courseIdValue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [courseIdKey]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  >
                    <option value="">{fh("noCourseLink")}</option>
                    {publishedCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {(c.titleAr ?? c.title).trim() || c.slug}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">{fh("teacherImageTitle")}</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{fh("teacherImageIntro")}</p>
        {form.teacherImageUrl ? (
          <div className="mb-3">
            <img
              src={form.teacherImageUrl}
              alt={fh("previewAlt")}
              className="h-32 w-40 rounded-[var(--radius-btn)] border border-[var(--color-border)] object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
            {imageUploading ? fh("uploading") : fh("chooseImageToUpload")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={imageUploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setImageUploadError("");
                setImageUploading(true);
                try {
                  const fd = new FormData();
                  fd.set("file", f);
                  const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok && data.url) {
                    setForm((prev) => ({ ...prev, teacherImageUrl: data.url }));
                  } else {
                    setImageUploadError(data.error ?? fh("uploadFailed"));
                  }
                } catch {
                  setImageUploadError(fh("connectionFailed"));
                } finally {
                  setImageUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
        {imageUploadError && <p className="mt-1 text-sm text-red-600">{imageUploadError}</p>}
        <input
          type="text"
          value={form.teacherImageUrl}
          onChange={(e) => { setForm((f) => ({ ...f, teacherImageUrl: e.target.value })); setImageUploadError(""); }}
          placeholder={fh("teacherImageUrlPh")}
          className="mt-2 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        />

        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">{fh("heroBgCardTitle")}</h4>
          <p className="mb-3 text-sm text-[var(--color-muted)]">{fh("heroBgCardIntro")}</p>
          <div className="mb-4 flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-foreground)]">
              <input
                type="radio"
                name="heroBgMode"
                className="accent-[var(--color-primary)]"
                checked={!form.heroBgUseCustom}
                onChange={() =>
                  setForm((f) => {
                    const g =
                      HERO_BG_PRESET_GRADIENTS[f.heroBgPreset] ?? HERO_BG_PRESET_GRADIENTS.navy;
                    return { ...f, heroBgUseCustom: false, heroBgCustomFrom: g.from, heroBgCustomTo: g.to };
                  })
                }
              />
              {fh("presetGradients")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-foreground)]">
              <input
                type="radio"
                name="heroBgMode"
                className="accent-[var(--color-primary)]"
                checked={form.heroBgUseCustom}
                onChange={() => setForm((f) => ({ ...f, heroBgUseCustom: true }))}
              />
              {fh("customGradient")}
            </label>
          </div>

          {!form.heroBgUseCustom ? (
            <div className="flex flex-wrap gap-3">
              {HERO_BG_PRESET_IDS.map((presetId) => {
                const grad = HERO_BG_PRESET_GRADIENTS[presetId];
                const label = t(`${Hp}.heroPreset.${presetId}`);
                return (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        heroBgPreset: presetId,
                        heroBgCustomFrom: grad.from,
                        heroBgCustomTo: grad.to,
                      }))
                    }
                    className={`flex flex-col items-center gap-1 rounded-[var(--radius-btn)] border-2 p-2 transition ${
                      form.heroBgPreset === presetId
                        ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30"
                        : "border-[var(--color-border)] hover:border-[var(--color-muted)]"
                    }`}
                    title={label}
                  >
                    <span
                      className="h-10 w-14 rounded border border-white/20"
                      style={{
                        background: `linear-gradient(180deg, ${grad.from} 0%, ${grad.to} 100%)`,
                      }}
                    />
                    <span className="max-w-[7rem] text-center text-xs font-medium text-[var(--color-foreground)]">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <p className="text-sm text-[var(--color-muted)]">
                {fh("customGradientIntro")}{" "}
                <code className="rounded bg-[var(--color-border)]/40 px-1">#14162E</code>.
              </p>
              <div
                className="h-14 w-full max-w-md rounded border border-[var(--color-border)]"
                style={{
                  background: `linear-gradient(180deg, ${normalizeHeroHex(form.heroBgCustomFrom) ?? "#14162E"} 0%, ${normalizeHeroHex(form.heroBgCustomTo) ?? "#1E2145"} 100%)`,
                }}
                aria-hidden
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">{fh("gradientTop")}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={normalizeHeroHex(form.heroBgCustomFrom) ?? "#14162e"}
                      onChange={(e) => setForm((f) => ({ ...f, heroBgCustomFrom: e.target.value }))}
                      className="h-10 w-14 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0.5"
                      aria-label={fh("ariaGradientTop")}
                    />
                    <input
                      type="text"
                      value={form.heroBgCustomFrom}
                      onChange={(e) => setForm((f) => ({ ...f, heroBgCustomFrom: e.target.value }))}
                      placeholder="#14162E"
                      className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">{fh("gradientBottom")}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={normalizeHeroHex(form.heroBgCustomTo) ?? "#1e2145"}
                      onChange={(e) => setForm((f) => ({ ...f, heroBgCustomTo: e.target.value }))}
                      className="h-10 w-14 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0.5"
                      aria-label={fh("ariaGradientBottom")}
                    />
                    <input
                      type="text"
                      value={form.heroBgCustomTo}
                      onChange={(e) => setForm((f) => ({ ...f, heroBgCustomTo: e.target.value }))}
                      placeholder="#1E2145"
                      className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-foreground)]">{fh("primaryColorTitle")}</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">{fh("primaryColorIntro")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            value={normalizeHeroHex(form.primaryColor) ?? "#0ea5e9"}
            onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
            className="h-10 w-14 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0.5"
            aria-label={fh("ariaPrimaryColor")}
          />
          <input
            type="text"
            value={form.primaryColor}
            onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
            placeholder="#0ea5e9"
            className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-sm text-[var(--color-foreground)]"
          />
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, primaryColor: "" }))}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/50"
          >
            {fh("resetToDefault")}
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">{fh("headerLogoTitle")}</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{fh("headerLogoIntro")}</p>
        {form.headerLogoUrl ? (
          <div className="mb-3 flex items-center gap-3">
            <img
              src={form.headerLogoUrl}
              alt={fh("logoPreviewAlt")}
              className="h-10 w-10 rounded-[10px] border border-[var(--color-border)] object-contain bg-[var(--color-background)] p-1"
            />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, headerLogoUrl: "" }))}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/50"
            >
              {fh("deleteLogo")}
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
            {logoUploading ? fh("uploading") : fh("uploadLogo")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={logoUploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setLogoUploadError("");
                setLogoUploading(true);
                try {
                  const fd = new FormData();
                  fd.set("file", f);
                  const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok && data.url) {
                    setForm((prev) => ({ ...prev, headerLogoUrl: data.url }));
                  } else {
                    setLogoUploadError(data.error ?? fh("uploadFailed"));
                  }
                } catch {
                  setLogoUploadError(fh("connectionFailed"));
                } finally {
                  setLogoUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
        {logoUploadError ? (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{logoUploadError}</p>
        ) : null}
        <input
          type="text"
          value={form.headerLogoUrl}
          onChange={(e) => {
            setForm((f) => ({ ...f, headerLogoUrl: e.target.value }));
            setLogoUploadError("");
          }}
          placeholder={fh("logoUrlPh")}
          className="mt-2 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-foreground)]">{fh("floatImagesTitle")}</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">{fh("floatImagesIntro")}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("float1")}</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {form.heroFloatImage1 ? (
                <img src={form.heroFloatImage1} alt="" className="h-10 w-10 rounded object-cover border border-[var(--color-border)]" />
              ) : null}
              <input
                type="text"
                value={form.heroFloatImage1}
                onChange={(e) => setForm((f) => ({ ...f, heroFloatImage1: e.target.value }))}
                placeholder={fh("floatPh1")}
                className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              />
              <label className="shrink-0 cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/20 disabled:opacity-50">
                {floatImageUploading === 1 ? fh("uploading") : fh("addImage")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={floatImageUploading !== null}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFloatImageUploading(1);
                    try {
                      const fd = new FormData();
                      fd.set("file", f);
                      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.url) setForm((prev) => ({ ...prev, heroFloatImage1: data.url }));
                    } finally {
                      setFloatImageUploading(null);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("float2")}</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {form.heroFloatImage2 ? (
                <img src={form.heroFloatImage2} alt="" className="h-10 w-10 rounded object-cover border border-[var(--color-border)]" />
              ) : null}
              <input
                type="text"
                value={form.heroFloatImage2}
                onChange={(e) => setForm((f) => ({ ...f, heroFloatImage2: e.target.value }))}
                placeholder={fh("floatPh2")}
                className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              />
              <label className="shrink-0 cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/20 disabled:opacity-50">
                {floatImageUploading === 2 ? fh("uploading") : fh("addImage")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={floatImageUploading !== null}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFloatImageUploading(2);
                    try {
                      const fd = new FormData();
                      fd.set("file", f);
                      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.url) setForm((prev) => ({ ...prev, heroFloatImage2: data.url }));
                    } finally {
                      setFloatImageUploading(null);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("float3")}</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {form.heroFloatImage3 ? (
                <img src={form.heroFloatImage3} alt="" className="h-10 w-10 rounded object-cover border border-[var(--color-border)]" />
              ) : null}
              <input
                type="text"
                value={form.heroFloatImage3}
                onChange={(e) => setForm((f) => ({ ...f, heroFloatImage3: e.target.value }))}
                placeholder={fh("floatPh3")}
                className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              />
              <label className="shrink-0 cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/20 disabled:opacity-50">
                {floatImageUploading === 3 ? fh("uploading") : fh("addImage")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={floatImageUploading !== null}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFloatImageUploading(3);
                    try {
                      const fd = new FormData();
                      fd.set("file", f);
                      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.url) setForm((prev) => ({ ...prev, heroFloatImage3: data.url }));
                    } finally {
                      setFloatImageUploading(null);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">{fh("homeTextsTitle")}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("platformNameLabel")}</label>
            <input
              type="text"
              value={form.platformName}
              onChange={(e) => setForm((f) => ({ ...f, platformName: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phPlatformNameAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelFieldEn")}</label>
            <input
              type="text"
              value={form.platformNameEn}
              onChange={(e) => setForm((f) => ({ ...f, platformNameEn: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phPlatformNameEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("heroMainTitleLabel")}</label>
            <input
              type="text"
              value={form.heroTitle}
              onChange={(e) => setForm((f) => ({ ...f, heroTitle: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phHeroTitleAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelHeroTitleEn")}</label>
            <input
              type="text"
              value={form.heroTitleEn}
              onChange={(e) => setForm((f) => ({ ...f, heroTitleEn: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phHeroTitleEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("heroSloganLabel")}</label>
            <input
              type="text"
              value={form.heroSlogan}
              onChange={(e) => setForm((f) => ({ ...f, heroSlogan: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phHeroSloganAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelHeroSloganEn")}</label>
            <input
              type="text"
              value={form.heroSloganEn}
              onChange={(e) => setForm((f) => ({ ...f, heroSloganEn: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phHeroSloganEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("browserTabTitleLabel")}</label>
            <input
              type="text"
              value={form.pageTitle}
              onChange={(e) => setForm((f) => ({ ...f, pageTitle: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phPageTitleAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelPageTitleEn")}</label>
            <input
              type="text"
              value={form.pageTitleEn}
              onChange={(e) => setForm((f) => ({ ...f, pageTitleEn: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phPageTitleEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("footerTitleLabel")}</label>
            <input
              type="text"
              value={form.footerTitle}
              onChange={(e) => setForm((f) => ({ ...f, footerTitle: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phFooterTitleAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelFooterTitleEn")}</label>
            <input
              type="text"
              value={form.footerTitleEn}
              onChange={(e) => setForm((f) => ({ ...f, footerTitleEn: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phFooterTitleEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("footerTaglineLabel")}</label>
            <input
              type="text"
              value={form.footerTagline}
              onChange={(e) => setForm((f) => ({ ...f, footerTagline: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phFooterTaglineAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelFooterTaglineEn")}</label>
            <input
              type="text"
              value={form.footerTaglineEn}
              onChange={(e) => setForm((f) => ({ ...f, footerTaglineEn: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phFooterTaglineEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("copyrightLabel")}</label>
            <input
              type="text"
              value={form.footerCopyright}
              onChange={(e) => setForm((f) => ({ ...f, footerCopyright: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phCopyrightAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelCopyrightEn")}</label>
            <input
              type="text"
              value={form.footerCopyrightEn}
              onChange={(e) => setForm((f) => ({ ...f, footerCopyrightEn: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phCopyrightEn")}
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("copyrightHint")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">{fh("platformDetailsMainTitle")}</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">{fh("platformDetailsMainIntro")}</p>
        <label className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
          <input
            type="checkbox"
            className="accent-[var(--color-primary)]"
            checked={form.platformDetailsEnabled}
            onChange={(e) => setForm((f) => ({ ...f, platformDetailsEnabled: e.target.checked }))}
          />
          {fh("enablePlatformDetails")}
        </label>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("platformDetailsHeadingLabel")}</label>
            <input
              type="text"
              value={form.platformDetailsTitle}
              onChange={(e) => setForm((f) => ({ ...f, platformDetailsTitle: e.target.value }))}
              maxLength={240}
              placeholder={fh("phPlatformDetailsTitle")}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("sectionTitleEnLabel")}</label>
            <input
              type="text"
              value={form.platformDetailsTitleEn}
              onChange={(e) => setForm((f) => ({ ...f, platformDetailsTitleEn: e.target.value }))}
              maxLength={240}
              placeholder={fh("phPlatformDetailsTitleEn")}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("platformDetailsDescLabel")}</label>
            <textarea
              value={form.platformDetailsSubtitle}
              onChange={(e) => setForm((f) => ({ ...f, platformDetailsSubtitle: e.target.value }))}
              rows={2}
              maxLength={500}
              placeholder={fh("phPlatformDetailsDesc")}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("sectionDescEnLabel")}</label>
            <textarea
              value={form.platformDetailsSubtitleEn}
              onChange={(e) => setForm((f) => ({ ...f, platformDetailsSubtitleEn: e.target.value }))}
              rows={2}
              maxLength={500}
              placeholder={fh("phPlatformDetailsDescEn")}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("platformDetailsBgLabel")}</label>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("platformDetailsBgHint")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={normalizeHeroHex(form.platformDetailsBackgroundColor) ?? "#ffffff"}
                onChange={(e) => setForm((f) => ({ ...f, platformDetailsBackgroundColor: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0.5"
                aria-label={fh("ariaPlatformDetailsBg")}
              />
              <input
                type="text"
                value={form.platformDetailsBackgroundColor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, platformDetailsBackgroundColor: e.target.value }))
                }
                placeholder="#F5F7FB"
                className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, platformDetailsBackgroundColor: "" }))}
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)]"
              >
                {fh("useDefault")}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-[var(--color-foreground)]">{fh("cardsUpTo4")}</h4>
            <button
              type="button"
              onClick={addPlatformDetailsItem}
              disabled={!canAddPlatformDetailItem}
              className="rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-primary)] disabled:opacity-50"
            >
              {fh("addCard")}
            </button>
          </div>
          <div className="space-y-3">
            {platformDetailsItems.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--color-muted)]">
                    {fillMessage(fh("cardIndex"), { n: idx + 1 })}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setPlatformDetailsItems((prev) => prev.filter((entry) => entry.id !== item.id))
                    }
                    className="rounded-[var(--radius-btn)] border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400"
                  >
                    {fh("delete")}
                  </button>
                </div>
                <div className="grid gap-3">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      setPlatformDetailsItems((prev) =>
                        prev.map((entry) =>
                          entry.id === item.id ? { ...entry, title: e.target.value } : entry,
                        ),
                      )
                    }
                    maxLength={120}
                    placeholder={fh("cardTitlePh")}
                    className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={item.titleEn ?? ""}
                    onChange={(e) =>
                      setPlatformDetailsItems((prev) =>
                        prev.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, titleEn: e.target.value || null }
                            : entry,
                        ),
                      )
                    }
                    maxLength={120}
                    placeholder={fh("cardTitleEnPh")}
                    className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      setPlatformDetailsItems((prev) =>
                        prev.map((entry) =>
                          entry.id === item.id ? { ...entry, description: e.target.value } : entry,
                        ),
                      )
                    }
                    rows={2}
                    maxLength={400}
                    placeholder={fh("cardDescPh")}
                    className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  />
                  <textarea
                    value={item.descriptionEn ?? ""}
                    onChange={(e) =>
                      setPlatformDetailsItems((prev) =>
                        prev.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, descriptionEn: e.target.value || null }
                            : entry,
                        ),
                      )
                    }
                    rows={2}
                    maxLength={400}
                    placeholder={fh("cardDescEnPh")}
                    className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-[var(--color-foreground)]">
                      <input
                        type="radio"
                        name={`platform-icon-type-${item.id}`}
                        checked={item.iconType === "preset"}
                        onChange={() =>
                          setPlatformDetailsItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id ? { ...entry, iconType: "preset" } : entry,
                            ),
                          )
                        }
                      />
                      {fh("iconPreset")}
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--color-foreground)]">
                      <input
                        type="radio"
                        name={`platform-icon-type-${item.id}`}
                        checked={item.iconType === "upload"}
                        onChange={() =>
                          setPlatformDetailsItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id ? { ...entry, iconType: "upload" } : entry,
                            ),
                          )
                        }
                      />
                      {fh("iconUpload")}
                    </label>
                  </div>
                  {item.iconType === "preset" ? (
                    <div className="grid grid-cols-4 gap-2">
                      {PLATFORM_DETAILS_PRESET_ICON_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setPlatformDetailsItems((prev) =>
                              prev.map((entry) =>
                                entry.id === item.id ? { ...entry, presetIcon: opt.id } : entry,
                              ),
                            )
                          }
                          title={opt.label}
                          className={`flex h-12 items-center justify-center rounded-[var(--radius-btn)] border ${
                            item.presetIcon === opt.id
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                              : "border-[var(--color-border)] text-[var(--color-muted)]"
                          }`}
                        >
                          {renderPresetIcon(opt.id, "h-5 w-5")}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={item.customIconUrl ?? ""}
                          onChange={(e) =>
                            setPlatformDetailsItems((prev) =>
                              prev.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, customIconUrl: e.target.value || null }
                                  : entry,
                              ),
                            )
                          }
                          placeholder={fh("iconUrlPh")}
                          className="min-w-[180px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                        />
                        <label className="cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-primary)]">
                          {platformItemUploading === item.id ? fh("uploading") : fh("uploadIcon")}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                            className="hidden"
                            disabled={platformItemUploading !== null}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setPlatformItemUploading(item.id);
                              try {
                                const fd = new FormData();
                                fd.set("file", f);
                                const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                                const data = await res.json().catch(() => ({}));
                                if (res.ok && data.url) {
                                  setPlatformDetailsItems((prev) =>
                                    prev.map((entry) =>
                                      entry.id === item.id ? { ...entry, customIconUrl: data.url } : entry,
                                    ),
                                  );
                                }
                              } finally {
                                setPlatformItemUploading(null);
                                e.target.value = "";
                              }
                            }}
                          />
                        </label>
                      </div>
                      {item.customIconUrl ? (
                        <img
                          src={item.customIconUrl}
                          alt={fh("iconPreviewAlt")}
                          className="h-10 w-10 rounded border border-[var(--color-border)] object-contain p-1"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPlatformDetailsItems([...DEFAULT_PLATFORM_DETAILS_ITEMS])}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)]"
          >
            {fh("restoreDefaultCards")}
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">{fh("reviewsBlockTitle")}</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{fh("reviewsBlockIntro")}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("sectionTitleGeneric")}</label>
            <input
              type="text"
              value={form.reviewsSectionTitle}
              onChange={(e) => setForm((f) => ({ ...f, reviewsSectionTitle: e.target.value }))}
              maxLength={400}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phReviewsTitleAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelReviewsTitleEn")}</label>
            <input
              type="text"
              value={form.reviewsSectionTitleEn}
              onChange={(e) => setForm((f) => ({ ...f, reviewsSectionTitleEn: e.target.value }))}
              maxLength={400}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phReviewsTitleEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("reviewsSubtitleLabel")}</label>
            <input
              type="text"
              value={form.reviewsSectionSubtitle}
              onChange={(e) => setForm((f) => ({ ...f, reviewsSectionSubtitle: e.target.value }))}
              maxLength={400}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phReviewsSubAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelReviewsSubEn")}</label>
            <input
              type="text"
              value={form.reviewsSectionSubtitleEn}
              onChange={(e) => setForm((f) => ({ ...f, reviewsSectionSubtitleEn: e.target.value }))}
              maxLength={400}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phReviewsSubEn")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">{fh("newsBlockTitle")}</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{fh("newsBlockIntro")}</p>
        <div className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="platformNewsEnabled"
            checked={form.platformNewsEnabled}
            onChange={(e) => setForm((f) => ({ ...f, platformNewsEnabled: e.target.checked }))}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          <label htmlFor="platformNewsEnabled" className="text-sm font-medium text-[var(--color-foreground)]">
            {fh("enableNews")}
          </label>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("newsSectionTitleLabel")}</label>
          <input
            type="text"
            value={form.platformNewsSectionTitle}
            onChange={(e) => setForm((f) => ({ ...f, platformNewsSectionTitle: e.target.value }))}
            maxLength={240}
            className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
            placeholder={fh("phNewsTitleAr")}
          />
          <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelNewsTitleEn")}</label>
          <input
            type="text"
            value={form.platformNewsSectionTitleEn}
            onChange={(e) => setForm((f) => ({ ...f, platformNewsSectionTitleEn: e.target.value }))}
            maxLength={240}
            className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
            placeholder={fh("phNewsTitleEn")}
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("newsTitleDefaultHint")}</p>
        </div>
        <div className="space-y-4">
          {platformNewsItems.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--color-foreground)]">
                  {fillMessage(fh("newsItemN"), { n: idx + 1 })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPlatformNewsItems((prev) => prev.filter((entry) => entry.id !== item.id))
                  }
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  {fh("delete")}
                </button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="shrink-0">
                  <label className="block text-xs text-[var(--color-muted)]">{fh("newsImageLabel")}</label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-primary)]">
                      {platformNewsUploading === item.id ? fh("uploading") : fh("uploadImage")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={platformNewsUploading !== null}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setPlatformNewsUploading(item.id);
                          try {
                            const fd = new FormData();
                            fd.set("file", file);
                            const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                            const data = await res.json().catch(() => ({}));
                            if (res.ok && data.url) {
                              setPlatformNewsItems((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id ? { ...entry, imageUrl: data.url } : entry,
                                ),
                              );
                            }
                          } finally {
                            setPlatformNewsUploading(null);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="mt-2 h-24 max-w-[200px] rounded border border-[var(--color-border)] object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <label className="block text-xs text-[var(--color-muted)]">{fh("eventDescriptionLabel")}</label>
                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      setPlatformNewsItems((prev) =>
                        prev.map((entry) =>
                          entry.id === item.id ? { ...entry, description: e.target.value } : entry,
                        ),
                      )
                    }
                    maxLength={1000}
                    rows={3}
                    className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    placeholder={fh("phNewsCaption")}
                  />
                  <label className="mt-2 block text-xs text-[var(--color-muted)]">{fh("eventDescriptionEnLabel")}</label>
                  <textarea
                    value={item.descriptionEn ?? ""}
                    onChange={(e) =>
                      setPlatformNewsItems((prev) =>
                        prev.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, descriptionEn: e.target.value || null }
                            : entry,
                        ),
                      )
                    }
                    maxLength={1000}
                    rows={2}
                    className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                    placeholder={fh("phNewsCaptionEn")}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addPlatformNewsItem}
            disabled={!canAddPlatformNewsItem}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] disabled:opacity-50"
          >
            {canAddPlatformNewsItem
              ? fillMessage(fh("addNewsWithCount"), {
                  current: platformNewsItems.length,
                  max: PLATFORM_NEWS_MAX_ITEMS,
                })
              : fh("addNews")}
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">{fh("ctaBlockTitle")}</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{fh("ctaBlockIntro")}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("ctaBadgeLabel")}</label>
            <input
              type="text"
              value={form.ctaBadgeText}
              onChange={(e) => setForm((f) => ({ ...f, ctaBadgeText: e.target.value }))}
              maxLength={120}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phCtaBadgeAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelCtaBadgeEn")}</label>
            <input
              type="text"
              value={form.ctaBadgeTextEn}
              onChange={(e) => setForm((f) => ({ ...f, ctaBadgeTextEn: e.target.value }))}
              maxLength={120}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phCtaBadgeEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("ctaHeadlineLabel")}</label>
            <input
              type="text"
              value={form.ctaTitle}
              onChange={(e) => setForm((f) => ({ ...f, ctaTitle: e.target.value }))}
              maxLength={300}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phCtaTitleAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelCtaTitleEn")}</label>
            <input
              type="text"
              value={form.ctaTitleEn}
              onChange={(e) => setForm((f) => ({ ...f, ctaTitleEn: e.target.value }))}
              maxLength={300}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phCtaTitleEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("ctaDescLabel")}</label>
            <textarea
              value={form.ctaDescription}
              onChange={(e) => setForm((f) => ({ ...f, ctaDescription: e.target.value }))}
              maxLength={2000}
              rows={4}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phCtaDescAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelCtaDescEn")}</label>
            <textarea
              value={form.ctaDescriptionEn}
              onChange={(e) => setForm((f) => ({ ...f, ctaDescriptionEn: e.target.value }))}
              maxLength={2000}
              rows={4}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phCtaDescEn")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("ctaButtonLabel")}</label>
            <input
              type="text"
              value={form.ctaButtonText}
              onChange={(e) => setForm((f) => ({ ...f, ctaButtonText: e.target.value }))}
              maxLength={120}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phCtaBtnAr")}
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelCtaBtnEn")}</label>
            <input
              type="text"
              value={form.ctaButtonTextEn}
              onChange={(e) => setForm((f) => ({ ...f, ctaButtonTextEn: e.target.value }))}
              maxLength={120}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
              placeholder={fh("phCtaBtnEn")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">{fh("socialBlockTitle")}</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{fh("socialBlockIntro")}</p>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("socialRightWord")}</label>
              <input
                type="text"
                value={form.socialRightLabel}
                onChange={(e) => setForm((f) => ({ ...f, socialRightLabel: e.target.value }))}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                placeholder={fh("phSocialRightAr")}
              />
              <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelSocialRightEn")}</label>
              <input
                type="text"
                value={form.socialRightLabelEn}
                onChange={(e) => setForm((f) => ({ ...f, socialRightLabelEn: e.target.value }))}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                placeholder={fh("phSocialRightEn")}
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {fillMessage(t(`${Hp}.previewYoutubeRight`), {
                  label: form.socialRightLabel || t(`${Hp}.exampleSocialRight`),
                })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("socialLeftWord")}</label>
              <input
                type="text"
                value={form.socialLeftLabel}
                onChange={(e) => setForm((f) => ({ ...f, socialLeftLabel: e.target.value }))}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                placeholder={fh("phSocialLeftAr")}
              />
              <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{fh("labelSocialLeftEn")}</label>
              <input
                type="text"
                value={form.socialLeftLabelEn}
                onChange={(e) => setForm((f) => ({ ...f, socialLeftLabelEn: e.target.value }))}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                placeholder={fh("phSocialLeftEn")}
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {fillMessage(t(`${Hp}.previewYoutubeRight`), {
                  label: form.socialLeftLabel || t(`${Hp}.exampleSocialLeft`),
                })}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
            <input
              type="checkbox"
              className="accent-[var(--color-primary)]"
              checked={form.socialLeftEnabled}
              onChange={(e) => setForm((f) => ({ ...f, socialLeftEnabled: e.target.checked }))}
            />
            {fh("enableLeftSocial")}
          </label>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("youtubeTeacher")}</label>
            <input
              type="url"
              value={form.youtubeUrl}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="https://youtube.com/@channel"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesYoutube")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("linkedinTeacher")}</label>
            <input
              type="url"
              value={form.linkedinUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="https://www.linkedin.com/in/..."
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesLinkedin")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("whatsappTeacher")}</label>
            <input
              type="url"
              value={form.whatsappUrl}
              onChange={(e) => setForm((f) => ({ ...f, whatsappUrl: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="https://wa.me/966553612356"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesWhatsapp")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("facebookTeacher")}</label>
            <input
              type="url"
              value={form.facebookUrl}
              onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="https://www.facebook.com/..."
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesFacebook")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("telegramTeacher")}</label>
            <input
              type="text"
              value={form.telegramUrl}
              onChange={(e) => setForm((f) => ({ ...f, telegramUrl: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={fh("phTelegram")}
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesTelegram")}</p>
          </div>
          <hr className="border-[var(--color-border)]" />
          {form.socialLeftEnabled ? (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("youtubeTeam")}</label>
                <input
                  type="url"
                  value={form.teamYoutubeUrl}
                  onChange={(e) => setForm((f) => ({ ...f, teamYoutubeUrl: e.target.value }))}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder="https://youtube.com/@team"
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesYoutubeTeam")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("linkedinTeam")}</label>
                <input
                  type="url"
                  value={form.teamLinkedinUrl}
                  onChange={(e) => setForm((f) => ({ ...f, teamLinkedinUrl: e.target.value }))}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder="https://www.linkedin.com/company/..."
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesLinkedinTeam")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("whatsappTeam")}</label>
                <input
                  type="url"
                  value={form.teamWhatsappUrl}
                  onChange={(e) => setForm((f) => ({ ...f, teamWhatsappUrl: e.target.value }))}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder="https://wa.me/966553612356"
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesWhatsappTeam")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("facebookTeam")}</label>
                <input
                  type="url"
                  value={form.teamFacebookUrl}
                  onChange={(e) => setForm((f) => ({ ...f, teamFacebookUrl: e.target.value }))}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder="https://www.facebook.com/..."
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesFacebookTeam")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{fh("telegramTeam")}</label>
                <input
                  type="text"
                  value={form.teamTelegramUrl}
                  onChange={(e) => setForm((f) => ({ ...f, teamTelegramUrl: e.target.value }))}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder={fh("phTelegramTeam")}
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{fh("emptyHidesTelegramTeam")}</p>
              </div>
            </>
          ) : (
            <p className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-muted)]">
              {fh("leftSocialDisabledNote")}
            </p>
          )}
        </div>
      </div>
      </form>
      <div
        className="fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-[0_-12px_40px_rgb(0_0_0/0.06)] backdrop-blur-md supports-[padding:env(safe-area-inset-bottom)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:shadow-[0_-12px_40px_rgb(0_0_0/0.35)]"
        role="region"
        aria-label={t(`${Hp}.saveButtonIdle`)}
      >
        <div className="mx-auto flex max-w-2xl justify-stretch sm:justify-end">
          <button
            form="homepage-settings-form"
            type="submit"
            disabled={saving}
            className="w-full rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {saving ? t(`${Hp}.saveButtonBusy`) : t(`${Hp}.saveButtonIdle`)}
          </button>
        </div>
      </div>
    </>
  );
}
