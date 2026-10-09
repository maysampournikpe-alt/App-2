"use client";

import Dexie, { liveQuery, type Table } from "dexie";
import { useCallback, useEffect, useState } from "react";

// One generic table holds the data for every [LOCAL] tool, so adding a tool never
// needs a schema change. Rows are soft-deleted and flagged `dirty` so the account
// sync (Phase 1, M3) can push changes and resolve conflicts by `updatedAt`.

export type LocalRow = {
  tool: string;
  id: string;
  data: unknown;
  updatedAt: number;
  deleted: 0 | 1;
  dirty: 0 | 1;
};

class RumboDB extends Dexie {
  items!: Table<LocalRow, [string, string]>;
  constructor() {
    super("rumbo");
    this.version(1).stores({ items: "[tool+id], tool, dirty, updatedAt" });
  }
}

let db: RumboDB | null = null;
function getDb(): RumboDB {
  db ??= new RumboDB();
  return db;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function putItem<T>(tool: string, id: string, data: T): Promise<void> {
  await getDb().items.put({ tool, id, data, updatedAt: Date.now(), deleted: 0, dirty: 1 });
}

export async function removeItem(tool: string, id: string): Promise<void> {
  await getDb().items.put({ tool, id, data: null, updatedAt: Date.now(), deleted: 1, dirty: 1 });
}

export async function listItems<T>(tool: string): Promise<(T & { id: string; updatedAt: number })[]> {
  const rows = await getDb().items.where("tool").equals(tool).toArray();
  return rows
    .filter((r) => !r.deleted)
    .map((r) => ({ ...(r.data as T), id: r.id, updatedAt: r.updatedAt }));
}

export async function clearAllLocalData(): Promise<void> {
  await getDb().items.clear();
}

export type WithId<T> = T & { id: string; updatedAt: number };

/** Removes the storage fields added by useCollection, leaving the saved data. */
export function stripMeta<T>(item: WithId<T>): T {
  const { id: _id, updatedAt: _updatedAt, ...data } = item;
  void _id;
  void _updatedAt;
  return data as T;
}

/**
 * Live list of a tool's items. `items` is undefined until the first read finishes,
 * so pages can avoid flashing an empty state.
 */
export function useCollection<T>(tool: string) {
  const [items, setItems] = useState<WithId<T>[] | undefined>(undefined);

  useEffect(() => {
    const sub = liveQuery(() => listItems<T>(tool)).subscribe({
      next: setItems,
      error: () => setItems([]),
    });
    return () => sub.unsubscribe();
  }, [tool]);

  const put = useCallback((id: string, data: T) => putItem(tool, id, data), [tool]);
  const remove = useCallback((id: string) => removeItem(tool, id), [tool]);

  return { items, put, remove };
}

/** A single saved object for a tool (for example its settings). */
export function useLocalValue<T>(tool: string, key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sub = liveQuery(() => getDb().items.get([tool, key])).subscribe({
      next: (row) => {
        if (row && !row.deleted) setValue({ ...fallback, ...(row.data as T) });
        setLoaded(true);
      },
      error: () => setLoaded(true),
    });
    return () => sub.unsubscribe();
    // `fallback` is a default shape; changing it later should not resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      return putItem(tool, key, next);
    },
    [tool, key],
  );

  return { value, save, loaded };
}

/** Everything stored on this device, for "Download my data". Deleted rows are left out. */
export async function exportAllData(): Promise<Record<string, unknown[]>> {
  const rows = await getDb().items.toArray();
  const out: Record<string, unknown[]> = {};
  for (const r of rows) {
    if (r.deleted) continue;
    (out[r.tool] ??= []).push({ id: r.id, updatedAt: r.updatedAt, data: r.data });
  }
  return out;
}

// ---- Sync support (used by sync.ts) ----

export async function dirtyRows(): Promise<LocalRow[]> {
  return getDb().items.where("dirty").equals(1).toArray();
}

/** Marks pushed rows clean, unless the student changed them again while the push ran. */
export async function markClean(rows: LocalRow[]): Promise<void> {
  const d = getDb();
  await d.transaction("rw", d.items, async () => {
    for (const r of rows) {
      const current = await d.items.get([r.tool, r.id]);
      if (current && current.updatedAt === r.updatedAt) await d.items.put({ ...current, dirty: 0 });
    }
  });
}

export async function getRow(tool: string, id: string): Promise<LocalRow | undefined> {
  return getDb().items.get([tool, id]);
}

/** Stores a row that came from the account. It is clean, so it is not pushed back. */
export async function putRemote(row: Omit<LocalRow, "dirty">): Promise<void> {
  await getDb().items.put({ ...row, dirty: 0 });
}
