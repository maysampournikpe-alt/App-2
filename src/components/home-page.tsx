"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Plus, Search, Timer } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { useCollection } from "@/lib/local-store";
import { daysBetween, todayISO } from "@/lib/dates";
import { builtTabs } from "@/lib/features";
import { useSettings } from "@/lib/settings";
import { useProfile } from "@/lib/use-profile";
import { FOCUS_SESSIONS } from "@/lib/pomodoro";
import { minutesOn, type FocusSession } from "@/lib/tools/focus-stats";
import type { Assignment } from "@/lib/tools/homework";
import { AssignmentRow, HOMEWORK, HOMEWORK_CLASSES, toggled, type SchoolClass } from "@/components/tools/homework-tracker";
import { putItem } from "@/lib/local-store";
import { useDocumentTitle } from "@/components/ui";

// Hour of day only matters on the client; the server renders a neutral greeting.
const subscribeNever = () => () => {};

export function HomePage() {
  const m = useMessages();
  const { lowData } = useSettings();
  const { profile, loaded: profileLoaded } = useProfile();
  useDocumentTitle("");
  const hour = useSyncExternalStore(subscribeNever, () => new Date().getHours(), () => -1);
  const greeting =
    hour < 0 ? "" : hour < 12 ? m.home.greetingMorning : hour < 18 ? m.home.greetingAfternoon : m.home.greetingEvening;

  const today = todayISO();
  const { items: homework } = useCollection<Assignment>(HOMEWORK);
  const { items: classes } = useCollection<SchoolClass>(HOMEWORK_CLASSES);
  const { items: sessions } = useCollection<FocusSession>(FOCUS_SESSIONS);
  const classById = new Map((classes ?? []).map((c) => [c.id, c]));

  const dueSoon = (homework ?? [])
    .filter((a) => !a.done && a.due && daysBetween(today, a.due) <= 7)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))
    .slice(0, 6);
  const focusMinutes = minutesOn(sessions ?? [], today);
  const tools = builtTabs.flatMap((t) => t.tools);

  return (
    <>
      <h1
        className="font-display text-[clamp(2.6rem,11vw,4.75rem)] leading-[0.95] font-extrabold tracking-tight text-river"
        style={{ fontStretch: "75%" }}
      >
        {greeting || " "}
      </h1>
      <p className="mt-3 text-lg text-ink-soft">{m.home.lead}</p>

      {builtTabs.some((t) => t.id === "find") && (
        <form action="/find" method="get" className="panel mt-6">
          <label htmlFor="home-find" className="text-xl font-bold">
            {m.finder.greeting}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="home-find"
              name="q"
              minLength={2}
              maxLength={300}
              required
              className="field min-w-48 flex-1"
              placeholder={m.finder.examples[0]}
              autoComplete="off"
            />
            <button type="submit" className="btn-primary">
              <Search className="size-5" aria-hidden="true" />
              {m.finder.search}
            </button>
          </div>
          {profileLoaded && !profile.onboarded && (
            <p className="help mt-3">
              <Link href="/me" className="font-bold text-river underline">
                {m.me.startSetup}
              </Link>
              . {m.me.intro}
            </p>
          )}
        </form>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <section aria-labelledby="due-soon" className="panel md:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="due-soon" className="text-xl font-bold">
              {m.home.dueSoon}
            </h2>
            <Link href="/homework/tracker" className="btn-quiet min-h-9 text-sm">
              <Plus className="size-4" aria-hidden="true" />
              {m.home.addHomework}
            </Link>
          </div>
          {homework &&
            (dueSoon.length === 0 ? (
              <p className="mt-2 text-ink-soft">{m.home.nothingDue}</p>
            ) : (
              <ul className="mt-1 divide-y divide-line">
                {dueSoon.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    item={a}
                    cls={a.classId ? classById.get(a.classId) : undefined}
                    onToggle={() => void putItem(HOMEWORK, a.id, toggled(a))}
                  />
                ))}
              </ul>
            ))}
        </section>

        <section aria-labelledby="focus-today" className="panel flex flex-col md:col-span-2">
          <h2 id="focus-today" className="text-xl font-bold">
            {m.home.focusToday}
          </h2>
          <p className="mt-1 mb-auto font-display text-5xl font-extrabold tabular-nums" style={{ fontStretch: "80%" }}>
            {m.home.minutesShort(focusMinutes)}
          </p>
          <Link href="/focus/pomodoro" className="btn-primary mt-5 self-start">
            <Timer className="size-4" aria-hidden="true" />
            {m.home.startTimer}
          </Link>
        </section>
      </div>

      <section aria-labelledby="your-tools" className="mt-10">
        <h2 id="your-tools" className="mb-3 text-xl font-bold">
          {m.home.yourTools}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <li key={tool.id}>
                <Link
                  href={tool.href}
                  prefetch={lowData ? false : undefined}
                  className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-4 hover:border-river"
                >
                  <Icon className="size-6 text-river" aria-hidden="true" />
                  <span className="font-bold leading-snug">{m.tools[tool.id].name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
