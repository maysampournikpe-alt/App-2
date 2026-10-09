"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { builtTabs, groupOrder, normalize, tabForPath, type Tab } from "@/lib/features";
import { useSettings } from "@/lib/settings";
import { locales, localeList } from "@/i18n";

type Props = {
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Called when the collapsed search icon is pressed. */
  onExpandForSearch?: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
};

type SearchResult = { href: string; label: string; detail?: string; icon: Tab["icon"] };

/** Every built tab and tool, with names in all languages so either language finds it. */
function useSearchIndex() {
  return useMemo(() => {
    const entries: (SearchResult & { haystack: string })[] = [];
    for (const tab of builtTabs) {
      const names = localeList.map((l) => locales[l].messages.tabs[tab.id]);
      entries.push({
        href: tab.href,
        label: tab.id,
        icon: tab.icon,
        haystack: normalize([...names, ...tab.keywords].join(" ")),
      });
      for (const tool of tab.tools) {
        const toolNames = localeList.map((l) => locales[l].messages.tools[tool.id].name);
        entries.push({
          href: tool.href,
          label: tool.id,
          detail: tab.id,
          icon: tool.icon,
          haystack: normalize([...toolNames, ...tool.keywords].join(" ")),
        });
      }
    }
    return entries;
  }, []);
}

export function NavMenu({ collapsed = false, onNavigate, onExpandForSearch, searchRef }: Props) {
  const m = useMessages();
  const settings = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  const active = tabForPath(pathname);
  const index = useSearchIndex();
  const [query, setQuery] = useState("");
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = searchRef ?? localRef;
  const listId = useId();

  const hidden = new Set(settings.hidden);
  const visible = builtTabs.filter((t) => !hidden.has(t.id));
  const pinned = settings.pinned
    .map((id) => visible.find((t) => t.id === id))
    .filter((t): t is Tab => Boolean(t));
  const pinnedIds = new Set(pinned.map((t) => t.id));

  const q = normalize(query);
  const results = q
    ? index
        .filter((e) => e.haystack.includes(q))
        .map((e) => {
          const isTool = Boolean(e.detail);
          return {
            href: e.href,
            icon: e.icon,
            label: isTool
              ? m.tools[e.label as keyof typeof m.tools].name
              : m.tabs[e.label as keyof typeof m.tabs],
            detail: isTool ? m.tabs[e.detail as keyof typeof m.tabs] : undefined,
          };
        })
    : [];

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && results[0]) {
      e.preventDefault();
      router.push(results[0].href, { scroll: true });
      setQuery("");
      onNavigate?.();
    }
    if (e.key === "Escape" && query) {
      e.stopPropagation();
      setQuery("");
    }
  }

  const prefetch = settings.lowData ? false : undefined;

  const item = (tab: Tab, key: string) => {
    const isActive = active?.id === tab.id;
    const Icon = tab.icon;
    return (
      <li key={key}>
        <Link
          href={tab.href}
          prefetch={prefetch}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          title={collapsed ? m.tabs[tab.id] : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 font-bold transition-colors ${
            isActive ? "bg-river text-on-river" : "text-ink hover:bg-surface-2"
          } ${collapsed ? "justify-center px-0" : ""}`}
        >
          <Icon className="size-5 shrink-0" aria-hidden="true" />
          {collapsed ? <span className="sr-only">{m.tabs[tab.id]}</span> : <span>{m.tabs[tab.id]}</span>}
        </Link>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {collapsed ? (
        <button
          type="button"
          className="icon-btn mx-auto"
          onClick={onExpandForSearch}
          aria-label={m.shell.searchLabel}
          title={m.shell.searchLabel}
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      ) : (
        <div role="search">
          <label htmlFor={`${listId}-input`} className="sr-only">
            {m.shell.searchLabel}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id={`${listId}-input`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder={m.shell.searchPlaceholder}
              autoComplete="off"
              aria-controls={query ? listId : undefined}
              className="field rounded-full py-2 pr-9 pl-9 text-base"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:text-ink"
                aria-label={m.common.close}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {q ? (
        <div id={listId} aria-live="polite">
          {results.length === 0 ? (
            <p className="px-3 text-sm text-ink-soft">{m.shell.searchNoResults}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((r) => {
                const Icon = r.icon;
                return (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      prefetch={prefetch}
                      onClick={() => {
                        setQuery("");
                        onNavigate?.();
                      }}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2"
                    >
                      <Icon className="size-5 shrink-0 text-river" aria-hidden="true" />
                      <span className="flex flex-col leading-tight">
                        <span className="font-bold">{r.label}</span>
                        {r.detail && <span className="text-sm text-ink-soft">{r.detail}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <nav aria-label={m.shell.mainMenu} className="flex flex-col gap-4">
          {pinned.length > 0 && (
            <section aria-labelledby={`${listId}-pinned`}>
              <h2
                id={`${listId}-pinned`}
                className={`mb-1 px-3 font-sans text-sm font-bold text-ink-soft ${collapsed ? "sr-only" : ""}`}
              >
                {m.shell.pinned}
              </h2>
              <ul className="flex flex-col gap-0.5">{pinned.map((t) => item(t, `pin-${t.id}`))}</ul>
            </section>
          )}
          {groupOrder.map((group) => {
            const tabs = visible.filter((t) => t.group === group && !pinnedIds.has(t.id));
            if (tabs.length === 0) return null;
            const headingId = `${listId}-${group}`;
            return (
              <section key={group} aria-labelledby={headingId}>
                <h2
                  id={headingId}
                  className={`mb-1 px-3 font-sans text-sm font-bold text-ink-soft ${collapsed ? "sr-only" : ""}`}
                >
                  {m.groups[group]}
                </h2>
                {collapsed && <hr className="mx-3 mb-1 border-line" aria-hidden="true" />}
                <ul className="flex flex-col gap-0.5">{tabs.map((t) => item(t, t.id))}</ul>
              </section>
            );
          })}
        </nav>
      )}
    </div>
  );
}
