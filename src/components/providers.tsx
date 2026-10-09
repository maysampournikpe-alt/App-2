"use client";

import { useEffect, type ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
import { locales } from "@/i18n";
import { useSettings } from "@/lib/settings";
import { startPomodoroWatcher } from "@/lib/pomodoro";

function setAttr(el: HTMLElement, name: string, value: string | null) {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

/** Keeps the <html> attributes in step with settings (theme, text size, font, motion, language). */
function ApplySettings() {
  const s = useSettings();

  useEffect(() => {
    const html = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const theme = s.theme === "system" ? (media.matches ? "dark" : "light") : s.theme;
      html.setAttribute("data-theme", theme);
    };
    applyTheme();
    setAttr(html, "data-text", s.largeText ? "large" : null);
    setAttr(html, "data-font", s.dyslexiaFont ? "dyslexia" : null);
    setAttr(html, "data-motion", s.reduceMotion ? "reduce" : null);
    html.lang = locales[s.locale].htmlLang;
    html.removeAttribute("data-pending");
    if (s.theme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [s.theme, s.largeText, s.dyslexiaFont, s.reduceMotion, s.locale]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => startPomodoroWatcher(), []);
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
      <ApplySettings />
      {children}
    </SerwistProvider>
  );
}
