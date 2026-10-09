import { addDays, daysBetween } from "@/lib/dates";

export type PlannedStep = { title: string; due: string };

/**
 * Spreads steps evenly from the start date to the due date. The last step always
 * lands on the due date. When there are more steps than days, some share a day
 * and `crowded` is true.
 */
export function planBackward(
  steps: string[],
  start: string,
  due: string,
): { steps: PlannedStep[]; crowded: boolean } | null {
  const clean = steps.map((s) => s.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  const span = daysBetween(start, due);
  if (span < 0) return null;
  const n = clean.length;
  const planned = clean.map((title, i) => {
    // Step i gets the (i+1)/n point of the span, so work is spread evenly.
    const offset = Math.round((span * (i + 1)) / n);
    return { title, due: addDays(start, offset) };
  });
  return { steps: planned, crowded: span + 1 < n };
}
