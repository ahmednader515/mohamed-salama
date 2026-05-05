import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { getServerSession } from "next-auth";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";
import { StoreSplashProvider } from "@/components/StoreSplashProvider";
import { InspectGuard } from "@/components/InspectGuard";
import { ForceLogoutGuard } from "@/components/ForceLogoutGuard";
import { authOptions } from "@/lib/auth";
import {
  getHomepageSettings,
  userHasActivePlatformSubscription,
  getLatestPlatformSubscriptionExpiry,
} from "@/lib/db";
import { normalizeHeroHex } from "@/lib/hero-bg";
import { getDir, makeTranslator } from "@/lib/i18n/core";
import { getLocaleFromCookie } from "@/lib/i18n/server";
import { LocaleProvider } from "@/components/LocaleProvider";
import { homepageDefaultForLocale } from "@/lib/homepage-default-for-locale";
import { pickLocalizedText } from "@/lib/i18n/localized-field";
import {
  HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
  HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
  HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
} from "@/lib/homepage-known-defaults";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromCookie();
  const defaultTitle =
    locale === "ar"
      ? "منصتي التعليمية | دورات وتعلم أونلاين"
      : "My Learning Platform | Courses and Online Learning";
  const defaultDescription =
    locale === "ar"
      ? "منصة تعليمية حديثة لدورات البرمجة والتصميم والتطوير"
      : "A modern learning platform for programming, design, and development courses";
  try {
    const settings = await getHomepageSettings();
    const title = pickLocalizedText(locale, settings.pageTitle, settings.pageTitleEn) || defaultTitle;
    return { title, description: defaultDescription };
  } catch {
    return { title: defaultTitle, description: defaultDescription };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromCookie();
  const dir = getDir(locale);
  const t = makeTranslator(locale);
  let platformName: string | null = null;
  let headerLogoUrl: string | null = null;
  let platformPrimaryColor: string | null = null;
  let footerTitle = t("footer.defaultTitle", "منصتي التعليمية");
  let footerTagline = t("footer.defaultTagline", "تعلم بأسلوب حديث ومنهجية واضحة");
  let footerCopyright = t("footer.defaultCopyright", "منصتي التعليمية. جميع الحقوق محفوظة.");
  try {
    const settings = await getHomepageSettings();
    platformName = pickLocalizedText(locale, settings.platformName, settings.platformNameEn) || null;
    headerLogoUrl = settings.headerLogoUrl ?? null;
    platformPrimaryColor = normalizeHeroHex(String(settings.primaryColor ?? "")) ?? null;
    const rawFooterTitle = pickLocalizedText(locale, settings.footerTitle, settings.footerTitleEn);
    const rawFooterTagline = pickLocalizedText(locale, settings.footerTagline, settings.footerTaglineEn);
    const rawFooterCopyright = pickLocalizedText(locale, settings.footerCopyright, settings.footerCopyrightEn);
    footerTitle = homepageDefaultForLocale(
      locale,
      rawFooterTitle,
      HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
      "footer.defaultTitle",
      t,
      "My Learning Platform",
    );
    footerTagline = homepageDefaultForLocale(
      locale,
      rawFooterTagline,
      HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
      "footer.defaultTagline",
      t,
      "Learn with a modern and clear method",
    );
    footerCopyright = homepageDefaultForLocale(
      locale,
      rawFooterCopyright,
      HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
      "footer.defaultCopyright",
      t,
      "My Learning Platform. All rights reserved.",
    );
  } catch {
    // استخدام الافتراضي في الهيدر والفوتر
  }

  let platformSubscriptionExpiryLabel: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role === "STUDENT" && session.user.id) {
      const active = await userHasActivePlatformSubscription(session.user.id);
      if (active) {
        const exp = await getLatestPlatformSubscriptionExpiry(session.user.id);
        if (exp) {
          platformSubscriptionExpiryLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(exp);
        } else {
          platformSubscriptionExpiryLabel = t("header.active", "نشط");
        }
      }
    }
  } catch {
    platformSubscriptionExpiryLabel = null;
  }

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");document.documentElement.classList.add(t==="light"?"light":"dark");})();`,
          }}
        />
        {platformPrimaryColor ? (
          <style
            dangerouslySetInnerHTML={{
              __html: `:root{--platform-primary:${platformPrimaryColor};}`,
            }}
          />
        ) : null}
        </head>
      <body className={`${outfit.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <NextTopLoader
          color={platformPrimaryColor ?? "#0d9488"}
          height={3}
          showSpinner={false}
          easing="ease"
          speed={300}
          shadow="0 0 10px rgba(13,148,136,0.4)"
        />
        <LocaleProvider locale={locale}>
          <SessionProvider>
            <StoreSplashProvider>
            <InspectGuard />
            <ForceLogoutGuard />
            <Header
              platformName={platformName}
              headerLogoUrl={headerLogoUrl}
              platformSubscriptionExpiryLabel={platformSubscriptionExpiryLabel}
            />
            <main className="flex-1">{children}</main>
            <Footer footerTitle={footerTitle} footerTagline={footerTagline} footerCopyright={footerCopyright} />
            </StoreSplashProvider>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
