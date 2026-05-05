import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourseById, getHomepageSettings, updateHomepageSettings } from "@/lib/db";
import { normalizeHeroHex } from "@/lib/hero-bg";
import type { PlatformDetailsItem, PlatformDetailsPresetIcon, PlatformNewsItem } from "@/lib/types";
import { PLATFORM_DETAILS_PRESET_ICON_OPTIONS } from "@/lib/platform-details";
import { PLATFORM_NEWS_MAX_ITEMS } from "@/lib/platform-news";
const PLATFORM_DETAILS_PRESET_ICONS = PLATFORM_DETAILS_PRESET_ICON_OPTIONS.map(
  (option) => option.id,
) as PlatformDetailsPresetIcon[];

/** جلب إعدادات الصفحة الرئيسية — للأدمن */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const settings = await getHomepageSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Dashboard settings/homepage GET:", error);
    return NextResponse.json({ error: "فشل جلب الإعدادات" }, { status: 500 });
  }
}

/** تحديث إعدادات الصفحة الرئيسية — للأدمن */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: {
    heroTemplate?: string | null;
    teacherImageUrl?: string | null;
    heroTitle?: string | null;
    heroTitleEn?: string | null;
    heroSlogan?: string | null;
    heroSloganEn?: string | null;
    platformName?: string | null;
    platformNameEn?: string | null;
    headerLogoUrl?: string | null;
    primaryColor?: string | null;
    youtubeUrl?: string | null;
    linkedinUrl?: string | null;
    whatsappUrl?: string | null;
    facebookUrl?: string | null;
    telegramUrl?: string | null;
    teamYoutubeUrl?: string | null;
    teamLinkedinUrl?: string | null;
    teamWhatsappUrl?: string | null;
    teamFacebookUrl?: string | null;
    teamTelegramUrl?: string | null;
    socialRightLabel?: string | null;
    socialRightLabelEn?: string | null;
    socialLeftLabel?: string | null;
    socialLeftLabelEn?: string | null;
    socialLeftEnabled?: boolean;
    pageTitle?: string | null;
    pageTitleEn?: string | null;
    heroBgPreset?: string | null;
    heroBgCustomFrom?: string | null;
    heroBgCustomTo?: string | null;
    heroFloatImage1?: string | null;
    heroFloatImage2?: string | null;
    heroFloatImage3?: string | null;
    heroSliderImage1?: string | null;
    heroSliderImage2?: string | null;
    heroSliderImage3?: string | null;
    heroSliderImage4?: string | null;
    heroSliderImage5?: string | null;
    heroSliderCourseId1?: string | null;
    heroSliderCourseId2?: string | null;
    heroSliderCourseId3?: string | null;
    heroSliderCourseId4?: string | null;
    heroSliderCourseId5?: string | null;
    heroSliderIntervalSeconds?: number | null;
    heroSliderIntervalMs?: number | null;
    hero3Title?: string | null;
    hero3TitleEn?: string | null;
    hero3Subtitle?: string | null;
    hero3SubtitleEn?: string | null;
    hero3PhoneImageUrl?: string | null;
    hero3PhoneBgColor?: string | null;
    hero3StoreBadge1ImageUrl?: string | null;
    hero3StoreBadge1Link?: string | null;
    hero3StoreBadge2ImageUrl?: string | null;
    hero3StoreBadge2Link?: string | null;
    footerTitle?: string | null;
    footerTitleEn?: string | null;
    footerTagline?: string | null;
    footerTaglineEn?: string | null;
    footerCopyright?: string | null;
    footerCopyrightEn?: string | null;
    reviewsSectionTitle?: string | null;
    reviewsSectionTitleEn?: string | null;
    reviewsSectionSubtitle?: string | null;
    reviewsSectionSubtitleEn?: string | null;
    ctaBadgeText?: string | null;
    ctaBadgeTextEn?: string | null;
    ctaTitle?: string | null;
    ctaTitleEn?: string | null;
    ctaDescription?: string | null;
    ctaDescriptionEn?: string | null;
    ctaButtonText?: string | null;
    ctaButtonTextEn?: string | null;
    platformDetailsEnabled?: boolean;
    platformDetailsTitle?: string | null;
    platformDetailsTitleEn?: string | null;
    platformDetailsSubtitle?: string | null;
    platformDetailsSubtitleEn?: string | null;
    platformDetailsBackgroundColor?: string | null;
    platformDetailsItems?: unknown;
    platformNewsEnabled?: boolean;
    platformNewsItems?: unknown;
    platformNewsSectionTitle?: string | null;
    platformNewsSectionTitleEn?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const header_logo_url =
    body.headerLogoUrl === undefined
      ? undefined
      : body.headerLogoUrl && String(body.headerLogoUrl).trim()
        ? String(body.headerLogoUrl).trim().slice(0, 4000)
        : null;

  let hero_template: string | null | undefined;
  if (body.heroTemplate !== undefined) {
    const val = body.heroTemplate == null ? "" : String(body.heroTemplate).trim();
    if (!val) {
      hero_template = null;
    } else if (val === "classic" || val === "image_slider" || val === "coming_soon") {
      hero_template = val;
    } else {
      return NextResponse.json({ error: "قيمة قالب الواجهة الرئيسية غير صالحة" }, { status: 400 });
    }
  }

  function normalizeSliderImage(input: unknown): string | null {
    const s = input != null ? String(input).trim() : "";
    return s ? s.slice(0, 4000) : null;
  }

  function normalizeSliderCourseId(input: unknown): string | null {
    const s = input != null ? String(input).trim() : "";
    return s ? s.slice(0, 128) : null;
  }

  async function assertPublishedCourseOr400(courseId: string): Promise<NextResponse | null> {
    const course = await getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: "أحد معرفات الكورس المرتبطة بالسلايدر غير موجود" }, { status: 400 });
    }
    const row = course as unknown as Record<string, unknown>;
    const pub = Boolean(row.isPublished ?? row.is_published);
    if (!pub) {
      return NextResponse.json(
        { error: "يمكن ربط السلايدر بكورسات منشورة فقط. ألغِ الربط أو انشر الكورس أولاً." },
        { status: 400 },
      );
    }
    return null;
  }

  let hero_slider_interval_ms: number | null | undefined;
  if (body.heroSliderIntervalSeconds !== undefined || body.heroSliderIntervalMs !== undefined) {
    if (body.heroSliderIntervalSeconds === null || body.heroSliderIntervalMs === null) {
      hero_slider_interval_ms = null;
    } else if (body.heroSliderIntervalSeconds !== undefined) {
      const secondsNum = Number(body.heroSliderIntervalSeconds);
      if (!Number.isFinite(secondsNum) || secondsNum < 2 || secondsNum > 20) {
        return NextResponse.json(
          { error: "مدة التبديل التلقائي يجب أن تكون بين 2 و 20 ثانية" },
          { status: 400 },
        );
      }
      hero_slider_interval_ms = Math.round(secondsNum * 1000);
    } else {
      const num = Number(body.heroSliderIntervalMs);
      if (!Number.isFinite(num) || num < 1500 || num > 20000) {
        return NextResponse.json(
          { error: "مدة التبديل التلقائي يجب أن تكون بين 1500 و 20000 مللي ثانية" },
          { status: 400 },
        );
      }
      hero_slider_interval_ms = Math.round(num);
    }
  }

  let primary_color: string | null | undefined;
  if (body.primaryColor !== undefined) {
    if (body.primaryColor === null) {
      primary_color = null;
    } else {
      const n = normalizeHeroHex(String(body.primaryColor ?? ""));
      if (!n) {
        return NextResponse.json(
          { error: "لون المنصة الأساسي يجب أن يكون بصيغة #RRGGBB (مثال: #0ea5e9)" },
          { status: 400 },
        );
      }
      primary_color = n;
    }
  }

  let hero_bg_custom_from: string | null | undefined;
  let hero_bg_custom_to: string | null | undefined;
  const cf = body.heroBgCustomFrom;
  const ct = body.heroBgCustomTo;
  if (cf !== undefined || ct !== undefined) {
    if (cf === undefined || ct === undefined) {
      return NextResponse.json(
        { error: "يُرسل لونا التدرج المخصّص معاً أو لا يُرسلان" },
        { status: 400 },
      );
    }
    if (cf === null && ct === null) {
      hero_bg_custom_from = null;
      hero_bg_custom_to = null;
    } else {
      const na = normalizeHeroHex(String(cf ?? ""));
      const nb = normalizeHeroHex(String(ct ?? ""));
      if (!na || !nb) {
        return NextResponse.json(
          { error: "التدرج المخصّص يتطلب لونين بصيغة #RRGGBB (مثال: #1a1a2e)" },
          { status: 400 },
        );
      }
      hero_bg_custom_from = na;
      hero_bg_custom_to = nb;
    }
  }

  let hero3_phone_bg_color: string | null | undefined;
  if (body.hero3PhoneBgColor !== undefined) {
    if (body.hero3PhoneBgColor === null) {
      hero3_phone_bg_color = null;
    } else {
      const normalized = normalizeHeroHex(String(body.hero3PhoneBgColor ?? ""));
      if (!normalized) {
        return NextResponse.json(
          { error: "لون خلفية الهاتف في القالب الثالث يجب أن يكون بصيغة #RRGGBB" },
          { status: 400 },
        );
      }
      hero3_phone_bg_color = normalized;
    }
  }

  let platform_details_items: string | null | undefined;
  let platform_details_background_color: string | null | undefined;
  if (body.platformDetailsBackgroundColor !== undefined) {
    if (body.platformDetailsBackgroundColor === null) {
      platform_details_background_color = null;
    } else {
      const normalized = normalizeHeroHex(String(body.platformDetailsBackgroundColor ?? ""));
      if (!normalized) {
        return NextResponse.json(
          { error: "لون خلفية قسم تفاصيل المنصة يجب أن يكون بصيغة #RRGGBB" },
          { status: 400 },
        );
      }
      platform_details_background_color = normalized;
    }
  }
  if (body.platformDetailsItems !== undefined) {
    if (body.platformDetailsItems === null) {
      platform_details_items = null;
    } else if (!Array.isArray(body.platformDetailsItems)) {
      return NextResponse.json({ error: "بيانات بطاقات تفاصيل المنصة غير صالحة" }, { status: 400 });
    } else {
      if (body.platformDetailsItems.length > 4) {
        return NextResponse.json({ error: "الحد الأقصى لبطاقات تفاصيل المنصة هو 4 بطاقات" }, { status: 400 });
      }
      const items: PlatformDetailsItem[] = [];
      for (let i = 0; i < body.platformDetailsItems.length; i++) {
        const raw = body.platformDetailsItems[i];
        if (!raw || typeof raw !== "object") {
          return NextResponse.json({ error: `البطاقة رقم ${i + 1} غير صالحة` }, { status: 400 });
        }
        const item = raw as Record<string, unknown>;
        const iconType = item.iconType === "upload" ? "upload" : "preset";
        const presetIconRaw = String(item.presetIcon ?? "chat").trim() as PlatformDetailsPresetIcon;
        const presetIcon = PLATFORM_DETAILS_PRESET_ICONS.includes(presetIconRaw)
          ? presetIconRaw
          : "chat";
        const title = String(item.title ?? "").trim().slice(0, 120);
        const titleEnRaw = String(item.titleEn ?? "").trim();
        const description = String(item.description ?? "").trim().slice(0, 400);
        const descriptionEnRaw = String(item.descriptionEn ?? "").trim();
        if (!title || !description) {
          return NextResponse.json(
            { error: `عنوان ووصف البطاقة رقم ${i + 1} مطلوبان` },
            { status: 400 },
          );
        }
        const customIconRaw = String(item.customIconUrl ?? "").trim();
        items.push({
          id: String(item.id ?? `platform-detail-${i + 1}`).trim() || `platform-detail-${i + 1}`,
          title,
          titleEn: titleEnRaw ? titleEnRaw.slice(0, 120) : null,
          description,
          descriptionEn: descriptionEnRaw ? descriptionEnRaw.slice(0, 400) : null,
          iconType,
          presetIcon,
          customIconUrl: customIconRaw ? customIconRaw.slice(0, 4000) : null,
        });
      }
      platform_details_items = JSON.stringify(items);
    }
  }

  let platform_news_enabled: boolean | undefined;
  if (body.platformNewsEnabled !== undefined) {
    platform_news_enabled = Boolean(body.platformNewsEnabled);
  }

  let platform_news_items: string | null | undefined;
  if (body.platformNewsItems !== undefined) {
    if (body.platformNewsItems === null) {
      platform_news_items = null;
    } else if (!Array.isArray(body.platformNewsItems)) {
      return NextResponse.json({ error: "بيانات قسم الأخبار غير صالحة" }, { status: 400 });
    } else {
      if (body.platformNewsItems.length > PLATFORM_NEWS_MAX_ITEMS) {
        return NextResponse.json(
          { error: `الحد الأقصى لأخبار المنصة هو ${PLATFORM_NEWS_MAX_ITEMS}` },
          { status: 400 },
        );
      }
      const newsItems: PlatformNewsItem[] = [];
      for (let i = 0; i < body.platformNewsItems.length; i++) {
        const raw = body.platformNewsItems[i];
        if (!raw || typeof raw !== "object") {
          return NextResponse.json({ error: `الخبر رقم ${i + 1} غير صالح` }, { status: 400 });
        }
        const item = raw as Record<string, unknown>;
        const imageUrl = String(item.imageUrl ?? "").trim().slice(0, 4000);
        const description = String(item.description ?? "").trim().slice(0, 1000);
        const descriptionEnRaw = String(item.descriptionEn ?? "").trim();
        if (!imageUrl || !description) {
          return NextResponse.json(
            { error: `صورة ووصف الخبر رقم ${i + 1} مطلوبان` },
            { status: 400 },
          );
        }
        newsItems.push({
          id: String(item.id ?? `platform-news-${i + 1}`).trim() || `platform-news-${i + 1}`,
          imageUrl,
          description,
          descriptionEn: descriptionEnRaw ? descriptionEnRaw.slice(0, 1000) : null,
        });
      }
      platform_news_items = JSON.stringify(newsItems);
    }
  }

  let platform_news_section_title: string | null | undefined;
  if (body.platformNewsSectionTitle !== undefined) {
    if (body.platformNewsSectionTitle === null) {
      platform_news_section_title = null;
    } else {
      const s = String(body.platformNewsSectionTitle ?? "").trim();
      platform_news_section_title = s ? s.slice(0, 240) : null;
    }
  }

  let hero_slider_course_id_1: string | null | undefined;
  let hero_slider_course_id_2: string | null | undefined;
  let hero_slider_course_id_3: string | null | undefined;
  let hero_slider_course_id_4: string | null | undefined;
  let hero_slider_course_id_5: string | null | undefined;
  if (body.heroSliderCourseId1 !== undefined) {
    hero_slider_course_id_1 = normalizeSliderCourseId(body.heroSliderCourseId1);
    if (hero_slider_course_id_1) {
      const bad = await assertPublishedCourseOr400(hero_slider_course_id_1);
      if (bad) return bad;
    }
  }
  if (body.heroSliderCourseId2 !== undefined) {
    hero_slider_course_id_2 = normalizeSliderCourseId(body.heroSliderCourseId2);
    if (hero_slider_course_id_2) {
      const bad = await assertPublishedCourseOr400(hero_slider_course_id_2);
      if (bad) return bad;
    }
  }
  if (body.heroSliderCourseId3 !== undefined) {
    hero_slider_course_id_3 = normalizeSliderCourseId(body.heroSliderCourseId3);
    if (hero_slider_course_id_3) {
      const bad = await assertPublishedCourseOr400(hero_slider_course_id_3);
      if (bad) return bad;
    }
  }
  if (body.heroSliderCourseId4 !== undefined) {
    hero_slider_course_id_4 = normalizeSliderCourseId(body.heroSliderCourseId4);
    if (hero_slider_course_id_4) {
      const bad = await assertPublishedCourseOr400(hero_slider_course_id_4);
      if (bad) return bad;
    }
  }
  if (body.heroSliderCourseId5 !== undefined) {
    hero_slider_course_id_5 = normalizeSliderCourseId(body.heroSliderCourseId5);
    if (hero_slider_course_id_5) {
      const bad = await assertPublishedCourseOr400(hero_slider_course_id_5);
      if (bad) return bad;
    }
  }

  try {
    await updateHomepageSettings({
      hero_template,
      teacher_image_url: body.teacherImageUrl !== undefined ? body.teacherImageUrl : undefined,
      hero_title: body.heroTitle !== undefined ? body.heroTitle : undefined,
      hero_title_en:
        body.heroTitleEn !== undefined
          ? (body.heroTitleEn && String(body.heroTitleEn).trim()
              ? String(body.heroTitleEn).trim().slice(0, 300)
              : null)
          : undefined,
      hero_slogan: body.heroSlogan !== undefined ? body.heroSlogan : undefined,
      hero_slogan_en:
        body.heroSloganEn !== undefined
          ? (body.heroSloganEn && String(body.heroSloganEn).trim()
              ? String(body.heroSloganEn).trim().slice(0, 600)
              : null)
          : undefined,
      platform_name: body.platformName !== undefined ? body.platformName : undefined,
      platform_name_en:
        body.platformNameEn !== undefined
          ? (body.platformNameEn && String(body.platformNameEn).trim()
              ? String(body.platformNameEn).trim().slice(0, 200)
              : null)
          : undefined,
      header_logo_url,
      primary_color,
      youtube_url: body.youtubeUrl !== undefined ? body.youtubeUrl : undefined,
      linkedin_url: body.linkedinUrl !== undefined ? body.linkedinUrl : undefined,
      whatsapp_url: body.whatsappUrl !== undefined ? body.whatsappUrl : undefined,
      facebook_url: body.facebookUrl !== undefined ? body.facebookUrl : undefined,
      telegram_url: body.telegramUrl !== undefined ? body.telegramUrl : undefined,
      team_youtube_url: body.teamYoutubeUrl !== undefined ? body.teamYoutubeUrl : undefined,
      team_linkedin_url: body.teamLinkedinUrl !== undefined ? body.teamLinkedinUrl : undefined,
      team_whatsapp_url: body.teamWhatsappUrl !== undefined ? body.teamWhatsappUrl : undefined,
      team_facebook_url: body.teamFacebookUrl !== undefined ? body.teamFacebookUrl : undefined,
      team_telegram_url: body.teamTelegramUrl !== undefined ? body.teamTelegramUrl : undefined,
      social_right_label:
        body.socialRightLabel !== undefined
          ? (body.socialRightLabel && String(body.socialRightLabel).trim()
              ? String(body.socialRightLabel).trim().slice(0, 120)
              : null)
          : undefined,
      social_right_label_en:
        body.socialRightLabelEn !== undefined
          ? (body.socialRightLabelEn && String(body.socialRightLabelEn).trim()
              ? String(body.socialRightLabelEn).trim().slice(0, 120)
              : null)
          : undefined,
      social_left_label:
        body.socialLeftLabel !== undefined
          ? (body.socialLeftLabel && String(body.socialLeftLabel).trim()
              ? String(body.socialLeftLabel).trim().slice(0, 120)
              : null)
          : undefined,
      social_left_label_en:
        body.socialLeftLabelEn !== undefined
          ? (body.socialLeftLabelEn && String(body.socialLeftLabelEn).trim()
              ? String(body.socialLeftLabelEn).trim().slice(0, 120)
              : null)
          : undefined,
      social_left_enabled:
        body.socialLeftEnabled !== undefined ? Boolean(body.socialLeftEnabled) : undefined,
      page_title: body.pageTitle !== undefined ? body.pageTitle : undefined,
      page_title_en:
        body.pageTitleEn !== undefined
          ? (body.pageTitleEn && String(body.pageTitleEn).trim()
              ? String(body.pageTitleEn).trim().slice(0, 300)
              : null)
          : undefined,
      hero_bg_preset: body.heroBgPreset !== undefined ? body.heroBgPreset : undefined,
      hero_bg_custom_from,
      hero_bg_custom_to,
      hero_float_image_1: body.heroFloatImage1 !== undefined ? body.heroFloatImage1 : undefined,
      hero_float_image_2: body.heroFloatImage2 !== undefined ? body.heroFloatImage2 : undefined,
      hero_float_image_3: body.heroFloatImage3 !== undefined ? body.heroFloatImage3 : undefined,
      hero_slider_image_1:
        body.heroSliderImage1 !== undefined ? normalizeSliderImage(body.heroSliderImage1) : undefined,
      hero_slider_image_2:
        body.heroSliderImage2 !== undefined ? normalizeSliderImage(body.heroSliderImage2) : undefined,
      hero_slider_image_3:
        body.heroSliderImage3 !== undefined ? normalizeSliderImage(body.heroSliderImage3) : undefined,
      hero_slider_image_4:
        body.heroSliderImage4 !== undefined ? normalizeSliderImage(body.heroSliderImage4) : undefined,
      hero_slider_image_5:
        body.heroSliderImage5 !== undefined ? normalizeSliderImage(body.heroSliderImage5) : undefined,
      hero_slider_course_id_1,
      hero_slider_course_id_2,
      hero_slider_course_id_3,
      hero_slider_course_id_4,
      hero_slider_course_id_5,
      hero_slider_interval_ms,
      hero3_title:
        body.hero3Title !== undefined
          ? (body.hero3Title && String(body.hero3Title).trim()
              ? String(body.hero3Title).trim().slice(0, 300)
              : null)
          : undefined,
      hero3_title_en:
        body.hero3TitleEn !== undefined
          ? (body.hero3TitleEn && String(body.hero3TitleEn).trim()
              ? String(body.hero3TitleEn).trim().slice(0, 300)
              : null)
          : undefined,
      hero3_subtitle:
        body.hero3Subtitle !== undefined
          ? (body.hero3Subtitle && String(body.hero3Subtitle).trim()
              ? String(body.hero3Subtitle).trim().slice(0, 600)
              : null)
          : undefined,
      hero3_subtitle_en:
        body.hero3SubtitleEn !== undefined
          ? (body.hero3SubtitleEn && String(body.hero3SubtitleEn).trim()
              ? String(body.hero3SubtitleEn).trim().slice(0, 600)
              : null)
          : undefined,
      hero3_phone_image_url:
        body.hero3PhoneImageUrl !== undefined
          ? normalizeSliderImage(body.hero3PhoneImageUrl)
          : undefined,
      hero3_phone_bg_color:
        hero3_phone_bg_color,
      hero3_store_badge_1_image_url:
        body.hero3StoreBadge1ImageUrl !== undefined
          ? normalizeSliderImage(body.hero3StoreBadge1ImageUrl)
          : undefined,
      hero3_store_badge_1_link:
        body.hero3StoreBadge1Link !== undefined
          ? (body.hero3StoreBadge1Link && String(body.hero3StoreBadge1Link).trim()
              ? String(body.hero3StoreBadge1Link).trim().slice(0, 4000)
              : null)
          : undefined,
      hero3_store_badge_2_image_url:
        body.hero3StoreBadge2ImageUrl !== undefined
          ? normalizeSliderImage(body.hero3StoreBadge2ImageUrl)
          : undefined,
      hero3_store_badge_2_link:
        body.hero3StoreBadge2Link !== undefined
          ? (body.hero3StoreBadge2Link && String(body.hero3StoreBadge2Link).trim()
              ? String(body.hero3StoreBadge2Link).trim().slice(0, 4000)
              : null)
          : undefined,
      footer_title: body.footerTitle !== undefined ? body.footerTitle : undefined,
      footer_title_en:
        body.footerTitleEn !== undefined
          ? (body.footerTitleEn && String(body.footerTitleEn).trim()
              ? String(body.footerTitleEn).trim().slice(0, 300)
              : null)
          : undefined,
      footer_tagline: body.footerTagline !== undefined ? body.footerTagline : undefined,
      footer_tagline_en:
        body.footerTaglineEn !== undefined
          ? (body.footerTaglineEn && String(body.footerTaglineEn).trim()
              ? String(body.footerTaglineEn).trim().slice(0, 500)
              : null)
          : undefined,
      footer_copyright: body.footerCopyright !== undefined ? body.footerCopyright : undefined,
      footer_copyright_en:
        body.footerCopyrightEn !== undefined
          ? (body.footerCopyrightEn && String(body.footerCopyrightEn).trim()
              ? String(body.footerCopyrightEn).trim().slice(0, 500)
              : null)
          : undefined,
      reviews_section_title:
        body.reviewsSectionTitle !== undefined
          ? (body.reviewsSectionTitle && String(body.reviewsSectionTitle).trim()
              ? String(body.reviewsSectionTitle).trim().slice(0, 400)
              : null)
          : undefined,
      reviews_section_title_en:
        body.reviewsSectionTitleEn !== undefined
          ? (body.reviewsSectionTitleEn && String(body.reviewsSectionTitleEn).trim()
              ? String(body.reviewsSectionTitleEn).trim().slice(0, 400)
              : null)
          : undefined,
      reviews_section_subtitle:
        body.reviewsSectionSubtitle !== undefined
          ? (body.reviewsSectionSubtitle && String(body.reviewsSectionSubtitle).trim()
              ? String(body.reviewsSectionSubtitle).trim().slice(0, 400)
              : null)
          : undefined,
      reviews_section_subtitle_en:
        body.reviewsSectionSubtitleEn !== undefined
          ? (body.reviewsSectionSubtitleEn && String(body.reviewsSectionSubtitleEn).trim()
              ? String(body.reviewsSectionSubtitleEn).trim().slice(0, 400)
              : null)
          : undefined,
      cta_badge_text:
        body.ctaBadgeText !== undefined
          ? (body.ctaBadgeText && String(body.ctaBadgeText).trim()
              ? String(body.ctaBadgeText).trim().slice(0, 120)
              : null)
          : undefined,
      cta_badge_text_en:
        body.ctaBadgeTextEn !== undefined
          ? (body.ctaBadgeTextEn && String(body.ctaBadgeTextEn).trim()
              ? String(body.ctaBadgeTextEn).trim().slice(0, 120)
              : null)
          : undefined,
      cta_title:
        body.ctaTitle !== undefined
          ? (body.ctaTitle && String(body.ctaTitle).trim()
              ? String(body.ctaTitle).trim().slice(0, 300)
              : null)
          : undefined,
      cta_title_en:
        body.ctaTitleEn !== undefined
          ? (body.ctaTitleEn && String(body.ctaTitleEn).trim()
              ? String(body.ctaTitleEn).trim().slice(0, 300)
              : null)
          : undefined,
      cta_description:
        body.ctaDescription !== undefined
          ? (body.ctaDescription && String(body.ctaDescription).trim()
              ? String(body.ctaDescription).trim().slice(0, 2000)
              : null)
          : undefined,
      cta_description_en:
        body.ctaDescriptionEn !== undefined
          ? (body.ctaDescriptionEn && String(body.ctaDescriptionEn).trim()
              ? String(body.ctaDescriptionEn).trim().slice(0, 2000)
              : null)
          : undefined,
      cta_button_text:
        body.ctaButtonText !== undefined
          ? (body.ctaButtonText && String(body.ctaButtonText).trim()
              ? String(body.ctaButtonText).trim().slice(0, 120)
              : null)
          : undefined,
      cta_button_text_en:
        body.ctaButtonTextEn !== undefined
          ? (body.ctaButtonTextEn && String(body.ctaButtonTextEn).trim()
              ? String(body.ctaButtonTextEn).trim().slice(0, 120)
              : null)
          : undefined,
      platform_details_enabled:
        body.platformDetailsEnabled !== undefined ? Boolean(body.platformDetailsEnabled) : undefined,
      platform_details_title:
        body.platformDetailsTitle !== undefined
          ? (body.platformDetailsTitle && String(body.platformDetailsTitle).trim()
              ? String(body.platformDetailsTitle).trim().slice(0, 240)
              : null)
          : undefined,
      platform_details_title_en:
        body.platformDetailsTitleEn !== undefined
          ? (body.platformDetailsTitleEn && String(body.platformDetailsTitleEn).trim()
              ? String(body.platformDetailsTitleEn).trim().slice(0, 240)
              : null)
          : undefined,
      platform_details_subtitle:
        body.platformDetailsSubtitle !== undefined
          ? (body.platformDetailsSubtitle && String(body.platformDetailsSubtitle).trim()
              ? String(body.platformDetailsSubtitle).trim().slice(0, 500)
              : null)
          : undefined,
      platform_details_subtitle_en:
        body.platformDetailsSubtitleEn !== undefined
          ? (body.platformDetailsSubtitleEn && String(body.platformDetailsSubtitleEn).trim()
              ? String(body.platformDetailsSubtitleEn).trim().slice(0, 500)
              : null)
          : undefined,
      platform_details_background_color,
      platform_details_items,
      platform_news_enabled,
      platform_news_items,
      platform_news_section_title,
      platform_news_section_title_en:
        body.platformNewsSectionTitleEn !== undefined
          ? (body.platformNewsSectionTitleEn && String(body.platformNewsSectionTitleEn).trim()
              ? String(body.platformNewsSectionTitleEn).trim().slice(0, 240)
              : null)
          : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Dashboard settings/homepage PUT:", error);
    const lower = msg.toLowerCase();
    // عمود ناقص — غالباً لم يُشغَّل كل سكربت الأعمدة أو DATABASE_URL يشير لقاعدة/فرع مختلف عن Neon حيث نفّذت SQL
    if (lower.includes("column") && lower.includes("does not exist")) {
      const columnMatch =
        typeof msg === "string" ? msg.match(/column\s+"([^"]+)"/i) : null;
      const hint = columnMatch?.[1]
        ? ` (العمود الناقص تقريباً: ${columnMatch[1]})`
        : "";
      return NextResponse.json(
        {
          error: `أعمدة ناقصة في جدول HomepageSetting.${hint} نفّذ في Neon (نفس المشروع المربوط بـ DATABASE_URL) السكربت الكامل scripts/ensure-homepage-setting-columns.sql ثم أعد المحاولة. السكربت القديم whatsapp-facebook-title يضيف 3 حقولاً فقط ولا يكفي.`,
        },
        { status: 500 }
      );
    }
    // جدول غير موجود أصلاً
    if (lower.includes("does not exist") || lower.includes("relation") || lower.includes("homepagesetting")) {
      return NextResponse.json(
        { error: "جدول إعدادات الصفحة الرئيسية غير موجود. نفّذ سكربت scripts/add-homepage-settings.sql في Neon ثم أعد المحاولة." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
  }
}
