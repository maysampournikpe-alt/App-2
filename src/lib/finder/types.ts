import { z } from "zod";

export const categories = [
  "internship",
  "scholarship",
  "volunteering",
  "program",
  "job",
  "competition",
  "club",
  "course",
  "other",
] as const;
export type Category = (typeof categories)[number];

export const costKinds = ["free", "paid", "unknown"] as const;
export type Cost = (typeof costKinds)[number];

export const ageGroups = ["under13", "teen", "adult"] as const;
export type AgeGroup = (typeof ageGroups)[number];

export const scamFlags = ["upfrontMoney", "sensitiveInfo", "tooGoodToBeTrue", "pressure", "offPlatform"] as const;
export type ScamFlag = (typeof scamFlags)[number];

const text = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => {
      const t = v?.trim();
      return t ? t.slice(0, max) : null;
    });

/** One card exactly as the chat model writes it. Nothing here is trusted yet. */
export const rawCardSchema = z.object({
  title: z.string().trim().min(1).max(160),
  organization: text(160),
  category: z.enum(categories).catch("other"),
  summary: z.string().trim().min(1).max(700),
  whyFits: text(400),
  city: text(80),
  online: z.boolean().catch(false),
  cost: z.enum(costKinds).catch("unknown"),
  costNote: text(200),
  deadline: text(80),
  eligibility: text(240),
  howToApply: text(400),
  email: text(120),
  phone: text(40),
  sourceUrl: text(500),
  outreachEmail: text(1200),
  phoneScript: text(900),
});
export type RawCard = z.infer<typeof rawCardSchema>;

export const rawResponseSchema = z.object({ cards: z.array(rawCardSchema).max(12) });

/** A card after the server has checked it. This is what the app shows and saves. */
export type Opportunity = {
  id: string;
  title: string;
  organization: string | null;
  category: Category;
  summary: string;
  whyFits: string | null;
  city: string | null;
  distanceMiles: number | null;
  online: boolean;
  cost: Cost;
  costNote: string | null;
  deadline: string | null;
  eligibility: string | null;
  howToApply: string | null;
  email: string | null;
  phone: string | null;
  /** Only ever a URL the search actually visited. */
  sourceUrl: string | null;
  sourceHost: string | null;
  /** false = "Not a confirmed listing. Contact them first." */
  confirmed: boolean;
  scamFlags: ScamFlag[];
  outreachEmail: string | null;
  phoneScript: string | null;
};

export type FindRequest = {
  query: string;
  category: Category | "any";
  language: "en" | "es";
  ageGroup: AgeGroup;
  /** Profile interests, used only to word "why this fits you". */
  interests?: string[];
  location: { label: string; lat: number; lng: number } | null;
};

export const findRequestSchema = z.object({
  query: z.string().trim().min(2).max(300),
  category: z.enum([...categories, "any"]).catch("any"),
  language: z.enum(["en", "es"]).catch("en"),
  ageGroup: z.enum(ageGroups).catch("teen"),
  interests: z.array(z.string().trim().max(40)).max(10).catch([]).optional(),
  location: z
    .object({
      label: z.string().trim().min(1).max(80),
      lat: z.number().min(24).max(37),
      lng: z.number().min(-107).max(-93),
    })
    .nullable()
    .catch(null),
});

export type SafetyKind = "crisis" | "abuse" | "danger";

export type FindResponse =
  | { status: "ok"; results: Opportunity[]; sources: { title: string; url: string }[]; cached: boolean }
  | { status: "safety"; kind: SafetyKind }
  | { status: "error"; code: "rateLimited" | "notConfigured" | "failed" | "badRequest" };
