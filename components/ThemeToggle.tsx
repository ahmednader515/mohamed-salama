"use client";

import { useT } from "./LocaleProvider";

const STORAGE_KEY = "theme";

export function ThemeToggle() {
  const t = useT();

  function toggle() {
    const isLight = document.documentElement.classList.contains("light");
    const next = isLight ? "dark" : "light";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/50"
      aria-label={t("theme.toggle", "Toggle theme")}
      title={t("theme.toggle", "Toggle theme")}
    >
      <svg className="hidden h-5 w-5 dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <svg className="h-5 w-5 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </button>
  );
}
