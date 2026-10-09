import { safetyCheck } from "@/lib/finder/safety";
import { buildCards, NotConfiguredError, searchWeb } from "@/lib/finder/search";
import { CACHE_TTL_MS, TtlCache, cacheKey, perDay, perMinute } from "@/lib/finder/limits";
import { findRequestSchema, type FindResponse } from "@/lib/finder/types";
import { verifyCards } from "@/lib/finder/verify";
import { lookupPlace, nearestPlace } from "@/lib/finder/geo";

export const maxDuration = 60;

type Payload = Extract<FindResponse, { status: "ok" }>;
const cache = new TtlCache<Payload>(CACHE_TTL_MS);

const json = (body: FindResponse, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: "error", code: "badRequest" }, 400);
  }
  const parsed = findRequestSchema.safeParse(body);
  if (!parsed.success) return json({ status: "error", code: "badRequest" }, 400);
  const req = parsed.data;

  // Safety first: no search for serious topics, and it costs the student no quota.
  const kind = safetyCheck(req.query);
  if (kind) return json({ status: "safety", kind });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!perMinute.take(ip) || !perDay.take(ip)) return json({ status: "error", code: "rateLimited" }, 429);

  const origin = req.location ? { lat: req.location.lat, lng: req.location.lng } : null;
  const area = req.location ? (nearestPlace(req.location).place.name ?? lookupPlace(req.location.label)?.name ?? "") : "";
  // Younger students get their own cache entries, since their results are filtered harder.
  const key = cacheKey(req.query, req.category, area, req.language) + `|${req.ageGroup}`;
  const hit = cache.get(key);
  if (hit) return json({ ...hit, cached: true });

  try {
    const { text, sources } = await searchWeb(req);
    const raw = await buildCards(req, text, sources);
    const results = verifyCards(raw, sources, origin);
    const payload: Payload = {
      status: "ok",
      results,
      sources: sources.slice(0, 10).map((s) => ({ title: s.title, url: s.url })),
      cached: false,
    };
    if (results.length > 0) cache.set(key, payload);
    return json(payload);
  } catch (error) {
    if (error instanceof NotConfiguredError) return json({ status: "error", code: "notConfigured" }, 503);
    console.error("find failed", error instanceof Error ? error.message : error);
    return json({ status: "error", code: "failed" }, 502);
  }
}
