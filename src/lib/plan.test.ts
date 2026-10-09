import { describe, expect, it } from "vitest";
import { planToText, progress, rawPlanSchema, toPlan, toggleStep } from "./plan";

const raw = rawPlanSchema.parse({
  title: "Get ready for college",
  summary: "A plan.",
  milestones: [
    { horizon: "year", title: "Apply", steps: ["Submit applications"] },
    { horizon: "week", title: "Start", steps: ["List 5 colleges", "Talk to counselor"] },
  ],
});
const meta = { goal: "college", grade: 11, hoursPerWeek: 3 };

describe("plan", () => {
  it("orders milestones from week to year and numbers steps", () => {
    const p = toPlan(raw, meta);
    expect(p.milestones.map((m) => m.horizon)).toEqual(["week", "year"]);
    expect(p.milestones[0].steps.map((s) => s.id)).toEqual(["s0", "s1"]);
  });
  it("tracks progress", () => {
    let p = toPlan(raw, meta);
    expect(progress(p)).toEqual({ done: 0, total: 3, percent: 0 });
    p = toggleStep(p, "s0");
    expect(progress(p)).toEqual({ done: 1, total: 3, percent: 33 });
    p = toggleStep(p, "s0");
    expect(progress(p).done).toBe(0);
  });
  it("keeps checkmarks when a plan is adjusted", () => {
    const first = toggleStep(toPlan(raw, meta), "s0");
    const adjusted = toPlan(raw, meta, first);
    expect(adjusted.milestones[0].steps[0].done).toBe(true);
    expect(adjusted.createdAt).toBe(first.createdAt);
    expect(planToText(adjusted)).toContain("(done) List 5 colleges");
  });
  it("rejects plans with too few milestones", () => {
    expect(rawPlanSchema.safeParse({ title: "x", summary: "y", milestones: [] }).success).toBe(false);
  });
});
