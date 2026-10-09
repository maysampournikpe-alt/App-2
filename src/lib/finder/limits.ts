// Server-side cache and rate limiter. Held in memory for now, so it resets when the
// server restarts and is per instance. M3 moves both into Supabase tables.

const DAY = 24 * 60 * 60 * 1000;
export const CACHE_TTL_MS = 7 * DAY;

type Entry<T> = { at: number; value: T };

export class TtlCache<T> {
  private map = new Map<string, Entry<T>>();
  constructor(
    private ttl: number,
    private max = 500,
  ) {}
  get(key: string, now = Date.now()): T | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (now - hit.at > this.ttl) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: T, now = Date.now()) {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { at: now, value });
  }
}

/** Counts hits per key inside a sliding window. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private limit: number,
    private windowMs: number,
  ) {}
  /** Returns true if the call is allowed (and records it). */
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.hits.clear();
    return true;
  }
}

export const perMinute = new RateLimiter(4, 60 * 1000);
export const perDay = new RateLimiter(20, DAY);

/** Cache key: normalized query, category, area (city), and language. No personal data. */
export function cacheKey(query: string, category: string, area: string, language: string): string {
  const q = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [q, category, area.toLowerCase(), language].join("|");
}
