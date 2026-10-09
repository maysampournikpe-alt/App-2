"use client";

import { useCallback, useEffect, useId, useSyncExternalStore } from "react";
import { Pause, Play, RotateCcw, SkipForward, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { useCollection } from "@/lib/local-store";
import { todayISO } from "@/lib/dates";
import { durationOf, FOCUS_SESSIONS, pomodoro, timeLeft, usePomodoro, type Mode } from "@/lib/pomodoro";
import { lastSevenDays, minutesOn, type FocusSession } from "@/lib/tools/focus-stats";
import { NumberField, Section, Switch, ToolHeader } from "@/components/ui";
import { WeekChart } from "@/components/week-chart";

const modes: Mode[] = ["focus", "short", "long"];

function format(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Current time, refreshed four times a second while the timer runs. */
function useNow(running: boolean) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!running) return () => {};
      const t = window.setInterval(onChange, 250);
      return () => window.clearInterval(t);
    },
    [running],
  );
  // Rounded to the tick so repeated reads within one tick return the same value.
  return useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 250) * 250, () => 0);
}

export function PomodoroTimer() {
  const m = useMessages();
  const s = usePomodoro();
  const running = s.endAt !== null;
  const now = useNow(running);
  const left = timeLeft(s, now);
  const total = durationOf(s.mode, s.settings);
  const progress = total > 0 ? 1 - left / total : 0;
  const subjectId = useId();
  const { items: sessions } = useCollection<FocusSession>(FOCUS_SESSIONS);
  const today = todayISO();
  const week = lastSevenDays(sessions ?? [], today);
  const todayMinutes = minutesOn(sessions ?? [], today);
  const weekTotal = week.reduce((sum, d) => sum + d.minutes, 0);

  // Show the countdown in the browser tab while it runs.
  useEffect(() => {
    if (!running) {
      document.title = `${m.pomodoro.title} | Rumbo`;
      return;
    }
    document.title = `${format(left)} ${m.pomodoro.modes[s.mode]} | Rumbo`;
  }, [running, left, s.mode, m]);

  // Ring geometry
  const R = 120;
  const C = 2 * Math.PI * R;

  return (
    <>
      <ToolHeader tab="focus" title={m.pomodoro.title} intro={m.pomodoro.intro} />

      <div className="flex flex-wrap gap-2" role="group" aria-label={m.pomodoro.title}>
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={s.mode === mode}
            onClick={() => pomodoro.setMode(mode)}
            className={`min-h-11 rounded-full border px-4 font-bold ${
              s.mode === mode ? "border-river bg-river text-on-river" : "border-line bg-surface hover:bg-surface-2"
            }`}
          >
            {m.pomodoro.modes[mode]}
          </button>
        ))}
      </div>

      {s.message && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sun-soft px-4 py-3 font-bold">
          {m.pomodoro[s.message]}
          <button type="button" className="icon-btn size-9" onClick={() => pomodoro.dismissMessage()} aria-label={m.common.close}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center">
        <div className="relative size-[min(80vw,18rem)]">
          <svg viewBox="0 0 280 280" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke={s.mode === "focus" ? "var(--ruby)" : "var(--river)"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p
              className="font-display text-[3.6rem] leading-none font-extrabold tabular-nums"
              style={{ fontStretch: "78%" }}
              role="timer"
              aria-live="off"
            >
              {format(left)}
            </p>
            <p className="mt-2 font-bold text-ink-soft">
              {s.mode === "focus" ? m.pomodoro.blockOf(s.block, s.settings.blocksBeforeLong) : m.pomodoro.modes[s.mode]}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button type="button" className="icon-btn border border-line" onClick={() => pomodoro.reset()} aria-label={m.pomodoro.resetTimer}>
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
          {running ? (
            <button type="button" className="btn-primary min-w-36 text-lg" onClick={() => pomodoro.pause()}>
              <Pause className="size-5" aria-hidden="true" />
              {m.pomodoro.pause}
            </button>
          ) : (
            <button type="button" className="btn-primary min-w-36 text-lg" onClick={() => pomodoro.start()}>
              <Play className="size-5" aria-hidden="true" />
              {left < total ? m.pomodoro.resume : m.pomodoro.start}
            </button>
          )}
          <button type="button" className="icon-btn border border-line" onClick={() => pomodoro.skip()} aria-label={m.pomodoro.skip}>
            <SkipForward className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 w-full max-w-sm">
          <label htmlFor={subjectId} className="label">
            {m.pomodoro.subject} <span className="font-normal text-ink-soft">({m.common.optional})</span>
          </label>
          <input
            id={subjectId}
            className="field"
            value={s.subject}
            placeholder={m.pomodoro.subjectPlaceholder}
            onChange={(e) => pomodoro.setSubject(e.target.value)}
          />
        </div>
      </div>

      <Section title={m.pomodoro.weekHeading}>
        <div className="panel">
          <p className="text-sm font-bold text-ink-soft">{m.pomodoro.todayMinutes}</p>
          <p className="font-display text-3xl font-extrabold tabular-nums">{m.pomodoro.minutes(todayMinutes)}</p>
          <div className="mt-4">
            <WeekChart days={week} today={today} label={m.pomodoro.weekChartLabel(weekTotal)} formatValue={m.pomodoro.minutes} />
          </div>
        </div>
      </Section>

      <Section title={m.pomodoro.settingsHeading}>
        <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
          <NumberField
            label={m.pomodoro.focusLength}
            value={s.settings.focus}
            min={1}
            max={120}
            step={1}
            onChange={(v) => v !== "" && v > 0 && pomodoro.updateSettings({ focus: v })}
          />
          <NumberField
            label={m.pomodoro.shortLength}
            value={s.settings.short}
            min={1}
            max={60}
            step={1}
            onChange={(v) => v !== "" && v > 0 && pomodoro.updateSettings({ short: v })}
          />
          <NumberField
            label={m.pomodoro.longLength}
            value={s.settings.long}
            min={1}
            max={90}
            step={1}
            onChange={(v) => v !== "" && v > 0 && pomodoro.updateSettings({ long: v })}
          />
          <NumberField
            label={m.pomodoro.blocksBeforeLong}
            value={s.settings.blocksBeforeLong}
            min={1}
            max={10}
            step={1}
            onChange={(v) => v !== "" && v >= 1 && pomodoro.updateSettings({ blocksBeforeLong: Math.round(v) })}
          />
        </div>
        <div className="mt-2 divide-y divide-line">
          <Switch label={m.pomodoro.sound} checked={s.settings.sound} onChange={(sound) => pomodoro.updateSettings({ sound })} />
          <Switch label={m.pomodoro.vibrate} checked={s.settings.vibrate} onChange={(vibrate) => pomodoro.updateSettings({ vibrate })} />
          <Switch label={m.pomodoro.autoStart} checked={s.settings.autoStart} onChange={(autoStart) => pomodoro.updateSettings({ autoStart })} />
        </div>
      </Section>
    </>
  );
}
