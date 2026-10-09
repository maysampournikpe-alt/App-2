import { addDays } from "@/lib/dates";

export type FocusSession = { date: string; minutes: number; subject?: string };

export function minutesOn(sessions: FocusSession[], date: string): number {
  return sessions.filter((s) => s.date === date).reduce((sum, s) => sum + s.minutes, 0);
}

/** Totals for the 7 days ending on `today`, oldest first. */
export function lastSevenDays(sessions: FocusSession[], today: string): { date: string; minutes: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, minutes: minutesOn(sessions, date) };
  });
}
