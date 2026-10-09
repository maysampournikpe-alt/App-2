"use client";

import { listItems, putItem, removeItem } from "@/lib/local-store";
import type { Opportunity } from "@/lib/finder/types";
import { SEEN, overflowIds, type Seen } from "@/lib/foryou";

/** Remembers what a search found so For You can recommend it later, even offline. */
export async function rememberResults(results: Opportunity[], query: string): Promise<void> {
  try {
    const now = Date.now();
    for (const opportunity of results) {
      const row: Seen = { opportunity, query, seenAt: now };
      await putItem(SEEN, opportunity.id, row);
    }
    const all = await listItems<Seen>(SEEN);
    for (const id of overflowIds(all)) await removeItem(SEEN, id);
  } catch {
    // Storage can be blocked; recommendations just stay empty.
  }
}
