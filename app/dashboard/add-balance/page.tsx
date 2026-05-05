import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getHomepageSettings } from "@/lib/db";
import { CopyButton } from "./CopyButton";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";

function toWhatsAppDigits(input: string | null | undefined): string {
  if (!input) return "";
  const digits = String(input).replace(/\D+/g, "");
  return digits;
}

const ABS = "dashboard.addBalanceStudent";

type AddBalanceMsgKey =
  | "title"
  | "subtitle"
  | "methodTitle"
  | "transferInstruction"
  | "confirmationNote"
  | "waitingNote"
  | "whatsappButton";

const ADD_BALANCE_FALLBACK_EN: Record<AddBalanceMsgKey, string> = {
  title: "Add balance",
  subtitle: "Choose a payment method then follow the instructions",
  methodTitle: "Vodafone Cash",
  transferInstruction: "Transfer the required amount to the following wallet number:",
  confirmationNote:
    "After transfer, send the transfer confirmation screenshot on WhatsApp to the number",
  waitingNote:
    "After sending the confirmation screenshot, your balance will be pending review and credited as soon as possible.",
  whatsappButton: "Send confirmation screenshot on WhatsApp",
};

function resolveAddBalanceCopy(
  locale: Locale,
  adminAr: string | null | undefined,
  adminEn: string | null | undefined,
  t: (key: string, fallback: string) => string,
  key: AddBalanceMsgKey,
): string {
  if (locale === "en") {
    const fromAdmin = (adminEn ?? "").trim();
    if (fromAdmin) return fromAdmin;
    return t(`${ABS}.${key}`, ADD_BALANCE_FALLBACK_EN[key]);
  }
  const fromAdmin = (adminAr ?? "").trim();
  if (fromAdmin) return fromAdmin;
  return t(`${ABS}.${key}`, ADD_BALANCE_FALLBACK_EN[key]);
}

export default async function AddBalancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");
  const [settings, locale, t] = await Promise.all([
    getHomepageSettings(),
    getLocaleFromCookie(),
    getServerTranslator(),
  ]);

  const walletNumber = settings.addBalanceWalletNumber?.trim() || "01023005622";
  const whatsappNumber = toWhatsAppDigits(settings.addBalanceWhatsappNumber) || "966553612356";
  const pageTitle = resolveAddBalanceCopy(locale, settings.addBalanceTitle, settings.addBalanceTitleEn, t, "title");
  const pageSubtitle = resolveAddBalanceCopy(
    locale,
    settings.addBalanceSubtitle,
    settings.addBalanceSubtitleEn,
    t,
    "subtitle",
  );
  const methodTitle = resolveAddBalanceCopy(
    locale,
    settings.addBalanceMethodTitle,
    settings.addBalanceMethodTitleEn,
    t,
    "methodTitle",
  );
  const transferInstruction = resolveAddBalanceCopy(
    locale,
    settings.addBalanceTransferInstruction,
    settings.addBalanceTransferInstructionEn,
    t,
    "transferInstruction",
  );
  const confirmationNote = resolveAddBalanceCopy(
    locale,
    settings.addBalanceConfirmationNote,
    settings.addBalanceConfirmationNoteEn,
    t,
    "confirmationNote",
  );
  const waitingNote = resolveAddBalanceCopy(
    locale,
    settings.addBalanceWaitingNote,
    settings.addBalanceWaitingNoteEn,
    t,
    "waitingNote",
  );
  const whatsappButtonText = resolveAddBalanceCopy(
    locale,
    settings.addBalanceWhatsappButtonText,
    settings.addBalanceWhatsappButtonTextEn,
    t,
    "whatsappButton",
  );

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        {t("dashboard.title", "Dashboard")} ←
      </Link>
      <h2 className="mt-6 text-2xl font-bold text-[var(--color-foreground)]">{pageTitle}</h2>
      <p className="mt-1 text-[var(--color-muted)]">{pageSubtitle}</p>

      <div className="mt-8 space-y-6">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{methodTitle}</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{transferInstruction}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-[var(--radius-btn)] bg-[var(--color-background)] px-4 py-2 font-mono text-lg font-semibold text-[var(--color-foreground)]">
              {walletNumber}
            </span>
            <CopyButton
              text={walletNumber}
              copyLabel={t("dashboard.addBalanceStudent.copyWallet", "Copy")}
              copiedLabel={t("dashboard.addBalanceStudent.copiedWallet", "Copied")}
              ariaLabel={t("dashboard.addBalanceStudent.copyWalletAria", "Copy wallet number")}
            />
          </div>
          <div className="mt-6 rounded-[var(--radius-btn)] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {confirmationNote}{" "}
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                {whatsappNumber}
              </a>
            </p>
          </div>
          <p className="mt-4 text-sm text-[var(--color-muted)]">{waitingNote}</p>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-btn)] bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#20BD5A]"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {whatsappButtonText}
          </a>
        </section>
      </div>
    </div>
  );
}
