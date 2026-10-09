"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { dirtyRows, getRow, markClean, putRemote } from "@/lib/local-store";
import { remoteWins } from "@/lib/sync-merge";

// Runs while a student is signed in. Pull newer rows from the account, then push local
// changes. Everything a guest made on this device is "dirty", so the first sync after
// sign-in moves it all into the account.

type Remote = { tool: string; item_id: string; data: unknown; updated_at: number; deleted: boolean };

const PAGE = 500;
const cursorKey = (userId: string) => `rumbo-sync-cursor-${userId}`;

function readCursor(userId: string): number {
  try {
    return Number(window.localStorage.getItem(cursorKey(userId))) || 0;
  } catch {
    return 0;
  }
}
function writeCursor(userId: string, value: number) {
  try {
    window.localStorage.setItem(cursorKey(userId), String(value));
  } catch {
    // ignore
  }
}

let running = false;

export async function syncNow(supabase: SupabaseClient, userId: string): Promise<void> {
  if (running) return;
  running = true;
  try {
    // 1. Pull rows changed since last time.
    let cursor = readCursor(userId);
    for (;;) {
      const { data, error } = await supabase
        .from("local_items")
        .select("tool,item_id,data,updated_at,deleted")
        .gt("updated_at", cursor)
        .order("updated_at", { ascending: true })
        .limit(PAGE);
      if (error) throw error;
      const rows = (data ?? []) as Remote[];
      for (const r of rows) {
        const local = await getRow(r.tool, r.item_id);
        if (remoteWins(local, { updatedAt: r.updated_at })) {
          await putRemote({ tool: r.tool, id: r.item_id, data: r.data, updatedAt: r.updated_at, deleted: r.deleted ? 1 : 0 });
        }
        cursor = Math.max(cursor, r.updated_at);
      }
      if (rows.length < PAGE) break;
    }
    writeCursor(userId, cursor);

    // 2. Push local changes. A row that lost in step 1 was overwritten by the account copy
    // and is clean now, so only rows newer than the account's are pushed.
    const dirty = await dirtyRows();
    for (let i = 0; i < dirty.length; i += PAGE) {
      const batch = dirty.slice(i, i + PAGE);
      const { error } = await supabase.from("local_items").upsert(
        batch.map((r) => ({ user_id: userId, tool: r.tool, item_id: r.id, data: r.data ?? null, updated_at: r.updatedAt, deleted: r.deleted === 1 })),
        { onConflict: "user_id,tool,item_id" },
      );
      if (error) throw error;
      await markClean(batch);
    }
  } finally {
    running = false;
  }
}
