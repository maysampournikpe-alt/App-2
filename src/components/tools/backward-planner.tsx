"use client";

import { useId, useState, type FormEvent } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import { useDates, useMessages } from "@/i18n/client";
import { newId, putItem, stripMeta, useCollection, type WithId } from "@/lib/local-store";
import { addDays, todayISO } from "@/lib/dates";
import { planBackward } from "@/lib/tools/backward-plan";
import type { Assignment } from "@/lib/tools/homework";
import { Section, Status, ToolHeader } from "@/components/ui";
import { HOMEWORK } from "./homework-tracker";

const PLANS = "backward-plans";

type ProjectType = "essay" | "science" | "presentation" | "test" | "reading" | "custom";
const projectTypes: ProjectType[] = ["essay", "science", "presentation", "test", "reading", "custom"];

type Plan = {
  name: string;
  type: ProjectType;
  start: string;
  due: string;
  steps: { title: string; due: string; done: boolean }[];
  crowded: boolean;
};

function PlanCard({ plan, onChange, onDelete }: { plan: WithId<Plan>; onChange: (p: Plan) => void; onDelete: () => void }) {
  const m = useMessages();
  const dates = useDates();
  const baseId = useId();
  const [sent, setSent] = useState(false);
  const done = plan.steps.filter((s) => s.done).length;
  const today = todayISO();

  const data = stripMeta(plan);

  function sendToHomework() {
    plan.steps
      .filter((s) => !s.done)
      .forEach((s) => {
        const a: Assignment = { title: `${plan.name}: ${s.title}`, classId: null, due: s.due, done: false };
        void putItem(HOMEWORK, newId(), a);
      });
    setSent(true);
  }

  return (
    <li className="panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{plan.name}</h3>
          <p className="text-sm text-ink-soft">{m.common.dueOn(dates.long(plan.due))}</p>
        </div>
        <button type="button" className="icon-btn hover:text-danger" onClick={onDelete} aria-label={m.backward.deletePlan(plan.name)}>
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3">
        <div
          className="h-2.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={plan.steps.length}
          aria-valuenow={done}
          aria-valuetext={m.backward.progress(done, plan.steps.length)}
        >
          <div className="h-full rounded-full bg-river transition-[width]" style={{ width: `${(done / plan.steps.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-sm font-bold text-ink-soft">{m.backward.progress(done, plan.steps.length)}</p>
      </div>

      {plan.crowded && <p className="mt-2 rounded-xl bg-sun-soft px-3 py-2 text-sm">{m.backward.tooShort}</p>}

      {/* The steps really are a sequence, so they are numbered. */}
      <ol className="mt-3 divide-y divide-line">
        {plan.steps.map((step, i) => {
          const id = `${baseId}-${i}`;
          const late = !step.done && step.due < today;
          return (
            <li key={i} className="flex items-start gap-3 py-2.5">
              <input
                id={id}
                type="checkbox"
                checked={step.done}
                onChange={() =>
                  onChange({ ...data, steps: plan.steps.map((s, j) => (j === i ? { ...s, done: !s.done } : s)) })
                }
                className="mt-1 size-6 shrink-0 cursor-pointer accent-[var(--river)]"
              />
              <label htmlFor={id} className="flex-1 cursor-pointer">
                <span className={`block font-bold ${step.done ? "text-ink-soft line-through" : ""}`}>
                  {i + 1}. {step.title}
                </span>
                <span className={`text-sm ${late ? "font-bold text-danger" : "text-ink-soft"}`}>
                  {m.backward.stepDue(dates.short(step.due))}
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={sendToHomework} disabled={sent || done === plan.steps.length}>
          <ListPlus className="size-4" aria-hidden="true" />
          {m.backward.sendToHomework}
        </button>
        <Status>{sent ? m.backward.sentToHomework : null}</Status>
      </div>
    </li>
  );
}

export function BackwardPlanner() {
  const m = useMessages();
  const formId = useId();
  const { items: plans, put, remove } = useCollection<Plan>(PLANS);
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("essay");
  const [start, setStart] = useState(() => todayISO());
  const [due, setDue] = useState(() => addDays(todayISO(), 14));
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const steps = type === "custom" ? custom.split("\n") : m.backward.stepTemplates[type];

  function makePlan(e: FormEvent) {
    e.preventDefault();
    const result = planBackward(steps, start, due);
    if (!result) {
      setError(due < start ? m.backward.dueBeforeStart : m.backward.needSteps);
      return;
    }
    setError(null);
    void put(newId(), {
      name: name.trim() || m.backward.types[type],
      type,
      start,
      due,
      steps: result.steps.map((s) => ({ ...s, done: false })),
      crowded: result.crowded,
    });
    setName("");
    setCustom("");
  }

  const sorted = [...(plans ?? [])].sort((a, b) => a.due.localeCompare(b.due));

  return (
    <>
      <ToolHeader tab="homework" title={m.backward.title} intro={m.backward.intro} />

      <form onSubmit={makePlan} className="panel grid gap-3 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-name`} className="label">
            {m.backward.projectName}
          </label>
          <input
            id={`${formId}-name`}
            className="field"
            value={name}
            placeholder={m.backward.projectPlaceholder}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-type`} className="label">
            {m.backward.type}
          </label>
          <select id={`${formId}-type`} className="field" value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
            {projectTypes.map((t) => (
              <option key={t} value={t}>
                {m.backward.types[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-start`} className="label">
            {m.backward.startDate}
          </label>
          <input id={`${formId}-start`} type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${formId}-due`} className="label">
            {m.backward.dueDate}
          </label>
          <input
            id={`${formId}-due`}
            type="date"
            className="field"
            value={due}
            min={start}
            onChange={(e) => setDue(e.target.value)}
            aria-invalid={due < start}
          />
        </div>

        {type === "custom" ? (
          <div className="sm:col-span-2">
            <label htmlFor={`${formId}-custom`} className="label">
              {m.backward.customStepsLabel}
            </label>
            <textarea
              id={`${formId}-custom`}
              className="field min-h-36"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <p className="label">{m.backward.stepsHeading}</p>
            <ol className="list-decimal space-y-0.5 pl-6 text-ink-soft">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        {error && (
          <p role="alert" className="font-bold text-danger sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            {m.backward.makePlan}
          </button>
        </div>
      </form>

      {plans && (
        <Section title={m.backward.yourPlans}>
          {sorted.length === 0 ? (
            <p className="text-ink-soft">{m.backward.noPlans}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {sorted.map((p) => (
                <PlanCard key={p.id} plan={p} onChange={(next) => void put(p.id, next)} onDelete={() => void remove(p.id)} />
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
  );
}
