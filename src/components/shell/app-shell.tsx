"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Ellipsis, WifiOff, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { localeList } from "@/i18n";
import { GuestBanner } from "./guest-banner";
import { builtTabs, tabForPath, BOTTOM_BAR_MAX } from "@/lib/features";
import { updateSettings, useSettings } from "@/lib/settings";
import { LogoMark } from "./logo";
import { NavMenu } from "./nav-menu";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const m = useMessages();
  const { locale } = useSettings();
  const next = localeList[(localeList.indexOf(locale) + 1) % localeList.length];
  return (
    <button
      type="button"
      onClick={() => updateSettings({ locale: next })}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink hover:bg-surface-2 ${className}`}
      aria-label={m.shell.languageToggle}
      lang={next}
    >
      <span aria-hidden="true">{m.shell.languageShort}</span>
    </button>
  );
}

function FooterLinks({ onNavigate }: { onNavigate?: () => void }) {
  const m = useMessages();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 px-3 text-sm">
      <li>
        <Link href="/privacy" onClick={onNavigate} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          {m.shell.privacy}
        </Link>
      </li>
      <li>
        <Link href="/how-ai-works" onClick={onNavigate} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          {m.shell.howAiWorks}
        </Link>
      </li>
    </ul>
  );
}

function HomeLink({ showName = true, onNavigate }: { showName?: boolean; onNavigate?: () => void }) {
  const m = useMessages();
  return (
    <Link href="/" onClick={onNavigate} className="flex min-h-11 items-center gap-2.5 rounded-xl" aria-label={`Rumbo, ${m.shell.home}`}>
      <LogoMark />
      {showName && (
        <span className="font-display text-[1.4rem] font-extrabold tracking-tight" style={{ fontStretch: "85%" }}>
          Rumbo
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const m = useMessages();
  const settings = useSettings();
  const pathname = usePathname();
  const online = useOnline();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const collapsed = settings.sidebarCollapsed;
  const active = tabForPath(pathname);

  const hidden = new Set(settings.hidden);
  const bottomTabs = settings.bottomBar
    .map((id) => builtTabs.find((t) => t.id === id))
    .filter((t) => t && !hidden.has(t.id))
    .slice(0, BOTTOM_BAR_MAX) as typeof builtTabs;

  const openDrawer = () => drawerRef.current?.showModal();
  const closeDrawer = () => drawerRef.current?.close();

  // Close the drawer whenever the page changes (for example the browser back button).
  useEffect(() => {
    drawerRef.current?.close();
  }, [pathname]);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-river px-4 py-2 font-bold text-on-river focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {m.shell.skipToContent}
      </a>

      <div className="lg:flex">
        {/* Desktop and tablet side menu */}
        <aside
          className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface lg:flex ${
            collapsed ? "w-[4.75rem]" : "w-72"
          }`}
        >
          <div className={`flex items-center gap-2 p-3 ${collapsed ? "flex-col" : "justify-between"}`}>
            <HomeLink showName={!collapsed} />
            <button
              type="button"
              className="icon-btn"
              onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
              aria-label={collapsed ? m.shell.expandMenu : m.shell.collapseMenu}
              aria-expanded={!collapsed}
              title={collapsed ? m.shell.expandMenu : m.shell.collapseMenu}
            >
              {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            <NavMenu
              collapsed={collapsed}
              searchRef={searchRef}
              onExpandForSearch={() => {
                updateSettings({ sidebarCollapsed: false });
                // The search box appears on the next render; focus it then.
                window.setTimeout(() => searchRef.current?.focus(), 0);
              }}
            />
          </div>
          {!collapsed && (
            <div className="border-t border-line py-3">
              <FooterLinks />
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
            <div className="mx-auto flex h-16 max-w-4xl items-center gap-2 px-4">
              <button type="button" className="icon-btn -ml-2 lg:hidden" onClick={openDrawer} aria-label={m.shell.openMenu}>
                <Menu className="size-6" aria-hidden="true" />
              </button>
              <div className="lg:hidden">
                <HomeLink />
              </div>
              <p className="hidden truncate font-display text-lg font-bold lg:block">
                {active ? m.tabs[active.id] : ""}
              </p>
              <div className="ml-auto">
                <LanguageToggle />
              </div>
            </div>
            <GuestBanner />
            {!online && (
              <p role="status" className="flex items-center justify-center gap-2 bg-sun-soft px-4 py-2 text-center text-sm font-bold text-ink">
                <WifiOff className="size-4 shrink-0" aria-hidden="true" />
                {m.shell.offline}
              </p>
            )}
          </header>

          <main id="main" tabIndex={-1} className="mx-auto max-w-4xl px-4 pt-6 pb-32 outline-none lg:pb-16">
            {children}
          </main>
        </div>
      </div>

      {/* Phone bottom bar */}
      <nav
        aria-label={m.shell.quickTabs}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active?.id === tab.id;
            return (
              <li key={tab.id} className="flex-1">
                <Link
                  href={tab.href}
                  prefetch={settings.lowData ? false : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[0.72rem] leading-tight font-bold ${
                    isActive ? "text-river" : "text-ink-soft"
                  }`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full ${isActive ? "bg-river-soft" : ""}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="line-clamp-1">{(m.tabsShort as Partial<Record<string, string>>)[tab.id] ?? m.tabs[tab.id]}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={openDrawer}
              className="flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-[0.72rem] font-bold text-ink-soft"
            >
              <span className="flex h-7 w-12 items-center justify-center">
                <Ellipsis className="size-5" aria-hidden="true" />
              </span>
              {m.shell.more}
            </button>
          </li>
        </ul>
      </nav>

      {/* Phone drawer: a native modal dialog gives focus trapping and Escape to close. */}
      <dialog
        ref={drawerRef}
        aria-label={m.shell.mainMenu}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDrawer();
        }}
        className="drawer m-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none bg-surface p-0 text-ink backdrop:bg-black/45 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-3">
            <HomeLink onNavigate={closeDrawer} />
            <button type="button" className="icon-btn" onClick={closeDrawer} aria-label={m.shell.closeMenu}>
              <X className="size-6" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            <NavMenu onNavigate={closeDrawer} />
          </div>
          <div className="border-t border-line py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <FooterLinks onNavigate={closeDrawer} />
          </div>
        </div>
      </dialog>
    </>
  );
}
