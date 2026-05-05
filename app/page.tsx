import Image from "next/image";
import { Suspense } from "react";
import { unstable_noStore } from "next/cache";
import { preload } from "react-dom";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHomepageSettings, getPublishedCourseSlugsByIds } from "@/lib/db";
import { HeroScrollCue } from "@/components/HeroScrollCue";
import { HeroShootingStar } from "@/components/HeroShootingStar";
import { HomeHeroImageSlider } from "@/components/HomeHeroImageSlider";
import { HomeHeroTemplateThree } from "@/components/HomeHeroTemplateThree";
import {
  HomePageBelowFold,
  HomePageBelowFoldFallback,
} from "@/components/HomePageBelowFold";
import { resolveHeroBgGradient } from "@/lib/hero-bg";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";
import { pickLocalizedText } from "@/lib/i18n/localized-field";

/** عدم تخزين الصفحة مؤقتاً — الكورسات الجديدة والمحذوفة تظهر فوراً */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  unstable_noStore();
  const [t, locale] = await Promise.all([getServerTranslator(), getLocaleFromCookie()]);

  const [session, homepageSettings] = await Promise.all([
    getServerSession(authOptions),
    getHomepageSettings(),
  ]);

  const heroBg = resolveHeroBgGradient(homepageSettings);
  const heroTemplate =
    homepageSettings.heroTemplate === "image_slider"
      ? "image_slider"
      : homepageSettings.heroTemplate === "coming_soon"
        ? "coming_soon"
        : "classic";

  const heroSliderSlots = [
    { src: homepageSettings.heroSliderImage1, courseId: homepageSettings.heroSliderCourseId1 ?? null },
    { src: homepageSettings.heroSliderImage2, courseId: homepageSettings.heroSliderCourseId2 ?? null },
    { src: homepageSettings.heroSliderImage3, courseId: homepageSettings.heroSliderCourseId3 ?? null },
    { src: homepageSettings.heroSliderImage4, courseId: homepageSettings.heroSliderCourseId4 ?? null },
    { src: homepageSettings.heroSliderImage5, courseId: homepageSettings.heroSliderCourseId5 ?? null },
  ];
  const sliderCourseIds = heroSliderSlots
    .map((s) => (s.courseId ? String(s.courseId).trim() : ""))
    .filter(Boolean);
  let sliderCourseSlugMap = new Map<string, string>();
  if (sliderCourseIds.length > 0) {
    try {
      sliderCourseSlugMap = await getPublishedCourseSlugsByIds(sliderCourseIds);
    } catch {
      sliderCourseSlugMap = new Map();
    }
  }
  const heroSliderSlides = heroSliderSlots
    .map((slot) => {
      const src = slot.src ? String(slot.src).trim() : "";
      if (!src) return null;
      const cid = slot.courseId ? String(slot.courseId).trim() : "";
      const slug = cid ? sliderCourseSlugMap.get(cid) : undefined;
      const href = slug ? `/courses/${slug}` : null;
      return { src, href };
    })
    .filter((s): s is { src: string; href: string | null } => s != null);

  const heroSliderIntervalMs =
    typeof homepageSettings.heroSliderIntervalMs === "number"
      ? homepageSettings.heroSliderIntervalMs
      : 5000;
  const heroTextAlignClass = locale === "en" ? "text-left" : "text-right";

  if (heroTemplate === "image_slider" && heroSliderSlides[0]?.src) {
    preload(heroSliderSlides[0].src, { as: "image" });
  } else if (heroTemplate === "classic") {
    const teacherSrc = homepageSettings.teacherImageUrl?.trim() || "/instructor.png";
    preload(teacherSrc, { as: "image" });
  }

  return (
    <div>
      {heroTemplate === "image_slider" ? (
        <section
          className="relative w-full overflow-hidden bg-[var(--color-background)]"
          aria-label={t("home.heroSliderAria", "Hero Slider")}
        >
          <HomeHeroImageSlider slides={heroSliderSlides} intervalMs={heroSliderIntervalMs} />
        </section>
      ) : heroTemplate === "coming_soon" ? (
        <HomeHeroTemplateThree
          title={pickLocalizedText(locale, homepageSettings.hero3Title, homepageSettings.hero3TitleEn) || t("home.defaultHero3Title", "The #1 all-in-one platform")}
          subtitle={pickLocalizedText(locale, homepageSettings.hero3Subtitle, homepageSettings.hero3SubtitleEn) || t("home.defaultHero3Subtitle", "Join over one million students with our plan")}
          phoneImageUrl={homepageSettings.hero3PhoneImageUrl?.trim() || null}
          phoneBgColor={homepageSettings.hero3PhoneBgColor?.trim() || "#FACC15"}
          badge1ImageUrl={homepageSettings.hero3StoreBadge1ImageUrl?.trim() || null}
          badge1Link={homepageSettings.hero3StoreBadge1Link?.trim() || null}
          badge2ImageUrl={homepageSettings.hero3StoreBadge2ImageUrl?.trim() || null}
          badge2Link={homepageSettings.hero3StoreBadge2Link?.trim() || null}
        />
      ) : (
        <section
          className="hero-saas relative min-h-screen w-full flex items-center justify-center overflow-hidden"
          aria-label={t("home.heroAria", "Hero")}
        >
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              background: `linear-gradient(180deg, ${heroBg.from} 0%, ${heroBg.to} 100%)`,
            }}
          />

          <svg
            className="hero-stars absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="star-glow">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {[
              [8, 12], [18, 8], [25, 22], [12, 35], [42, 15], [55, 28], [68, 10], [75, 40], [88, 18], [92, 55],
              [5, 55], [22, 62], [38, 72], [52, 65], [62, 78], [82, 68], [15, 82], [48, 88], [72, 92], [95, 75],
              [30, 45], [58, 52], [85, 42], [10, 68], [35, 28], [70, 58], [45, 38], [78, 25], [20, 50], [65, 35],
              [40, 58], [88, 48], [12, 42], [55, 72], [28, 18], [90, 62], [50, 12], [72, 82], [8, 78], [60, 45],
            ].map(([x, y], i) => (
              <circle
                key={i}
                cx={`${x}%`}
                cy={`${y}%`}
                r={i % 3 === 0 ? 1.2 : 0.8}
                fill="rgba(255,255,255,0.35)"
                filter="url(#star-glow)"
                className="hero-star-dot"
                style={{ animationDelay: `${(i * 0.13) % 5}s` }}
              />
            ))}
          </svg>
          <HeroShootingStar />
          <div className="hero-saas-content relative z-10 mx-auto w-full max-w-6xl min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 -mt-32">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-44 xl:gap-52">
              <div className={`flex-1 ${heroTextAlignClass} order-2 lg:order-1 lg:max-w-2xl`}>
                <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
                  {pickLocalizedText(locale, homepageSettings.heroTitle, homepageSettings.heroTitleEn) || t("home.defaultHeroTitle", "Mr. Essam Mohy")}
                </h1>
                <p className="mt-6 text-2xl font-medium text-sky-200/90 sm:text-3xl">
                  {pickLocalizedText(locale, homepageSettings.heroSlogan, homepageSettings.heroSloganEn) || t("home.defaultHeroSlogan", "Study it... and finally understand it right!")}
                </p>
              </div>
              <div className="flex-shrink-0 order-1 lg:order-2 lg:ml-6">
                <div className="relative">
                  <div className="hero-image-frame h-60 w-60 p-[2px] sm:h-72 sm:w-72 lg:h-80 lg:w-80">
                    <div className="relative h-full w-full">
                      <Image
                        src={homepageSettings.teacherImageUrl || "/instructor.png"}
                        alt={pickLocalizedText(locale, homepageSettings.heroTitle, homepageSettings.heroTitleEn) || t("home.defaultHeroTitle", "Mr. Essam Mohy")}
                        fill
                        sizes="(max-width: 640px) 15rem, (max-width: 1024px) 18rem, 20rem"
                        priority
                        fetchPriority="high"
                        className="hero-image-frame-inner object-cover shadow-2xl"
                      />
                    </div>
                  </div>
                  {/* أيقونات صغيرة — لا تؤثر على LCP */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={homepageSettings.heroFloatImage1 || "/images/ruler.png"}
                    alt=""
                    className="float-icon float-icon-1 absolute -left-14 -top-2 h-12 w-12 object-contain drop-shadow-lg sm:-left-16 sm:top-0 sm:h-14 sm:w-14 lg:-left-20 lg:-top-1 lg:h-16 lg:w-16"
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={homepageSettings.heroFloatImage2 || "/images/notebook.png"}
                    alt=""
                    className="float-icon float-icon-2 absolute -right-14 bottom-2 h-12 w-12 object-contain drop-shadow-lg sm:-right-16 sm:bottom-4 sm:h-14 sm:w-14 lg:-right-20 lg:bottom-2 lg:h-16 lg:w-16"
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={homepageSettings.heroFloatImage3 || "/images/pencil.png"}
                    alt=""
                    className="float-icon float-icon-3 absolute -bottom-7 -left-2 h-11 w-11 object-contain drop-shadow-lg sm:-left-1 sm:-bottom-8 sm:h-12 sm:w-12 lg:-left-3 lg:-bottom-9 lg:h-14 lg:w-14"
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>

          <HeroScrollCue />

          <div className="absolute bottom-0 left-0 w-full leading-[0]">
            <svg
              className="w-full h-auto block"
              viewBox="0 0 1440 280"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0,120 C360,200 1080,40 1440,120 L1440,280 L0,280 Z"
                className="hero-wave-fill"
              />
            </svg>
          </div>
        </section>
      )}

      <div id="home-next-section" className="scroll-mt-20" />

      <Suspense fallback={<HomePageBelowFoldFallback />}>
        <HomePageBelowFold homepageSettings={homepageSettings} session={session} />
      </Suspense>
    </div>
  );
}
