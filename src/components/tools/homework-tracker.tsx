"use client";

import { useId, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useDates, useMessages } from "@/i18n/client";
import { newId, stripMeta, useCollection, type WithId } from "@/lib/local-store";
import { addDays, daysBetween, todayISO } from "@/lib/dates";
import { groupAssignments, groupOrder, type Assignment } from "@/lib/tools/homework";
import { Section, ToolHeader } from "@/components/ui";

export const HOMEWORK = "homework";
export const HOMEWORK_CLASSES = "homework-classes";

export type SchoolClass = { name: string; color: number };

/** Class colors. Always shown next to the class name, never as the only cue. */
export const classColors = ["#0e7c6b", "#c62f49", "#7b4fd0", "#d77a00", "#2563c9", "#5b7a12"];

/** The assignment with its done state flipped. */
export function toggled(a: WithId<Assignment>): Assignment {
  const done = !a.done;
  return { ...stripMeta(a), done, doneAt: done ? Date.now() : undefined };
}

export function ClassTag({ cls }: { cls?: SchoolClass }) {
  if (!cls) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
      <span className="size-2.5 rounded-full" style={{ background: classColors[cls.color % classColors.length] }} aria-hidden="true" />
      {cls.name}
    </span>
  );
}

export function DueText({ due, done }: { due: string | null; done: boolean }) {
  const m = useMessages();
  const dates = useDates();
  if (!due) return null;
  const d = daysBetween(todayISO(), due);
  const late = !done && d < 0;
  return (
    <span className={`text-sm ${late ? "font-bold text-danger" : "text-ink-soft"}`}>
      {dates.short(due)}
      {!done && d === 0 && ` (${m.common.today})`}
      {!done && d === 1 && ` (${m.common.tomorrow})`}
      {!done && d >= 2 && ` (${m.common.daysLeft(d)})`}
      {late && ` (${m.common.daysLate(-d)})`}
    </span>
  );
}

export function AssignmentRow({
  item,
  cls,
  onToggle,
  onDelete,
}: {
  item: WithId<Assignment>;
  cls?: SchoolClass;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const m = useMessages();
  const id = useId();
  return (
    <li className="flex items-start gap-3 py-2.5">
      <input
        id={id}
        type="checkbox"
        checked={item.done}
        onChange={onToggle}
        className="mt-1 size-6 shrink-0 cursor-pointer accent-[var(--river)]"
        aria-label={item.done ? m.homework.markNotDone(item.title) : m.homework.markDone(item.title)}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className={`block cursor-pointer font-bold break-words ${item.done ? "text-ink-soft line-through" : ""}`}>
          {item.title}
        </label>
        <div className="flex flex-wrap gap-x-3">
          <ClassTag cls={cls} />
          <DueText due={item.due} done={item.done} />
        </div>
      </div>
      {onDelete && (
        <button type="button" className="icon-btn size-10 hover:text-danger" onClick={onDelete} aria-label={m.homework.deleteAssignment(item.title)}>
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

export function HomeworkTracker() {
  const m = useMessages();
  const formId = useId();
  const { items, put, remove } = useCollection<Assignment>(HOMEWORK);
  const { items: classes, put: putClass, remove: removeClass } = useCollection<SchoolClass>(HOMEWORK_CLASSES);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [due, setDue] = useState(() => addDays(todayISO(), 1));
  const [filter, setFilter] = useState("");
  const [newClass, setNewClass] = useState("");

  const classById = new Map((classes ?? []).map((c) => [c.id, c]));
  const today = todayISO();
  const visible = (items ?? []).filter((a) => !filter || a.classId === filter);
  const groups = groupAssignments(visible, today);
  const hasDone = (items ?? []).some((a) => a.done);

  function addAssignment(e: FormEvent) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    void put(newId(), { title: clean, classId: classId || null, due: due || null, done: false });
    setTitle("");
  }

  function addClass(e: FormEvent) {
    e.preventDefault();
    const clean = newClass.trim();
    if (!clean) return;
    void putClass(newId(), { name: clean, color: (classes?.length ?? 0) % classColors.length });
    setNewClass("");
  }

  const toggle = (a: WithId<Assignment>) => void put(a.id, toggled(a));

  return (
    <>
      <ToolHeader tab="homework" title={m.homework.title} intro={m.homework.intro} />

      <form onSubmit={addAssignment} className="panel grid gap-3 sm:grid-cols-12 sm:items-start" aria-labelledby={`${formId}-h`}>
        <h2 id={`${formId}-h`} className="col-span-full text-lg font-bold">
          {m.homework.newAssignment}
        </h2>
        <div className="sm:col-span-5">
          <label htmlFor={`${formId}-title`} className="label">
            {m.homework.assignmentTitle}
          </label>
          <input
            id={`${formId}-title`}
            className="field"
            value={title}
            placeholder={m.homework.assignmentPlaceholder}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor={`${formId}-class`} className="label">
            {m.homework.class}
          </label>
          <select id={`${formId}-class`} className="field" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{m.homework.noClass}</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor={`${formId}-due`} className="label">
            {m.homework.dueDate}
          </label>
          <input id={`${formId}-due`} type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="col-span-full">
          <button type="submit" className="btn-primary">
            <Plus className="size-4" aria-hidden="true" />
            {m.homework.addAssignment}
          </button>
        </div>
      </form>

      {items && (
        <>
          {(classes?.length ?? 0) > 0 && (items.length ?? 0) > 0 && (
            <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
              <div className="w-full max-w-xs">
                <label htmlFor={`${formId}-filter`} className="label">
                  {m.homework.filterLabel}
                </label>
                <select id={`${formId}-filter`} className="field" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="">{m.homework.filterAll}</option>
                  {(classes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <p className="mt-6 text-ink-soft">{m.homework.empty}</p>
          ) : (
            groupOrder.map((key) => {
              const list = groups.get(key);
              if (!list?.length) return null;
              return (
                <Section
                  key={key}
                  title={`${m.homework.groups[key]} (${list.length})`}
                  action={
                    key === "done" && hasDone ? (
                      <button
                        type="button"
                        className="btn-quiet min-h-9 text-sm"
                        onClick={() => list.forEach((a) => void remove(a.id))}
                      >
                        {m.homework.clearDone}
                      </button>
                    ) : undefined
                  }
                >
                  <ul className={`divide-y divide-line rounded-2xl border bg-surface px-4 ${key === "overdue" ? "border-danger" : "border-line"}`}>
                    {list.map((a) => (
                      <AssignmentRow
                        key={a.id}
                        item={a}
                        cls={a.classId ? classById.get(a.classId) : undefined}
                        onToggle={() => toggle(a)}
                        onDelete={() => void remove(a.id)}
                      />
                    ))}
                  </ul>
                </Section>
              );
            })
          )}

          <Section title={m.homework.classesHeading}>
            {(classes?.length ?? 0) > 0 && (
              <ul className="mb-3 flex flex-wrap gap-2">
                {(classes ?? []).map((c) => (
                  <li key={c.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-1 pr-1 pl-3">
                    <ClassTag cls={c} />
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-full text-ink-soft hover:text-danger"
                      onClick={() => void removeClass(c.id)}
                      aria-label={m.homework.deleteClass(c.name)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addClass} className="flex max-w-md items-end gap-2">
              <div className="flex-1">
                <label htmlFor={`${formId}-newclass`} className="label">
                  {m.homework.newClass}
                </label>
                <input id={`${formId}-newclass`} className="field" value={newClass} onChange={(e) => setNewClass(e.target.value)} />
              </div>
              <button type="submit" className="btn-secondary">
                {m.homework.addClassButton}
              </button>
            </form>
          </Section>
        </>
      )}
    </>
  );
}
