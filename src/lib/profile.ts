import type { AgeGroup } from "@/lib/finder/types";

// Profile rules that do not touch the screen or storage, so they can be tested.

export const INTERESTS_MIN = 3;
export const INTERESTS_MAX = 10;

/** Ids are stored; labels come from the language files. */
export const interestIds = [
  "coding",
  "art",
  "music",
  "sports",
  "science",
  "math",
  "writing",
  "health",
  "business",
  "engineering",
  "teaching",
  "law",
  "animals",
  "environment",
  "cooking",
  "cars",
  "film",
  "languages",
  "helping",
  "military",
] as const;
export type InterestId = (typeof interestIds)[number];

/** "Not sure yet" quiz: each answer adds interests. */
export const quizAnswers: Record<string, InterestId[]> = {
  build: ["engineering", "coding"],
  create: ["art", "film", "music"],
  help: ["helping", "health", "teaching"],
  outdoors: ["environment", "animals", "sports"],
  figure: ["science", "math"],
  lead: ["business", "law", "writing"],
};

export type Profile = {
  nickname: string;
  birthMonth: number | null;
  birthYear: number | null;
  grade: number | null;
  /** Free text and ids from `interestIds`. */
  interests: string[];
  onboarded: boolean;
};

export const emptyProfile: Profile = {
  nickname: "",
  birthMonth: null,
  birthYear: null,
  grade: null,
  interests: [],
  onboarded: false,
};

/**
 * Age in whole years. Only month and year are collected, so this assumes the birthday
 * is the LAST day of the birth month: it can under-count by a few weeks, never over-count.
 */
export function ageFrom(month: number, year: number, now = new Date()): number {
  const birthdayStillAhead = now.getMonth() + 1 <= month ? 1 : 0;
  return now.getFullYear() - year - birthdayStillAhead;
}

export function ageGroupFor(month: number | null, year: number | null, now = new Date()): AgeGroup {
  if (!month || !year) return "teen";
  const age = ageFrom(month, year, now);
  return age < 13 ? "under13" : age < 18 ? "teen" : "adult";
}

export function validBirth(month: number | null, year: number | null, now = new Date()): boolean {
  if (!month || !year || month < 1 || month > 12) return false;
  const age = ageFrom(month, year, now);
  return age >= 5 && age <= 25;
}

/** The grade a student born in this month/year is usually in (school year starts in August). */
export function suggestGrade(month: number, year: number, now = new Date()): number {
  const schoolYearStart = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  // Kindergarten starts at 5 by September 1.
  const turnsFiveBeforeSep = month <= 8 ? year + 5 : year + 6;
  return Math.min(12, Math.max(0, schoolYearStart - turnsFiveBeforeSep));
}

/** Students under 13 never get an account: they use Rumbo as a guest on their own device. */
export function isUnder13(month: number | null, year: number | null, now = new Date()): boolean {
  return ageGroupFor(month, year, now) === "under13";
}

export function toggleInterest(list: string[], id: string): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  return list.length >= INTERESTS_MAX ? list : [...list, id];
}

export function addCustomInterest(list: string[], raw: string): string[] {
  const text = raw.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!text || list.length >= INTERESTS_MAX) return list;
  if (list.some((x) => x.toLowerCase() === text.toLowerCase())) return list;
  return [...list, text];
}

export function interestsFromQuiz(picks: string[]): string[] {
  const out: string[] = [];
  for (const p of picks) for (const i of quizAnswers[p] ?? []) if (!out.includes(i)) out.push(i);
  return out.slice(0, INTERESTS_MAX);
}

/** Clean stored data so a damaged or old profile never breaks a page. */
export function parseProfile(value: unknown): Profile {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const num = (x: unknown, min: number, max: number) => (typeof x === "number" && x >= min && x <= max ? Math.trunc(x) : null);
  return {
    nickname: typeof v.nickname === "string" ? v.nickname.trim().slice(0, 30) : "",
    birthMonth: num(v.birthMonth, 1, 12),
    birthYear: num(v.birthYear, 1990, 2100),
    grade: num(v.grade, 0, 12),
    interests: Array.isArray(v.interests)
      ? [...new Set(v.interests.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim().slice(0, 40)))].slice(0, INTERESTS_MAX)
      : [],
    onboarded: v.onboarded === true,
  };
}
