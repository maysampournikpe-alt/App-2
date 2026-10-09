"use client";

import { useSyncExternalStore } from "react";
import { newId, putItem } from "@/lib/local-store";
import { todayISO } from "@/lib/dates";
import type { FocusSession } from "@/lib/tools/focus-stats";

// The timer lives outside React so it keeps running when the student switches
// tabs inside the app. It counts down to an end time (not tick by tick), so it
// stays accurate when the phone sleeps the page.

export type Mode = "focus" | "short" | "long";

export type PomodoroSettings = {
  focus: number;
  short: number;
  long: number;
  blocksBeforeLong: number;
  sound: boolean;
  vibrate: boolean;
  autoStart: boolean;
};

export type PomodoroState = {
  settings: PomodoroSettings;
  mode: Mode;
  /** Which focus block of the current cycle (1-based). */
  block: number;
  /** When running: the time it ends (ms since epoch). Null when paused or stopped. */
  endAt: number | null;
  /** Time left when paused, in ms. */
  remaining: number;
  /** When the current focus block started running, to log partial blocks on skip. */
  focusStartedAt: number | null;
  subject: string;
  message: "focusDone" | "breakDone" | null;
};

export const FOCUS_SESSIONS = "focus-sessions";
const KEY = "rumbo.pomodoro.v1";

export const defaultPomodoroSettings: PomodoroSettings = {
  focus: 25,
  short: 5,
  long: 15,
  blocksBeforeLong: 4,
  sound: true,
  vibrate: true,
  autoStart: false,
};

const minutes = (n: number) => Math.round(n * 60_000);

export function durationOf(mode: Mode, s: PomodoroSettings): number {
  return minutes(mode === "focus" ? s.focus : mode === "short" ? s.short : s.long);
}

const initialState: PomodoroState = {
  settings: defaultPomodoroSettings,
  mode: "focus",
  block: 1,
  endAt: null,
  remaining: durationOf("focus", defaultPomodoroSettings),
  focusStartedAt: null,
  subject: "",
  message: null,
};

let state: PomodoroState | null = null;
const listeners = new Set<() => void>();

function load(): PomodoroState {
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PomodoroState>) : {};
    state = {
      ...initialState,
      ...parsed,
      settings: { ...defaultPomodoroSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    state = initialState;
  }
  return state;
}

function set(next: PomodoroState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the timer still works for this visit.
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePomodoro(): PomodoroState {
  return useSyncExternalStore(subscribe, load, () => initialState);
}

export function timeLeft(s: PomodoroState, now: number): number {
  return s.endAt === null ? s.remaining : Math.max(0, s.endAt - now);
}

// --- Alerts -------------------------------------------------------------

let audio: AudioContext | null = null;

/** Must be called from a tap or click so the browser allows sound later. */
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

function chime() {
  if (!audio) return;
  const start = audio.currentTime;
  [0, 0.28, 0.56].forEach((offset, i) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 2 ? 880 : 660;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.24);
    osc.connect(gain).connect(audio!.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.26);
  });
}

function alertDone(s: PomodoroSettings) {
  if (s.sound) chime();
  if (s.vibrate && "vibrate" in navigator) navigator.vibrate([200, 100, 200]);
}

// --- Actions ------------------------------------------------------------

async function logFocus(mins: number, subject: string) {
  if (mins < 1) return;
  const session: FocusSession = { date: todayISO(), minutes: Math.round(mins), subject: subject.trim() || undefined };
  await putItem(FOCUS_SESSIONS, newId(), session);
}

function nextAfter(s: PomodoroState): Pick<PomodoroState, "mode" | "block"> {
  if (s.mode === "focus") {
    return { mode: s.block >= s.settings.blocksBeforeLong ? "long" : "short", block: s.block };
  }
  return { mode: "focus", block: s.mode === "long" ? 1 : s.block + 1 };
}

function advance(s: PomodoroState, now: number, autoStart: boolean, message: PomodoroState["message"]) {
  const next = nextAfter(s);
  const remaining = durationOf(next.mode, s.settings);
  set({
    ...s,
    ...next,
    remaining,
    endAt: autoStart ? now + remaining : null,
    focusStartedAt: autoStart && next.mode === "focus" ? now : null,
    message,
  });
}

export const pomodoro = {
  start() {
    unlockAudio();
    const s = load();
    if (s.endAt !== null) return;
    const now = Date.now();
    set({
      ...s,
      endAt: now + s.remaining,
      focusStartedAt: s.mode === "focus" ? (s.focusStartedAt ?? now) : null,
      message: null,
    });
  },
  pause() {
    const s = load();
    if (s.endAt === null) return;
    set({ ...s, remaining: Math.max(0, s.endAt - Date.now()), endAt: null });
  },
  reset() {
    const s = load();
    set({ ...s, endAt: null, remaining: durationOf(s.mode, s.settings), focusStartedAt: null, message: null });
  },
  /** Moves to the next block. A skipped focus block still logs the minutes already done. */
  skip() {
    const s = load();
    const now = Date.now();
    if (s.mode === "focus") {
      const done = durationOf("focus", s.settings) - timeLeft(s, now);
      void logFocus(done / 60_000, s.subject);
    }
    advance(s, now, false, null);
  },
  setMode(mode: Mode) {
    const s = load();
    set({ ...s, mode, endAt: null, remaining: durationOf(mode, s.settings), focusStartedAt: null, message: null });
  },
  setSubject(subject: string) {
    set({ ...load(), subject });
  },
  updateSettings(patch: Partial<PomodoroSettings>) {
    const s = load();
    const settings = { ...s.settings, ...patch };
    // A stopped timer shows the new length right away; a running one keeps going.
    const remaining = s.endAt === null && s.remaining === durationOf(s.mode, s.settings) ? durationOf(s.mode, settings) : s.remaining;
    set({ ...s, settings, remaining });
  },
  dismissMessage() {
    set({ ...load(), message: null });
  },
  /** Checks whether the running block has ended. Called on a timer by the watcher. */
  check() {
    const s = load();
    if (s.endAt === null) return;
    const now = Date.now();
    if (now < s.endAt) return;
    if (s.mode === "focus") void logFocus(s.settings.focus, s.subject);
    alertDone(s.settings);
    advance(s, now, s.settings.autoStart, s.mode === "focus" ? "focusDone" : "breakDone");
  },
};

let watcher: number | null = null;

/** Starts one app-wide interval that finishes blocks even when the timer page is closed. */
export function startPomodoroWatcher() {
  if (watcher !== null) return () => {};
  watcher = window.setInterval(() => pomodoro.check(), 1000);
  const onVisible = () => pomodoro.check();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    if (watcher !== null) window.clearInterval(watcher);
    watcher = null;
    document.removeEventListener("visibilitychange", onVisible);
  };
}
