"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { useLocale, useMessages } from "@/i18n/client";
import { useLocalValue } from "@/lib/local-store";
import { goalTemplateIds, planToText, progress, toPlan, toggleStep, type Plan, type RawPlan } from "@/lib/plan";
import { useProfile } from "@/lib/use-profile";
import type { SafetyKind } from "@/lib/finder/types";
import { NumberField, PageHeader, Section } from "@/components/ui";
import { SafetyCard } from "@/components/tools/opportunity-finder";

type Stored = { plan: Plan | null };

export function PlanBuilder() {
  const m = useMessages();
  const p = m.plan;
  const locale = useLocale();
  const { profile } = useProfile();
  const store = useLocalValue<Stored>("plan", "current", { plan: null });
  const plan = store.value.plan;

  const [goal, setGoal] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [hours, setHours] = useState<number | "">(3);
  const [adjust, setAdjust] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<keyof typeof p.errors | null>(null);
  const [safety, setSafety] = useState<SafetyKind | null>(null);
  const gradeValue = grade ?? profile.grade;

  async function request(body: Record<string, unknown>): Promise<RawPlan | null> {
    if (!navigator.onLine) {
      setError("offline");
      return null;
    }
    setBusy(true);
    setError(null);
    setSafety(null);
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: locale, ...body }) });
      const data = (await res.json()) as { status: string; plan?: RawPlan; kind?: SafetyKind; code?: keyof typeof p.errors };
      if (data.status === "ok" && data.plan) return data.plan;
      if (data.status === "safety" && data.kind) setSafety(data.kind);
      else setError(data.code ?? "failed");
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
    return null;
  }

  async function build(e: FormEvent) {
    e.preventDefault();
    const hoursPerWeek = hours === "" ? 3 : hours;
    const raw = await request({ goal, grade: gradeValue, hoursPerWeek });
    if (raw) await store.save({ plan: toPlan(raw, { goal: goal.trim(), grade: gradeValue, hoursPerWeek }) });
  }

  async function update(e: FormEvent) {
    e.preventDefault();
    if (!plan) return;
    const raw = await request({ goal: plan.goal, grade: plan.grade, hoursPerWeek: plan.hoursPerWeek, adjust: { instruction: adjust, current: planToText(plan) } });
    if (raw) {
      await store.save({ plan: toPlan(raw, plan, plan) });
      setAdjust("");
    }
  }

  const status = (
    <>
      {error && (
        <p role="alert" className="mt-3 font-bold text-danger">
          {p.errors[error]}
        </p>
      )}
      {safety && (
        <div className="mt-3">
          <SafetyCard kind={safety} onBack={() => setSafety(null)} />
        </div>
      )}
    </>
  );

  if (!store.loaded) return <PageHeader title={p.title} />;

  if (!plan) {
    return (
      <>
        <PageHeader title={p.title} intro={p.intro} />
        <form onSubmit={build} className="panel space-y-4">
          <div>
            <label htmlFor="plan-goal" className="label">
              {p.goalLabel}
            </label>
            <input id="plan-goal" className="field" value={goal} maxLength={300} placeholder={p.goalPlaceholder} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div>
            <p className="label">{p.templatesLabel}</p>
            <ul className="flex flex-wrap gap-2">
              {goalTemplateIds.map((id) => (
                <li key={id}>
                  <button type="button" className="btn-secondary min-h-9 px-3 py-1 text-sm" onClick={() => setGoal(p.templateGoals[id])}>
                    {p.templates[id]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="plan-grade" className="label">
                {p.gradeLabel}
              </label>
              <select id="plan-grade" className="field w-40" value={gradeValue ?? ""} onChange={(e) => setGrade(e.target.value === "" ? null : Number(e.target.value))}>
                <option value=""></option>
                {Array.from({ length: 13 }, (_, g) => (
                  <option key={g} value={g}>
                    {m.me.onboarding.gradeName(g)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <NumberField label={p.hoursLabel} value={hours} onChange={setHours} min={1} max={40} step={1} />
            </div>
          </div>
          <p className="help">{p.hoursHelp}</p>
          <button type="submit" className="btn-primary" disabled={busy || goal.trim().length < 3}>
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Wand2 className="size-5" aria-hidden="true" />}
            {busy ? p.building : p.build}
          </button>
        </form>
        {status}
      </>
    );
  }

  const prog = progress(plan);
  return (
    <>
      <PageHeader title={plan.title} intro={plan.summary} />

      <div className="panel">
        <div className="flex items-center justify-between gap-3">
          <p id="plan-progress-label" className="font-bold">
            {p.progressLabel}
          </p>
          <p className="text-sm text-ink-soft">{p.progress(prog.done, prog.total)}</p>
        </div>
        <div
          role="progressbar"
          aria-labelledby="plan-progress-label"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={prog.percent}
          className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-river transition-[width]" style={{ width: `${prog.percent}%` }} />
        </div>
      </div>

      {plan.milestones.map((ms, i) => (
        <Section key={i} title={`${p.horizons[ms.horizon]}: ${ms.title}`}>
          <ul className="panel divide-y divide-line py-1">
            {ms.steps.map((step) => (
              <li key={step.id} className="flex items-start gap-3 py-2.5">
                <input
                  id={`step-${step.id}`}
                  type="checkbox"
                  checked={step.done}
                  onChange={() => void store.save({ plan: toggleStep(plan, step.id) })}
                  aria-label={step.done ? p.stepNotDone(step.text) : p.stepDone(step.text)}
                  className="mt-1 size-6 shrink-0 cursor-pointer accent-[var(--river)]"
                />
                <label htmlFor={`step-${step.id}`} className={`cursor-pointer break-words ${step.done ? "text-ink-soft line-through" : ""}`}>
                  {step.text}
                </label>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      <Section title={p.adjustHeading}>
        <form onSubmit={update} className="panel space-y-3">
          <div>
            <label htmlFor="plan-adjust" className="label">
              {p.adjustLabel}
            </label>
            <input id="plan-adjust" className="field" value={adjust} maxLength={300} placeholder={p.adjustPlaceholder} onChange={(e) => setAdjust(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={busy || adjust.trim().length < 2}>
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
            {busy ? p.building : p.adjust}
          </button>
        </form>
        {status}
      </Section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/find" className="btn-secondary">
          {p.findLink}
        </Link>
        <button type="button" className="btn-secondary" onClick={() => window.confirm(p.newPlanConfirm) && void store.save({ plan: null })}>
          {p.newPlan}
        </button>
      </div>
      <p className="help mt-4">{p.disclaimer}</p>
    </>
  );
}
