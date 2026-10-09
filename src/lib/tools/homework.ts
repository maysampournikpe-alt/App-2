import { daysBetween } from "@/lib/dates";

export type Assignment = {
  title: string;
  classId: string | null;
  due: string | null;
  done: boolean;
  doneAt?: number;
};

export type GroupKey = "overdue" | "today" | "tomorrow" | "week" | "later" | "noDate" | "done";
export const groupOrder: GroupKey[] = ["overdue", "today", "tomorrow", "week", "later", "noDate", "done"];

export function groupFor(a: Assignment, today: string): GroupKey {
  if (a.done) return "done";
  if (!a.due) return "noDate";
  const d = daysBetween(today, a.due);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d <= 7) return "week";
  return "later";
}

export function groupAssignments<T extends Assignment>(items: T[], today: string): Map<GroupKey, T[]> {
  const groups = new Map<GroupKey, T[]>();
  const sorted = [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done && b.done) return (b.doneAt ?? 0) - (a.doneAt ?? 0);
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due) || a.title.localeCompare(b.title);
  });
  for (const item of sorted) {
    const key = groupFor(item, today);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}
