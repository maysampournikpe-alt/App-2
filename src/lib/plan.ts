import { z } from "zod";

export const horizons = ["week", "month", "year"] as const;
export type Horizon = (typeof horizons)[number];

const line = (max: number) => z.string().trim().min(1).max(max);

/** What the model returns. */
export const rawPlanSchema = z.object({
  title: line(120),
  summary: line(500),
  milestones: z
    .array(
      z.object({
        horizon: z.enum(horizons),
        title: line(140),
        steps: z.array(line(240)).min(1).max(8),
      }),
    )
    .min(2)
    .max(12),
});
export type RawPlan = z.infer<typeof rawPlanSchema>;

export const planRequestSchema = z.object({
  goal: z.string().trim().min(3).max(300),
  grade: z.number().int().min(0).max(12).nullable().catch(null),
  hoursPerWeek: z.number().min(1).max(40).catch(3),
  language: z.enum(["en", "es"]).catch("en"),
  /** Present when adjusting an existing plan. */
  adjust: z
    .object({
      instruction: z.string().trim().min(2).max(300),
      current: z.string().max(8000),
    })
    .optional(),
});
export type PlanRequest = z.infer<typeof planRequestSchema>;

export type Step = { id: string; text: string; done: boolean };
export type Milestone = { horizon: Horizon; title: string; steps: Step[] };
export type Plan = {
  goal: string;
  grade: number | null;
  hoursPerWeek: number;
  title: string;
  summary: string;
  milestones: Milestone[];
  createdAt: number;
};

const order: Record<Horizon, number> = { week: 0, month: 1, year: 2 };

/** Turns a model plan into a stored plan, keeping the student's checkmarks for steps that survive. */
export function toPlan(raw: RawPlan, meta: Pick<Plan, "goal" | "grade" | "hoursPerWeek">, previous?: Plan): Plan {
  const doneText = new Set(previous?.milestones.flatMap((m) => m.steps.filter((s) => s.done).map((s) => s.text.trim().toLowerCase())) ?? []);
  let n = 0;
  return {
    ...meta,
    title: raw.title,
    summary: raw.summary,
    createdAt: previous?.createdAt ?? Date.now(),
    milestones: [...raw.milestones]
      .sort((a, b) => order[a.horizon] - order[b.horizon])
      .map((m) => ({
        horizon: m.horizon,
        title: m.title,
        steps: m.steps.map((text) => ({ id: `s${n++}`, text, done: doneText.has(text.trim().toLowerCase()) })),
      })),
  };
}

export function progress(plan: Plan): { done: number; total: number; percent: number } {
  const steps = plan.milestones.flatMap((m) => m.steps);
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, percent: steps.length ? Math.round((done / steps.length) * 100) : 0 };
}

export function toggleStep(plan: Plan, stepId: string): Plan {
  return {
    ...plan,
    milestones: plan.milestones.map((m) => ({ ...m, steps: m.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) })),
  };
}

/** Compact text of a plan for the "adjust my plan" prompt. */
export function planToText(plan: Plan): string {
  return plan.milestones.map((m) => `[${m.horizon}] ${m.title}\n${m.steps.map((s) => `- ${s.done ? "(done) " : ""}${s.text}`).join("\n")}`).join("\n\n");
}

export const goalTemplateIds = ["college", "scholarships", "gpa", "internship", "tsi", "sat", "volunteer", "career"] as const;
export type GoalTemplateId = (typeof goalTemplateIds)[number];
