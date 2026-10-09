// "What do I need on the final?" math.

export type FinalNeed =
  | { kind: "need"; score: number }
  | { kind: "already" }
  | { kind: "impossible"; score: number };

/**
 * current and target are percents (0 to 100). weight is the final's share of
 * the course grade, in percent (1 to 100).
 * final grade = current * (1 - w) + finalScore * w
 */
export function scoreNeeded(current: number, weight: number, target: number): FinalNeed | null {
  if (![current, weight, target].every(Number.isFinite)) return null;
  if (weight <= 0 || weight > 100 || current < 0) return null;
  const w = weight / 100;
  const score = (target - current * (1 - w)) / w;
  if (score <= 0) return { kind: "already" };
  if (score > 100) return { kind: "impossible", score };
  return { kind: "need", score };
}

export const letterTargets = [
  { letter: "A", min: 90 },
  { letter: "B", min: 80 },
  { letter: "C", min: 70 },
] as const;

/** Rounds up to one decimal so "you need" is never slightly too low. */
export function formatScore(score: number): string {
  const up = Math.ceil(score * 10) / 10;
  return Number.isInteger(up) ? String(up) : up.toFixed(1);
}
