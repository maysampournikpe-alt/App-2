import { describe, expect, it } from "vitest";
import { computeGpa, defaultBonuses, gradePoints, formatGpa, type Course } from "./gpa";
import { scoreNeeded, formatScore } from "./final-grade";
import { planBackward } from "./backward-plan";
import { groupFor, groupAssignments } from "./homework";
import { lastSevenDays, minutesOn } from "./focus-stats";

describe("gradePoints", () => {
  it("reads numbers on the Texas 70-passing scale", () => {
    expect(gradePoints("95")).toBe(4);
    expect(gradePoints("90")).toBe(4);
    expect(gradePoints("89.9")).toBe(3);
    expect(gradePoints("70")).toBe(2);
    expect(gradePoints("69")).toBe(0);
  });
  it("reads letters with plus and minus, any case", () => {
    expect(gradePoints("a-")).toBe(3.7);
    expect(gradePoints(" B+ ")).toBe(3.3);
    expect(gradePoints("F")).toBe(0);
  });
  it("rejects nonsense", () => {
    expect(gradePoints("")).toBeNull();
    expect(gradePoints("E")).toBeNull();
    expect(gradePoints("-5")).toBeNull();
    expect(gradePoints("200")).toBeNull();
  });
});

describe("computeGpa", () => {
  const c = (grade: string, level: Course["level"], credits = 1): Course => ({ name: "", grade, level, credits });

  it("weights AP and honors but not failing grades", () => {
    const r = computeGpa([c("95", "ap"), c("85", "honors"), c("60", "ap")], defaultBonuses)!;
    expect(r.unweighted).toBeCloseTo((4 + 3 + 0) / 3);
    expect(r.weighted).toBeCloseTo((5 + 3.5 + 0) / 3);
  });
  it("uses credits as weights and skips unreadable rows", () => {
    const r = computeGpa([c("A", "regular", 1), c("C", "regular", 0.5), c("?", "regular")], defaultBonuses)!;
    expect(r.credits).toBe(1.5);
    expect(r.unweighted).toBeCloseTo((4 + 1) / 1.5);
  });
  it("includes a prior GPA", () => {
    const r = computeGpa([c("A", "regular", 2)], defaultBonuses, { unweighted: 3, weighted: 3.5, credits: 2 })!;
    expect(r.unweighted).toBeCloseTo(3.5);
    expect(r.weighted).toBeCloseTo(3.75);
  });
  it("returns null with nothing to count", () => {
    expect(computeGpa([], defaultBonuses)).toBeNull();
  });
  it("formats to two decimals", () => {
    expect(formatGpa(3.456)).toBe("3.46");
    expect(formatGpa(4)).toBe("4.00");
  });
});

describe("scoreNeeded", () => {
  it("solves the usual case", () => {
    const r = scoreNeeded(85, 20, 80);
    expect(r).toEqual({ kind: "need", score: expect.closeTo(60, 5) });
  });
  it("says when the grade is already safe", () => {
    expect(scoreNeeded(95, 10, 80)).toEqual({ kind: "already" });
  });
  it("says when it is out of reach", () => {
    expect(scoreNeeded(60, 20, 90)?.kind).toBe("impossible");
  });
  it("rejects bad input", () => {
    expect(scoreNeeded(80, 0, 90)).toBeNull();
    expect(scoreNeeded(NaN, 20, 90)).toBeNull();
  });
  it("rounds up so the advice is never too low", () => {
    expect(formatScore(60.01)).toBe("60.1");
    expect(formatScore(60)).toBe("60");
  });
});

describe("planBackward", () => {
  it("ends on the due date and spreads steps", () => {
    const r = planBackward(["a", "b", "c", "d"], "2026-10-01", "2026-10-09")!;
    expect(r.steps.map((s) => s.due)).toEqual(["2026-10-03", "2026-10-05", "2026-10-07", "2026-10-09"]);
    expect(r.crowded).toBe(false);
  });
  it("flags crowded plans", () => {
    const r = planBackward(["a", "b", "c"], "2026-10-01", "2026-10-02")!;
    expect(r.crowded).toBe(true);
    expect(r.steps.at(-1)!.due).toBe("2026-10-02");
  });
  it("crosses month ends", () => {
    const r = planBackward(["a", "b"], "2026-10-30", "2026-11-03")!;
    expect(r.steps.map((s) => s.due)).toEqual(["2026-11-01", "2026-11-03"]);
  });
  it("rejects due before start and empty steps", () => {
    expect(planBackward(["a"], "2026-10-05", "2026-10-01")).toBeNull();
    expect(planBackward(["  "], "2026-10-01", "2026-10-05")).toBeNull();
  });
});

describe("homework groups", () => {
  const today = "2026-10-09";
  const a = (due: string | null, done = false) => ({ title: "x", classId: null, due, done });
  it("groups by due date", () => {
    expect(groupFor(a("2026-10-08"), today)).toBe("overdue");
    expect(groupFor(a("2026-10-09"), today)).toBe("today");
    expect(groupFor(a("2026-10-10"), today)).toBe("tomorrow");
    expect(groupFor(a("2026-10-16"), today)).toBe("week");
    expect(groupFor(a("2026-10-17"), today)).toBe("later");
    expect(groupFor(a(null), today)).toBe("noDate");
    expect(groupFor(a("2026-10-01", true), today)).toBe("done");
  });
  it("sorts by due date inside a group", () => {
    const g = groupAssignments([a("2026-10-14"), a("2026-10-12")], today);
    expect(g.get("week")!.map((x) => x.due)).toEqual(["2026-10-12", "2026-10-14"]);
  });
});

describe("focus stats", () => {
  const s = [
    { date: "2026-10-09", minutes: 25 },
    { date: "2026-10-09", minutes: 25 },
    { date: "2026-10-03", minutes: 10 },
    { date: "2026-10-01", minutes: 99 },
  ];
  it("totals a day and the last 7 days", () => {
    expect(minutesOn(s, "2026-10-09")).toBe(50);
    const week = lastSevenDays(s, "2026-10-09");
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ date: "2026-10-03", minutes: 10 });
    expect(week[6].minutes).toBe(50);
  });
});
