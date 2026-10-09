import { NotConfiguredError, client, errorDetail } from "@/lib/ai/client";
import { CHAT_MODEL } from "@/lib/ai/config";
import { coachRequestSchema, coachSystemPrompt, trimMessages } from "@/lib/coach/coach";
import { RateLimiter } from "@/lib/finder/limits";
import { safetyCheck } from "@/lib/finder/safety";

export const maxDuration = 60;

// In memory for now (see finder/limits.ts); moves to Supabase counters later.
const perMinute = new RateLimiter(12, 60 * 1000);
const perDay = new RateLimiter(60, 24 * 60 * 60 * 1000);

const err = (code: string, status: number, detail?: string) => Response.json({ status: "error", code, detail }, { status });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("badRequest", 400);
  }
  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) return err("badRequest", 400);
  const req = parsed.data;

  const messages = trimMessages(req.messages);
  const last = messages.at(-1);
  if (!last || last.role !== "user") return err("badRequest", 400);

  // Serious topics get a fixed, caring answer from the app, not a model improvisation.
  const kind = safetyCheck(last.content);
  if (kind) return Response.json({ status: "safety", kind });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!perMinute.take(ip) || !perDay.take(ip)) return err("rateLimited", 429);

  let stream;
  try {
    stream = await client().chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.5,
      stream: true,
      messages: [{ role: "system", content: coachSystemPrompt(req) }, ...messages],
    });
  } catch (error) {
    if (error instanceof NotConfiguredError) return err("notConfigured", 503);
    console.error("coach failed", errorDetail(error));
    return err("failed", 502, errorDetail(error));
  }

  const encoder = new TextEncoder();
  const body2 = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (error) {
        console.error("coach stream failed", error instanceof Error ? error.message : error);
      }
      controller.close();
    },
  });
  return new Response(body2, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
