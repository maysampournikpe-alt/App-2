"use client";

import { useId } from "react";
import { useMessages } from "@/i18n/client";
import { useLocalValue } from "@/lib/local-store";
import { formatScore, letterTargets, scoreNeeded, type FinalNeed } from "@/lib/tools/final-grade";
import { NumberField, Section, ToolHeader } from "@/components/ui";

type State = {
  current: number | "";
  weight: number | "";
  target: "A" | "B" | "C" | "custom";
  custom: number | "";
};

const initial: State = { current: "", weight: 20, target: "B", custom: "" };

export function FinalGradeCalculator() {
  const m = useMessages();
  const groupId = useId();
  const { value: s, save, loaded } = useLocalValue<State>("finalGrade", "state", initial);
  const set = (patch: Partial<State>) => save({ ...s, ...patch });

  const targetValue =
    s.target === "custom" ? s.custom : letterTargets.find((t) => t.letter === s.target)!.min;
  const ready = typeof s.current === "number" && typeof s.weight === "number";
  const result =
    ready && typeof targetValue === "number" ? scoreNeeded(s.current as number, s.weight as number, targetValue) : null;

  const describe = (r: FinalNeed) =>
    r.kind === "already"
      ? m.finalGrade.resultAlready
      : r.kind === "impossible"
        ? m.finalGrade.resultImpossible(formatScore(r.score))
        : m.finalGrade.resultNeed(formatScore(r.score));

  if (!loaded) return <ToolHeader tab="grades" title={m.finalGrade.title} intro={m.finalGrade.intro} />;

  return (
    <>
      <ToolHeader tab="grades" title={m.finalGrade.title} intro={m.finalGrade.intro} />

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label={m.finalGrade.currentGrade}
          value={s.current}
          min={0}
          max={110}
          suffix="%"
          onChange={(current) => set({ current })}
        />
        <NumberField
          label={m.finalGrade.finalWeight}
          value={s.weight}
          min={1}
          max={100}
          suffix="%"
          help={m.finalGrade.finalWeightHelp}
          onChange={(weight) => set({ weight })}
        />
      </div>

      <fieldset className="mt-5">
        <legend className="label">{m.finalGrade.target}</legend>
        <div className="flex flex-wrap gap-2">
          {[...letterTargets.map((t) => t.letter), "custom" as const].map((option) => {
            const id = `${groupId}-${option}`;
            const checked = s.target === option;
            return (
              <div key={option}>
                <input
                  type="radio"
                  id={id}
                  name={`${groupId}-target`}
                  className="peer sr-only"
                  checked={checked}
                  onChange={() => set({ target: option })}
                />
                <label
                  htmlFor={id}
                  className={`inline-flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-full border px-4 font-bold peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] ${
                    checked ? "border-river bg-river text-on-river" : "border-line bg-surface hover:bg-surface-2"
                  }`}
                >
                  {option === "custom"
                    ? m.finalGrade.custom
                    : `${option} (${letterTargets.find((t) => t.letter === option)!.min}%)`}
                </label>
              </div>
            );
          })}
        </div>
        {s.target === "custom" && (
          <div className="mt-3 max-w-48">
            <NumberField
              label={m.finalGrade.customTarget}
              value={s.custom}
              min={0}
              max={100}
              suffix="%"
              onChange={(custom) => set({ custom })}
            />
          </div>
        )}
      </fieldset>

      <div aria-live="polite" className="panel mt-6 border-river bg-river-soft/40">
        <p className="font-display text-2xl font-bold">{result ? describe(result) : m.finalGrade.missing}</p>
      </div>

      {ready && (
        <Section title={m.finalGrade.allTargets}>
          <table className="w-full max-w-md border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th scope="col" className="py-2 font-bold">
                  {m.finalGrade.gradeColumn}
                </th>
                <th scope="col" className="py-2 font-bold">
                  {m.finalGrade.needColumn}
                </th>
              </tr>
            </thead>
            <tbody>
              {letterTargets.map((t) => {
                const r = scoreNeeded(s.current as number, s.weight as number, t.min);
                return (
                  <tr key={t.letter} className="border-b border-line">
                    <th scope="row" className="py-2 font-bold">
                      {t.letter} ({t.min}%)
                    </th>
                    <td className="py-2 tabular-nums">
                      {!r ? "–" : r.kind === "already" ? m.finalGrade.alreadyShort : r.kind === "impossible" ? m.finalGrade.overShort : `${formatScore(r.score)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
    </>
  );
}
