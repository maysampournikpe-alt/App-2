// GPA math for the Grades tab. Pure functions, no storage.

export type Level = "regular" | "honors" | "ap" | "ib" | "dual";
export const levels: Level[] = ["regular", "honors", "ap", "ib", "dual"];

export type Course = {
  name: string;
  grade: string;
  level: Level;
  credits: number;
};

export type Bonuses = Record<Exclude<Level, "regular">, number>;

/** Common Texas defaults. Schools differ, so students can change these. */
export const defaultBonuses: Bonuses = { honors: 0.5, ap: 1, ib: 1, dual: 1 };

const letterPoints: Record<string, number> = {
  "A+": 4, A: 4, "A-": 3.7,
  "B+": 3.3, B: 3, "B-": 2.7,
  "C+": 2.3, C: 2, "C-": 1.7,
  "D+": 1.3, D: 1, "D-": 0.7,
  F: 0,
};

/**
 * Unweighted points (0 to 4) for a grade typed as a number (0 to 100) or a letter.
 * Number scale follows the common Texas rule where 70 is passing:
 * 90+ = 4, 80–89 = 3, 70–79 = 2, below 70 = 0.
 * Returns null when the grade can't be read.
 */
export function gradePoints(input: string): number | null {
  const text = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!text) return null;
  if (text in letterPoints) return letterPoints[text];
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  if (n < 0 || n > 110) return null; // some classes allow a little extra credit
  if (n >= 90) return 4;
  if (n >= 80) return 3;
  if (n >= 70) return 2;
  return 0;
}

export function coursePoints(course: Course, bonuses: Bonuses): { unweighted: number; weighted: number } | null {
  const points = gradePoints(course.grade);
  if (points === null || !(course.credits > 0)) return null;
  // A failing grade earns no weighting bonus.
  const bonus = course.level === "regular" || points === 0 ? 0 : bonuses[course.level];
  return { unweighted: points, weighted: points + bonus };
}

export type Prior = { unweighted: number; weighted: number; credits: number };

export type GpaResult = { unweighted: number; weighted: number; credits: number };

export function computeGpa(courses: Course[], bonuses: Bonuses, prior?: Prior | null): GpaResult | null {
  let credits = 0;
  let u = 0;
  let w = 0;
  if (prior && prior.credits > 0) {
    credits += prior.credits;
    u += prior.unweighted * prior.credits;
    w += prior.weighted * prior.credits;
  }
  for (const c of courses) {
    const p = coursePoints(c, bonuses);
    if (!p) continue;
    credits += c.credits;
    u += p.unweighted * c.credits;
    w += p.weighted * c.credits;
  }
  if (credits === 0) return null;
  return { unweighted: u / credits, weighted: w / credits, credits };
}

export function formatGpa(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}
