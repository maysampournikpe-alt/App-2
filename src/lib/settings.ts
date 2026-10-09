"use client";

import { useSyncExternalStore } from "react";
import { defaultLocale, isLocale, type Locale } from "@/i18n";
import { SETTINGS_KEY } from "@/lib/settings-key";
import { allTabs, defaultBottomBar, BOTTOM_BAR_MAX, type TabId } from "@/lib/features";

export type Theme = "system" | "light" | "dark";

export type Settings = {
  locale: Locale;
  theme: Theme;
  largeText: boolean;
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  lowData: boolean;
  pinned: TabId[];
  hidden: TabId[];
  bottomBar: TabId[];
  sidebarCollapsed: boolean;
  /** Last change time, used to pick the newest copy when syncing devices. */
  updatedAt: number;
};

export { SETTINGS_KEY };

export const defaultSettings: Settings = {
  locale: defaultLocale,
  theme: "system",
  largeText: false,
  dyslexiaFont: false,
  reduceMotion: false,
  lowData: false,
  pinned: [],
  hidden: [],
  bottomBar: defaultBottomBar,
  sidebarCollapsed: false,
  updatedAt: 0,
};

const tabIds = new Set<string>(allTabs.map((t) => t.id));
const themes: Theme[] = ["system", "light", "dark"];

function tabList(value: unknown, max = Infinity): TabId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: TabId[] = [];
  for (const v of value) {
    if (typeof v === "string" && tabIds.has(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v as TabId);
    }
  }
  return out.slice(0, max);
}

/** Accepts anything (old versions, hand-edited storage) and returns valid settings. */
export function parseSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") return defaultSettings;
  const r = raw as Record<string, unknown>;
  const bool = (k: string, d: boolean) => (typeof r[k] === "boolean" ? (r[k] as boolean) : d);
  return {
    locale: isLocale(r.locale) ? r.locale : defaultSettings.locale,
    theme: themes.includes(r.theme as Theme) ? (r.theme as Theme) : defaultSettings.theme,
    largeText: bool("largeText", false),
    dyslexiaFont: bool("dyslexiaFont", false),
    reduceMotion: bool("reduceMotion", false),
    lowData: bool("lowData", false),
    pinned: tabList(r.pinned),
    hidden: tabList(r.hidden),
    bottomBar: Array.isArray(r.bottomBar) ? tabList(r.bottomBar, BOTTOM_BAR_MAX) : defaultSettings.bottomBar,
    sidebarCollapsed: bool("sidebarCollapsed", false),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    cache = parseSettings(stored ? JSON.parse(stored) : null);
  } catch {
    cache = defaultSettings;
  }
  return cache;
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY || e.key === null) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...read(), ...patch, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(cache));
  } catch {
    // Storage can be full or blocked (private mode). Settings still apply for this visit.
  }
  emit();
}

export function resetSettings() {
  cache = defaultSettings;
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => defaultSettings);
}
