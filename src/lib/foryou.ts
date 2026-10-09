import type { Category, Opportunity } from "@/lib/finder/types";

// Ranks results the student has already seen, so For You needs no new AI calls.

export const SEEN = "finder-seen";
export const FEEDBACK = "rec-feedback";
export const MAX_SEEN = 60;

export type Seen = { opportunity: Opportunity; query: string; seenAt: number };
export type Verdict = "liked" | "notInterested";
export type Feedback = { verdict: Verdict };

export type Reason = { type: "interest"; label: string } | { type: "query"; label: string } | { type: "general" };
export type FeedItem = { id: string; opportunity: Opportunity; reason: Reason; score: number };

export type Interest = { id: string; label: string };

/** The interest (if any) whose words show up in the opportunity's text. */
export function matchInterest(o: Opportunity, interests: Interest[]): Interest | null {
  const text = `${o.title} ${o.summary} ${o.organization ?? ""} ${o.category}`.toLowerCase();
  for (const i of interests) {
    const words = i.label
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter((w) => w.length >= 4);
    if (words.some((w) => text.includes(w.slice(0, Math.max(4, w.length - 2))))) return i;
  }
  return null;
}

export function scoreOpportunity(o: Opportunity, opts: { interest: Interest | null; likedCategories: ReadonlySet<Category> }): number {
  let score = 0;
  if (o.cost === "free") score += 4; // free first
  if (o.online) score += 1;
  else if (o.distanceMiles !== null) score += o.distanceMiles <= 10 ? 3 : o.distanceMiles <= 25 ? 2 : 0; // then nearby
  if (o.confirmed) score += 3;
  if (opts.interest) score += 3;
  if (opts.likedCategories.has(o.category)) score += 2;
  score -= o.scamFlags.length * 4;
  return score;
}

/** Newest copy of each opportunity, minus anything the student said they're not interested in. */
export function buildFeed(
  seen: Seen[],
  feedback: Record<string, Verdict>,
  interests: Interest[],
  limit = 12,
): FeedItem[] {
  const newest = new Map<string, Seen>();
  for (const s of seen) {
    const prev = newest.get(s.opportunity.id);
    if (!prev || s.seenAt > prev.seenAt) newest.set(s.opportunity.id, s);
  }

  const likedCategories = new Set<Category>();
  for (const s of newest.values()) if (feedback[s.opportunity.id] === "liked") likedCategories.add(s.opportunity.category);

  const items: FeedItem[] = [];
  for (const s of newest.values()) {
    const o = s.opportunity;
    if (feedback[o.id] === "notInterested") continue;
    if (o.scamFlags.length > 0) continue; // never recommend something with a warning
    const interest = matchInterest(o, interests);
    items.push({
      id: o.id,
      opportunity: o,
      reason: interest ? { type: "interest", label: interest.label } : s.query ? { type: "query", label: s.query } : { type: "general" },
      score: scoreOpportunity(o, { interest, likedCategories }),
    });
  }
  return items.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Oldest entries to delete so no more than MAX_SEEN are kept. */
export function overflowIds(rows: { id: string; updatedAt: number }[], max = MAX_SEEN): string[] {
  return [...rows]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(max)
    .map((r) => r.id);
}

export type ToolSuggestion = { toolId: "gpa" | "finalGrade" | "homeworkTracker" | "backwardPlanner" | "pomodoro"; why: "grade" | "highSchool" | "homework" | "focus" };

/** Built tools that fit the student's grade. */
export function suggestTools(grade: number | null): ToolSuggestion[] {
  const out: ToolSuggestion[] = [{ toolId: "homeworkTracker", why: "homework" }];
  if (grade === null || grade >= 9) out.push({ toolId: "gpa", why: "highSchool" }, { toolId: "finalGrade", why: "grade" });
  out.push({ toolId: "backwardPlanner", why: "homework" }, { toolId: "pomodoro", why: "focus" });
  return out.slice(0, 4);
}
