import Link from "next/link";
import { getServerTranslator } from "@/lib/i18n/server";

export async function Footer({
  footerTitle,
  footerTagline,
  footerCopyright,
}: {
  footerTitle?: string;
  footerTagline?: string;
  footerCopyright?: string;
}) {
  const t = await getServerTranslator();
  const defaultTitle = t("footer.defaultTitle", "منصتي التعليمية");
  const defaultTagline = t("footer.defaultTagline", "تعلم بأسلوب حديث ومنهجية واضحة");
  const defaultCopyright = t("footer.defaultCopyright", "منصتي التعليمية. جميع الحقوق محفوظة.");
  const year = new Date().getFullYear();
  const copyrightText = footerCopyright?.trim() || defaultCopyright;
  return (
    <footer className="footer-black border-t border-neutral-800 bg-black mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-white">
              {footerTitle?.trim() || defaultTitle}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {footerTagline?.trim() || defaultTagline}
            </p>
          </div>
          <div className="flex gap-6">
            <Link
              href="/"
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              {t("common.home", "Home")}
            </Link>
            <Link
              href="/courses"
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              {t("common.courses", "Courses")}
            </Link>
          </div>
        </div>
        <p className="mt-8 border-t border-neutral-800 pt-8 text-center text-sm text-neutral-500">
          © {year} {copyrightText}
        </p>
      </div>
    </footer>
  );
}
