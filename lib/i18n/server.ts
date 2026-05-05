import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME } from "./constants";
import { getMessages, makeTranslator, normalizeLocale } from "./core";
import type { Locale } from "./types";

export async function getLocaleFromCookie(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return normalizeLocale(cookieValue);
}

export async function getServerMessages() {
  return getMessages(await getLocaleFromCookie());
}

export async function getServerTranslator() {
  return makeTranslator(await getLocaleFromCookie());
}
