import en, { type Messages } from "./en";
import es from "./es";

// To add a language: create a file shaped like en.ts and register it here.
export const locales = {
  en: { messages: en, dateLocale: "en-US", htmlLang: "en" },
  es: { messages: es, dateLocale: "es-MX", htmlLang: "es" },
} as const satisfies Record<string, { messages: Messages; dateLocale: string; htmlLang: string }>;

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "en";
export const localeList = Object.keys(locales) as Locale[];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in locales;
}

export type { Messages };
