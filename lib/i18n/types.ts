export type Locale = "ar" | "en";

/** Nested message dictionaries (e.g. dashboard.*). */
export interface Messages {
  [key: string]: string | Messages;
}

export type MessageValue = string | Messages;
