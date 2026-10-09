"use client";

import { useState } from "react";
import { useMessages } from "@/i18n/client";
import { locales, localeList } from "@/i18n";
import { updateSettings, useSettings } from "@/lib/settings";
import {
  INTERESTS_MAX,
  INTERESTS_MIN,
  addCustomInterest,
  interestIds,
  interestsFromQuiz,
  needsConsent,
  suggestGrade,
  toggleInterest,
  validBirth,
  quizAnswers,
  type Profile,
} from "@/lib/profile";
import { PageHeader } from "@/components/ui";

const STEPS = 4;
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 16 }, (_, i) => thisYear - 5 - i);

export function InterestPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const o = useMessages().me.onboarding;
  const labels = useMessages().me.interests as Record<string, string>;
  const [custom, setCustom] = useState("");
  const [quiz, setQuiz] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);
  const customOnes = value.filter((v) => !(interestIds as readonly string[]).includes(v));
  const full = value.length >= INTERESTS_MAX;

  return (
    <div>
      <p className="help mb-3" role="status">
        {o.picked(value.length, INTERESTS_MAX)}
        {value.length < INTERESTS_MIN && ` · ${o.needMore(INTERESTS_MIN - value.length)}`}
      </p>
      <ul className="flex flex-wrap gap-2">
        {[...interestIds, ...customOnes].map((id) => {
          const on = value.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => onChange(toggleInterest(value, id))}
                className={`min-h-11 rounded-full border px-4 font-bold disabled:opacity-40 ${
                  on ? "border-river bg-river text-on-river" : "border-line bg-surface hover:bg-surface-2"
                }`}
              >
                {labels[id] ?? id}
              </button>
            </li>
          );
        })}
      </ul>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(addCustomInterest(value, custom));
          setCustom("");
        }}
      >
        <div className="min-w-48 flex-1">
          <label htmlFor="custom-interest" className="label">
            {o.customLabel}
          </label>
          <input id="custom-interest" className="field" value={custom} maxLength={40} placeholder={o.customPlaceholder} onChange={(e) => setCustom(e.target.value)} />
        </div>
        <button type="submit" className="btn-secondary" disabled={!custom.trim() || full}>
          {o.customAdd}
        </button>
      </form>

      <div className="mt-5">
        <button type="button" className="btn-quiet" aria-expanded={quiz} onClick={() => setQuiz(!quiz)}>
          {o.notSure}
        </button>
        {quiz && (
          <fieldset className="panel mt-2">
            <legend className="font-bold">{o.quizTitle}</legend>
            <p className="help">{o.quizHelp}</p>
            <div className="mt-3 space-y-2">
              {Object.keys(quizAnswers).map((key) => (
                <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-6 accent-[var(--river)]"
                    checked={picks.includes(key)}
                    onChange={() => setPicks(picks.includes(key) ? picks.filter((p) => p !== key) : [...picks, key])}
                  />
                  {(o.quiz as Record<string, string>)[key]}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary mt-3"
              disabled={picks.length === 0}
              onClick={() => {
                const merged = [...new Set([...value, ...interestsFromQuiz(picks)])].slice(0, INTERESTS_MAX);
                onChange(merged);
                setQuiz(false);
              }}
            >
              {o.quizApply}
            </button>
          </fieldset>
        )}
      </div>
    </div>
  );
}

export function Onboarding({ initial, onDone }: { initial: Profile; onDone: (p: Profile) => void }) {
  const m = useMessages();
  const o = m.me.onboarding;
  const settings = useSettings();
  const [step, setStep] = useState(1);
  const [p, setP] = useState<Profile>(initial);
  const [error, setError] = useState(false);

  const month = p.birthMonth;
  const year = p.birthYear;
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString(locales[settings.locale].dateLocale, { month: "long" }));

  const next = () => {
    if (step === 1) {
      if (!validBirth(month, year)) return setError(true);
      setError(false);
      setP((cur) => ({ ...cur, grade: cur.grade ?? suggestGrade(month!, year!) }));
    }
    setStep(step + 1);
  };

  const finish = () =>
    onDone({ ...p, onboarded: true, consent: needsConsent(p.birthMonth, p.birthYear) ? "pending" : "notNeeded" });

  const canFinish = p.interests.length >= INTERESTS_MIN;

  return (
    <>
      <PageHeader title={o.welcome} intro={o.stepOf(step, STEPS)} />
      <div className="panel space-y-5">
        {step === 1 && (
          <>
            <div>
              <label htmlFor="nick" className="label">
                {o.nicknameLabel}
              </label>
              <input id="nick" className="field" value={p.nickname} maxLength={30} onChange={(e) => setP({ ...p, nickname: e.target.value })} autoComplete="off" />
              <p className="help">{o.nicknameHelp}</p>
            </div>
            <fieldset>
              <legend className="label">{o.birthTitle}</legend>
              <p className="help mb-2">{o.birthHelp}</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="bm" className="sr-only">
                    {o.month}
                  </label>
                  <select id="bm" className="field" value={month ?? ""} onChange={(e) => setP({ ...p, birthMonth: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">{o.month}</option>
                    {months.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="by" className="sr-only">
                    {o.year}
                  </label>
                  <select id="by" className="field" value={year ?? ""} onChange={(e) => setP({ ...p, birthYear: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">{o.year}</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <p role="alert" className="mt-2 font-bold text-danger">
                  {o.birthInvalid}
                </p>
              )}
            </fieldset>
          </>
        )}

        {step === 2 && (
          <div>
            <label htmlFor="grade" className="label">
              {o.gradeTitle}
            </label>
            <select id="grade" className="field max-w-xs" value={p.grade ?? ""} onChange={(e) => setP({ ...p, grade: Number(e.target.value) })}>
              {Array.from({ length: 13 }, (_, g) => (
                <option key={g} value={g}>
                  {o.gradeName(g)}
                </option>
              ))}
            </select>
            <p className="help">{o.gradeHelp}</p>
          </div>
        )}

        {step === 3 && (
          <fieldset>
            <legend className="label">{o.languageTitle}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {localeList.map((l) => (
                <button
                  key={l}
                  type="button"
                  lang={locales[l].htmlLang}
                  aria-pressed={settings.locale === l}
                  onClick={() => updateSettings({ locale: l })}
                  className={`min-h-11 rounded-full border px-5 font-bold ${settings.locale === l ? "border-river bg-river text-on-river" : "border-line bg-surface"}`}
                >
                  {locales[l].messages.meta.languageName}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {step === 4 && (
          <>
            <div>
              <h2 className="text-xl font-bold">{o.interestsTitle}</h2>
              <p className="help">{o.interestsHelp(INTERESTS_MIN, INTERESTS_MAX)}</p>
            </div>
            <InterestPicker value={p.interests} onChange={(interests) => setP({ ...p, interests })} />
            {needsConsent(p.birthMonth, p.birthYear) && (
              <div role="note" className="rounded-xl bg-river-soft p-3">
                <p className="font-bold text-river">{o.under13Title}</p>
                <p>{o.under13Body}</p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-between gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)} disabled={step === 1}>
            {o.back}
          </button>
          {step < STEPS ? (
            <button type="button" className="btn-primary" onClick={next}>
              {o.next}
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={finish} disabled={!canFinish}>
              {o.finish}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
