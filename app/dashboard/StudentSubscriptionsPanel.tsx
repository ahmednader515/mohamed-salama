"use client";

import Link from "next/link";
import { useState } from "react";
import { SubscriptionPlanCard, type SubscriptionPlanCardData } from "@/components/SubscriptionPlanCard";
import { useLocale, useT } from "@/components/LocaleProvider";
import { getDir } from "@/lib/i18n/core";

export function StudentSubscriptionsPanel({
  plans,
  hasActivePlatformSubscription,
  activePlatformSubscriptionExpiresAtIso,
}: {
  plans: SubscriptionPlanCardData[];
  hasActivePlatformSubscription: boolean;
  activePlatformSubscriptionExpiresAtIso: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const dir = getDir(locale);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 p-6 text-start transition hover:bg-[var(--color-border)]/20"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            {t("dashboard.page.subscriptionsPanel.title", "Platform subscriptions")}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t(
              "dashboard.page.subscriptionsPanel.subtitle",
              "View available plans (week / month / year) and subscribe using your balance to unlock all published paid courses",
            )}
          </p>
        </div>
        <span className="shrink-0 text-lg text-[var(--color-primary)]" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div
          className="border-t border-[var(--color-border)] px-4 pb-8 pt-4 sm:px-6"
          dir={dir}
        >
          {plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-muted)]">
              {t(
                "dashboard.page.subscriptionsPanel.noPlansBefore",
                "No plans are listed right now. Check the ",
              )}
              <Link href="/" className="font-medium text-[var(--color-primary)] underline">
                {t("dashboard.page.subscriptionsPanel.homeLink", "homepage")}
              </Link>
              {t(
                "dashboard.page.subscriptionsPanel.noPlansAfter",
                " when the admin adds new plans.",
              )}
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {plans.map((p) => (
                <SubscriptionPlanCard
                  key={p.id}
                  plan={p}
                  isStudent
                  isLoggedIn
                  hasActivePlatformSubscription={hasActivePlatformSubscription}
                  activePlatformSubscriptionExpiresAtIso={activePlatformSubscriptionExpiresAtIso}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
