import { NotConfiguredError, errorDetail, generateJson } from "@/lib/ai/client";
import { RateLimiter } from "@/lib/finder/limits";
import { safetyCheck } from "@/lib/finder/safety";
import { planRequestSchema, rawPlanSchema } from "@/lib/plan";

export const maxDuration = 60;

const perMinute = new RateLimiter(3, 60 * 1000);
const perDay = new RateLimiter(10, 24 * 60 * 60 * 1000);

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: "error", code: "badRequest" }, 400);
  }
  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) return json({ status: "error", code: "badRequest" }, 400);
  const req = parsed.data;

  const kind = safetyCheck(`${req.goal} ${req.adjust?.instruction ?? ""}`);
  if (kind) return json({ status: "safety", kind });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!perMinute.take(ip) || !perDay.take(ip)) return json({ status: "error", code: "rateLimited" }, 429);

  const lang = req.language === "es" ? "Spanish" : "English";
  const system =
    "You build realistic study and life plans for students in Texas. You output JSON only, in this shape: " +
    '{"title": string, "summary": string, "milestones": [{"horizon": "week"|"month"|"year", "title": string, "steps": [string]}]}. ' +
    "Include at least one milestone for each horizon: week, month, year. Each milestone has 2 to 6 short, concrete, doable steps. " +
    "Fit the plan to the hours per week the student has. Prefer free resources. Never promise outcomes. Do not invent specific programs, deadlines, or prices; say 'look up' or 'ask your counselor' instead.";
  const user = [
    `Goal: ${req.goal}`,
    `Grade: ${req.grade === null ? "unknown" : req.grade}`,
    `Hours per week available: ${req.hoursPerWeek}`,
    `Write every text value in ${lang}.`,
    req.adjust ? `Current plan:\n${req.adjust.current}\n\nThe student wants this change: ${req.adjust.instruction}\nReturn the full updated plan. Keep steps that still fit, and keep wording of unchanged steps exactly.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const plan = await generateJson(system, user, rawPlanSchema, 0.3);
    return json({ status: "ok", plan });
  } catch (error) {
    if (error instanceof NotConfiguredError) return json({ status: "error", code: "notConfigured" }, 503);
    console.error("plan failed", errorDetail(error));
    return json({ status: "error", code: "failed", detail: errorDetail(error) }, 502);
  }
}
