"use client";

import { createContext, useContext, useMemo } from "react";
import { getMessages, makeTranslator } from "@/lib/i18n/core";
import type { Locale } from "@/lib/i18n/types";

type LocaleContextValue = {
  locale: Locale;
  t: (key: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(() => {
    const translator = makeTranslator(locale);
    return { locale, t: translator };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx.locale;
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be used within LocaleProvider");
  return ctx.t;
}

export function useLocalizedEnumValue(rawValue: string, groupKey: string, fallback: string) {
  const t = useT();
  return t(`${groupKey}.${rawValue}`, fallback);
}

export function getClientMessages(locale: Locale) {
  return getMessages(locale);
}
