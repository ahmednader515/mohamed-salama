import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./constants";
import { arMessages } from "./messages/ar";
import { enMessages } from "./messages/en";
import type { Locale, MessageValue, Messages } from "./types";

function isMessagesObject(value: MessageValue | undefined): value is Messages {
  return typeof value === "object" && value !== null;
}

function resolveMessage(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let current: MessageValue | undefined = messages;
  for (const part of parts) {
    if (!isMessagesObject(current)) return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function normalizeLocale(raw: string | null | undefined): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const normalized = raw.trim().toLowerCase();
  return (SUPPORTED_LOCALES as string[]).includes(normalized)
    ? (normalized as Locale)
    : DEFAULT_LOCALE;
}

export function getDir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getMessages(locale: Locale): Messages {
  return locale === "en" ? enMessages : arMessages;
}

export function makeTranslator(locale: Locale) {
  const messages = getMessages(locale);
  return (key: string, fallback?: string): string => {
    return resolveMessage(messages, key) ?? fallback ?? key;
  };
}
