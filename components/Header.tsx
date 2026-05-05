"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import type { UserRole } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT, useLocalizedEnumValue } from "@/components/LocaleProvider";

function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status !== "authenticated" || !session?.user) return null;

  const roleLabel: Record<UserRole, string> = {
    ADMIN: useLocalizedEnumValue("ADMIN", "header.role", "Admin"),
    ASSISTANT_ADMIN: useLocalizedEnumValue("ASSISTANT_ADMIN", "header.role", "Assistant admin"),
    STUDENT: useLocalizedEnumValue("STUDENT", "header.role", "Student"),
    TEACHER: useLocalizedEnumValue("TEACHER", "header.role", "Teacher"),
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/50 sm:px-3"
      >
        <span className="max-w-[96px] truncate sm:max-w-[120px]">{session.user.name}</span>
        <span className="text-[var(--color-muted)]">▼</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-hover)]">
          <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
            {roleLabel[session.user.role]}
          </div>
          <Link
            href="/dashboard"
            className="block px-3 py-2 text-sm hover:bg-[var(--color-border)]/50"
            onClick={() => setOpen(false)}
          >
            {t("header.dashboard", "Dashboard")}
          </Link>
          <Link
            href="/dashboard/profile"
            className="block px-3 py-2 text-sm hover:bg-[var(--color-border)]/50"
            onClick={() => setOpen(false)}
          >
            {t("header.editAccount", "Edit account")}
          </Link>
          <button
            type="button"
            className="w-full px-3 py-2 text-start text-sm text-red-600 hover:bg-[var(--color-border)]/50 dark:text-red-400"
            onClick={async () => {
              setOpen(false);
              try {
                await fetch("/api/auth/clear-session", { method: "POST", credentials: "include" });
              } catch {
                /* تجاهل خطأ الشبكة */
              }
              signOut({ callbackUrl: "/" });
            }}
          >
            {t("header.logout", "Log out")}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({
  platformName,
  headerLogoUrl,
  platformSubscriptionExpiryLabel,
}: {
  platformName?: string | null;
  headerLogoUrl?: string | null;
  /** للطالب ذي اشتراك منصة نشط: نص تاريخ انتهاء الاشتراك (مُنسَّق من السيرفر) */
  platformSubscriptionExpiryLabel?: string | null;
}) {
  const { data: session, status } = useSession();
  const t = useT();
  const trimmedName = platformName?.trim() ?? "";
  const displayName = trimmedName;
  const linkTitle = trimmedName || t("header.homePage", "Homepage");

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-2 sm:hidden">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 truncate text-base font-bold text-[var(--color-foreground)] transition hover:opacity-90"
            title={linkTitle}
          >
            {headerLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headerLogoUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-background)] object-cover p-0.5"
              />
            ) : null}
            {displayName ? <span className="min-w-0 truncate">{displayName}</span> : null}
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pb-2 sm:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
            >
              {t("common.home", "Home")}
            </Link>
            <Link
              href="/courses"
              className="text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
            >
              {t("common.courses", "Courses")}
            </Link>
          </div>
          {status === "loading" ? (
            <span className="text-sm text-[var(--color-muted)]">...</span>
          ) : session ? (
            <UserMenu />
          ) : (
            <span className="flex shrink-0 items-center gap-1.5">
              <Link
                href="/login"
                className="whitespace-nowrap rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/50 active:opacity-90"
              >
                {t("header.login", "Log in")}
              </Link>
              <Link
                href="/register"
                className="whitespace-nowrap rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--color-primary-hover)] active:opacity-90"
              >
                {t("header.register", "Create account")}
              </Link>
            </span>
          )}
        </div>

        <div className="hidden h-[72px] items-center justify-between gap-3 sm:flex">
        <Link
          href="/"
          className="flex min-w-0 max-w-[45%] items-center gap-2 truncate text-lg font-bold text-[var(--color-foreground)] transition hover:opacity-90 sm:max-w-[320px] sm:text-2xl md:max-w-none"
          title={linkTitle}
        >
          {headerLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={headerLogoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background)] object-cover p-0.5 sm:h-14 sm:w-14"
            />
          ) : null}
          {displayName ? <span className="min-w-0 truncate">{displayName}</span> : null}
        </Link>
        <nav className="flex flex-shrink-0 items-center gap-2 sm:gap-7">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/"
            className="hidden text-base font-medium text-[var(--color-muted)] transition hover:text-[var(--color-foreground)] sm:inline-block"
          >
            {t("common.home", "Home")}
          </Link>
          <Link
            href="/courses"
            className="hidden text-base font-medium text-[var(--color-muted)] transition hover:text-[var(--color-foreground)] sm:inline-block"
          >
            {t("common.courses", "Courses")}
          </Link>
          {status === "loading" ? (
            <span className="text-sm text-[var(--color-muted)]">...</span>
          ) : session ? (
            <UserMenu />
          ) : (
            <span className="flex items-center gap-2">
              <Link
                href="/login"
                className="whitespace-nowrap rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/50 active:opacity-90"
              >
                {t("header.login", "Log in")}
              </Link>
              <Link
                href="/register"
                className="whitespace-nowrap rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] active:opacity-90"
              >
                {t("header.register", "Create account")}
              </Link>
            </span>
          )}
        </nav>
        </div>
      </div>
      {platformSubscriptionExpiryLabel ? (
        <div className="border-t border-teal-500/35 bg-gradient-to-l from-teal-950/80 to-slate-900/90 py-2.5 text-center text-xs leading-relaxed text-teal-50 sm:text-sm">
          <span className="font-semibold text-teal-200">{t("header.platformSubscriptionActive", "You are subscribed to the platform subscription")}</span>
          {" — "}
          <span className="text-teal-100/95">
            {t("header.endsAt", "Expires at:")} <time className="font-medium text-white">{platformSubscriptionExpiryLabel}</time>
          </span>
        </div>
      ) : null}
    </header>
  );
}
