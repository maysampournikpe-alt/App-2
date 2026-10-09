"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { useLocalValue } from "@/lib/local-store";
import {
  computeGpa,
  defaultBonuses,
  formatGpa,
  gradePoints,
  levels,
  type Bonuses,
  type Course,
  type Level,
} from "@/lib/tools/gpa";
import { NumberField, Section, ToolHeader } from "@/components/ui";

type GpaState = {
  courses: Course[];
  whatIf: Course[];
  prior: { unweighted: number | ""; weighted: number | ""; credits: number | "" };
  bonuses: Bonuses;
};

const initial: GpaState = {
  courses: [],
  whatIf: [],
  prior: { unweighted: "", weighted: "", credits: "" },
  bonuses: defaultBonuses,
};

const blankCourse = (): Course => ({ name: "", grade: "", level: "regular", credits: 1 });

function CourseRows({
  rows,
  onChange,
  addLabel,
}: {
  rows: Course[];
  onChange: (rows: Course[]) => void;
  addLabel: string;
}) {
  const m = useMessages();
  const baseId = useId();
  const update = (i: number, patch: Partial<Course>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div>
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((row, i) => {
            const id = `${baseId}-${i}`;
            const invalid = row.grade.trim() !== "" && gradePoints(row.grade) === null;
            return (
              <li key={i} className="panel grid grid-cols-6 gap-3 sm:grid-cols-12 sm:items-end">
                <div className="col-span-6 sm:col-span-4">
                  <label htmlFor={`${id}-name`} className="label">
                    {m.gpa.className}
                  </label>
                  <input
                    id={`${id}-name`}
                    className="field"
                    value={row.name}
                    placeholder={m.gpa.classNamePlaceholder}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <label htmlFor={`${id}-grade`} className="label">
                    {m.gpa.grade}
                  </label>
                  <input
                    id={`${id}-grade`}
                    className="field"
                    value={row.grade}
                    placeholder={m.gpa.gradePlaceholder}
                    autoCapitalize="characters"
                    aria-invalid={invalid}
                    aria-describedby={invalid ? `${id}-err` : undefined}
                    onChange={(e) => update(i, { grade: e.target.value })}
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <label htmlFor={`${id}-level`} className="label">
                    {m.gpa.level}
                  </label>
                  <select
                    id={`${id}-level`}
                    className="field"
                    value={row.level}
                    onChange={(e) => update(i, { level: e.target.value as Level })}
                  >
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {m.gpa.levels[l]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <label htmlFor={`${id}-credits`} className="label">
                    {m.gpa.credits}
                  </label>
                  <input
                    id={`${id}-credits`}
                    type="number"
                    inputMode="decimal"
                    min={0.5}
                    step={0.5}
                    className="field"
                    value={Number.isFinite(row.credits) ? row.credits : ""}
                    onChange={(e) => update(i, { credits: e.target.value === "" ? NaN : Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-3 flex justify-end sm:col-span-1">
                  <button
                    type="button"
                    className="icon-btn hover:text-danger"
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    aria-label={m.gpa.removeClass(row.name)}
                  >
                    <Trash2 className="size-5" aria-hidden="true" />
                  </button>
                </div>
                {invalid && (
                  <p id={`${id}-err`} className="col-span-full -mt-1 text-sm font-bold text-danger">
                    {m.gpa.invalidGrade}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className="btn-secondary mt-3" onClick={() => onChange([...rows, blankCourse()])}>
        <Plus className="size-4" aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}

function GpaFigure({ label, value, delta }: { label: string; value: number | null; delta?: number | null }) {
  const m = useMessages();
  return (
    <div>
      <dt className="text-sm font-bold text-ink-soft">{label}</dt>
      <dd className="font-display text-[2.6rem] leading-none font-extrabold tabular-nums" style={{ fontStretch: "80%" }}>
        {value === null ? "–" : formatGpa(value)}
      </dd>
      {delta != null && Math.abs(delta) >= 0.005 && (
        <dd className={`mt-1 text-sm font-bold ${delta > 0 ? "text-river" : "text-danger"}`}>
          {m.gpa.change(`${delta > 0 ? "+" : "−"}${formatGpa(Math.abs(delta))}`)}
        </dd>
      )}
    </div>
  );
}

export function GpaCalculator() {
  const m = useMessages();
  const { value: state, save, loaded } = useLocalValue<GpaState>("gpa", "state", initial);

  const prior =
    typeof state.prior.unweighted === "number" &&
    typeof state.prior.credits === "number" &&
    state.prior.credits > 0
      ? {
          unweighted: state.prior.unweighted,
          weighted: typeof state.prior.weighted === "number" ? state.prior.weighted : state.prior.unweighted,
          credits: state.prior.credits,
        }
      : null;

  const now = computeGpa(state.courses, state.bonuses, prior);
  const withWhatIf = state.whatIf.length > 0 ? computeGpa([...state.courses, ...state.whatIf], state.bonuses, prior) : null;

  const set = (patch: Partial<GpaState>) => save({ ...state, ...patch });

  return (
    <>
      <ToolHeader tab="grades" title={m.gpa.title} intro={m.gpa.intro} />

      <div aria-live="polite" className="panel mb-8 border-river bg-river-soft/40">
        {now ? (
          <>
            <h2 className="mb-2 font-sans text-base font-bold">{m.gpa.current}</h2>
            <dl className="grid grid-cols-2 gap-4">
              <GpaFigure label={m.gpa.unweighted} value={now.unweighted} />
              <GpaFigure label={m.gpa.weighted} value={now.weighted} />
            </dl>
            {withWhatIf && (
              <div className="mt-4 border-t border-line pt-4">
                <h2 className="mb-2 font-sans text-base font-bold">{m.gpa.withWhatIf}</h2>
                <dl className="grid grid-cols-2 gap-4">
                  <GpaFigure
                    label={m.gpa.unweighted}
                    value={withWhatIf.unweighted}
                    delta={withWhatIf.unweighted - now.unweighted}
                  />
                  <GpaFigure
                    label={m.gpa.weighted}
                    value={withWhatIf.weighted}
                    delta={withWhatIf.weighted - now.weighted}
                  />
                </dl>
              </div>
            )}
          </>
        ) : (
          <p className="font-bold">{loaded ? m.gpa.noClasses : " "}</p>
        )}
      </div>

      {loaded && (
        <>
          <Section title={m.gpa.classesHeading}>
            <CourseRows rows={state.courses} onChange={(courses) => set({ courses })} addLabel={m.gpa.addClass} />
          </Section>

          <Section title={m.gpa.whatIfHeading}>
            <p className="-mt-1 mb-3 max-w-[62ch] text-ink-soft">{m.gpa.whatIfIntro}</p>
            <CourseRows rows={state.whatIf} onChange={(whatIf) => set({ whatIf })} addLabel={m.gpa.addWhatIf} />
          </Section>

          <Section title={m.gpa.priorHeading}>
            <p className="-mt-1 mb-3 max-w-[62ch] text-ink-soft">{m.gpa.priorIntro}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label={m.gpa.priorUnweighted}
                value={state.prior.unweighted}
                min={0}
                max={5}
                onChange={(v) => set({ prior: { ...state.prior, unweighted: v } })}
              />
              <NumberField
                label={m.gpa.priorWeighted}
                value={state.prior.weighted}
                min={0}
                max={6}
                onChange={(v) => set({ prior: { ...state.prior, weighted: v } })}
              />
              <NumberField
                label={m.gpa.priorCredits}
                value={state.prior.credits}
                min={0}
                onChange={(v) => set({ prior: { ...state.prior, credits: v } })}
              />
            </div>
          </Section>

          <Section title={m.gpa.settingsHeading}>
            <p className="-mt-1 mb-3 max-w-[62ch] text-ink-soft">{m.gpa.settingsIntro}</p>
            <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
              {(Object.keys(defaultBonuses) as (keyof Bonuses)[]).map((level) => (
                <NumberField
                  key={level}
                  label={m.gpa.bonus(m.gpa.levels[level])}
                  value={state.bonuses[level]}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(v) => set({ bonuses: { ...state.bonuses, [level]: v === "" ? 0 : v } })}
                />
              ))}
            </div>
            <p className="help mt-3">{m.gpa.scaleNote}</p>
          </Section>
        </>
      )}
    </>
  );
}
