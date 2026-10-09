import { client, parseJson } from "@/lib/ai/client";
import { CHAT_MODEL, SEARCH_MODEL } from "@/lib/ai/config";
import { ageRules } from "./safety";
import { rawResponseSchema, type FindRequest, type RawCard } from "./types";
import type { Source } from "./verify";

// Server only. Step 1: a web-search model reads real pages and reports which it visited.
// Step 2: a chat model turns that text into cards. verify.ts then checks the cards.

/** Local sources first. The search prompt asks for these before generic sites. */
export const priorityDomains = [
  "*.gov",
  "*.edu",
  "*.k12.tx.us",
  "*.isd.org",
  "*.txed.net",
  "*.org",
  "twc.texas.gov",
  "tea.texas.gov",
  "texasbasic.org",
  "bigfuture.collegeboard.org",
  "utrgv.edu",
  "southtexascollege.edu",
  "tsc.edu",
];

const languageName = (l: "en" | "es") => (l === "es" ? "Spanish" : "English");

function searchPrompt(req: FindRequest): string {
  const where = req.location ? `near ${req.location.label}, Texas (Rio Grande Valley region if applicable)` : "in Texas, or online and open to Texas students";
  const kind = req.category === "any" ? "" : ` The student wants this kind: ${req.category}.`;
  return [
    `Find real, current opportunities for a student. Request: "${req.query}". Location: ${where}.${kind}`,
    ageRules(req.ageGroup),
    `Search local sources first: city, county, school district (ISD), library, ${priorityDomains.slice(0, 4).join(", ")} and college sites, then well-known nonprofits.`,
    "Prefer free options. Note cost, deadline, who can apply, how to apply, and a contact. Say plainly when something is not stated on the page.",
    "Do not invent anything. If you cannot find a real listing, say so.",
  ].join("\n");
}

type CompoundMessage = {
  content?: string | null;
  executed_tools?: { search_results?: { results?: { title?: string; url?: string; content?: string }[] } | null }[];
};

export async function searchWeb(req: FindRequest): Promise<{ text: string; sources: Source[] }> {
  const res = await client().chat.completions.create({
    model: SEARCH_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a careful research assistant for high school students in Texas. You only report what you read on web pages. You never make up programs, dates, prices, emails, or phone numbers.",
      },
      { role: "user", content: searchPrompt(req) },
    ],
  });
  const message = res.choices[0]?.message as unknown as CompoundMessage | undefined;
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const tool of message?.executed_tools ?? []) {
    for (const r of tool.search_results?.results ?? []) {
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      sources.push({ title: r.title ?? r.url, url: r.url, content: r.content ?? "" });
    }
  }
  return { text: message?.content ?? "", sources };
}

function cardsPrompt(req: FindRequest, text: string, sources: Source[]): string {
  const list = sources
    .slice(0, 12)
    .map((s, i) => `[${i + 1}] ${s.url}\n${s.title}\n${s.content.slice(0, 900)}`)
    .join("\n\n");
  return [
    `Student request: "${req.query}". Place: ${req.location?.label ?? "Texas"}.${req.interests?.length ? ` Student interests: ${req.interests.join(", ")}.` : ""} Write every text value in ${languageName(req.language)}.`,
    ageRules(req.ageGroup),
    "",
    "Using ONLY the research notes and pages below, return JSON: {\"cards\": [...]} with up to 8 cards, best fit first.",
    "Each card has: title, organization, category (internship|scholarship|volunteering|program|job|competition|club|course|other), summary (1-2 sentences), whyFits (one sentence about why it fits this student's request), city (a Texas city or null), online (boolean), cost (free|paid|unknown), costNote, deadline, eligibility, howToApply, email, phone, sourceUrl, outreachEmail, phoneScript.",
    "Rules:",
    "- sourceUrl must be copied exactly from one of the numbered pages below. Never write a URL that is not listed.",
    "- Use null for anything the pages do not state. Never guess a date, price, email, or phone number.",
    "- If the notes mention a kind of place worth contacting but no listing page (for example a library's teen program), you may add it with sourceUrl null. For those cards only, write outreachEmail (a short polite email from the student, with a [Your name] placeholder) and phoneScript (a short script for a phone call). Leave those two null when sourceUrl is set.",
    "- Skip anything unsuitable for a student or that asks for money upfront or private information.",
    "",
    "RESEARCH NOTES:",
    text.slice(0, 6000),
    "",
    "PAGES:",
    list || "(no pages found)",
  ].join("\n");
}

/** Asks for cards, validates with zod, and retries once on bad output. */
export async function buildCards(req: FindRequest, text: string, sources: Source[]): Promise<RawCard[]> {
  const groq = client();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await groq.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You turn research notes into JSON. You output JSON only and never add facts that are not in the notes." },
        { role: "user", content: cardsPrompt(req, text, sources) },
      ],
    });
    try {
      const parsed = rawResponseSchema.safeParse(parseJson(res.choices[0]?.message?.content ?? ""));
      if (parsed.success) return parsed.data.cards;
    } catch {
      // fall through and retry once
    }
  }
  throw new Error("The AI returned results in a shape we could not read.");
}
