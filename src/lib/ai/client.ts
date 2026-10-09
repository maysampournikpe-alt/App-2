import Groq from "groq-sdk";
import type { ZodType } from "zod";
import { CHAT_MODEL } from "./config";

// Server only. One place for the provider client, JSON parsing, and the validate-and-retry loop.

export class NotConfiguredError extends Error {}

export function client(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new NotConfiguredError("GROQ_API_KEY is not set");
  return new Groq({ apiKey });
}

/** A short, key-free reason for a failed AI call, e.g. "401 Invalid API Key". Shown so problems can be fixed. */
export function errorDetail(error: unknown): string {
  const e = error as { status?: number; message?: string } | null;
  const text = `${e?.status ?? ""} ${e?.message ?? String(error)}`.replace(/gsk_[A-Za-z0-9]+/g, "[key]").trim();
  return text.slice(0, 200);
}

/** Pulls the first JSON object out of a model reply, even if it added words around it. */
export function parseJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

/** Asks the chat model for JSON, checks it with zod, and retries once if the shape is wrong. */
export async function generateJson<T>(system: string, user: string, schema: ZodType<T>, temperature = 0.2): Promise<T> {
  const groq = client();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await groq.chat.completions.create({
      model: CHAT_MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    try {
      const parsed = schema.safeParse(parseJson(res.choices[0]?.message?.content ?? ""));
      if (parsed.success) return parsed.data;
    } catch {
      // retry once
    }
  }
  throw new Error("The AI returned an answer in a shape we could not read.");
}
