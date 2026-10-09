"use client";

import { locales, type Locale, type Messages } from "@/i18n";
import { useSettings } from "@/lib/settings";
import { parseISODate } from "@/lib/dates";

export function useLocale(): Locale {
  return useSettings().locale;
}

export function useMessages(): Messages {
  return locales[useLocale()].messages;
}

/** Date helpers that follow the student's language. Dates are "YYYY-MM-DD" strings in local time. */
export function useDates() {
  const locale = useLocale();
  const tag = locales[locale].dateLocale;
  return {
    short: (iso: string) =>
      parseISODate(iso).toLocaleDateString(tag, { weekday: "short", month: "short", day: "numeric" }),
    long: (iso: string) =>
      parseISODate(iso).toLocaleDateString(tag, { weekday: "long", month: "long", day: "numeric" }),
    weekday: (iso: string) => parseISODate(iso).toLocaleDateString(tag, { weekday: "short" }),
  };
}
