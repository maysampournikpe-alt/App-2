"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { getTab, type TabId } from "@/lib/features";
import { useSettings } from "@/lib/settings";

/** Sets the browser tab title in the student's language. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Rumbo` : "Rumbo";
  }, [title]);
}

export function PageHeader({
  title,
  intro,
  backHref,
  backLabel,
}: {
  title: string;
  intro?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  useDocumentTitle(title);
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-bold text-river hover:bg-river-soft"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <h1 className="text-[2rem] font-extrabold tracking-tight sm:text-[2.4rem]" style={{ fontStretch: "88%" }}>
        {title}
      </h1>
      {intro && <p className="mt-2 max-w-[62ch] text-ink-soft">{intro}</p>}
    </div>
  );
}

/** Header for a tool page, with a link back to its tab. */
export function ToolHeader({ tab, title, intro }: { tab: TabId; title: string; intro?: ReactNode }) {
  const m = useMessages();
  const t = getTab(tab);
  return <PageHeader title={title} intro={intro} backHref={t?.href} backLabel={m.tabs[tab]} />;
}

/** A tab's home screen: a grid of its tools. */
export function TabHome({ tab }: { tab: TabId }) {
  const m = useMessages();
  const { lowData } = useSettings();
  const t = getTab(tab);
  if (!t) return null;
  const intro = (m.tabIntros as Record<string, string>)[tab];
  return (
    <>
      <PageHeader title={m.tabs[tab]} intro={intro} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {t.tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <li key={tool.id}>
              <Link
                href={tool.href}
                prefetch={lowData ? false : undefined}
                className="group flex h-full gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-river"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-river-soft text-river">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-display text-lg font-bold group-hover:text-river">{m.tools[tool.id].name}</span>
                  <span className="mt-0.5 block text-ink-soft">{m.tools[tool.id].summary}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="mt-8 first:mt-0">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id={id} className="text-xl font-bold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  help?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        {help && (
          <p id={`${id}-help`} className="text-sm text-ink-soft">
            {help}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={help ? `${id}-help` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors ${
          checked ? "border-river bg-river" : "border-line bg-surface-2"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block size-6 rounded-full bg-surface shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * A labelled number input. Reports "" when empty. Keeps its own draft text while
 * focused, so a student can clear the box and retype even if the parent ignores "".
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  help,
  suffix,
  inputClassName = "",
}: {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  step?: number | "any";
  help?: string;
  suffix?: string;
  inputClassName?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={draft ?? (value === "" || !Number.isFinite(value) ? "" : String(value))}
          min={min}
          max={max}
          step={step}
          onFocus={(e) => setDraft(e.target.value)}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value === "" ? "" : Number(e.target.value));
          }}
          aria-describedby={help ? `${id}-help` : undefined}
          className={`field ${suffix ? "pr-9" : ""} ${inputClassName}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-soft" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
      {help && (
        <p id={`${id}-help`} className="help">
          {help}
        </p>
      )}
    </div>
  );
}

/** Polite live region for confirmations ("Saved", "Added"). */
export function Status({ children }: { children?: ReactNode }) {
  return (
    <p role="status" aria-live="polite" className="min-h-6 text-sm font-bold text-river">
      {children}
    </p>
  );
}
