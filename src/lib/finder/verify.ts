import { isStudentSafeText } from "./safety";
import { milesBetween } from "./geo";
import { scamCheck } from "./scam";
import type { Opportunity, RawCard } from "./types";

export type Source = { title: string; url: string; content: string };

/** Compares URLs without tracking junk, "www.", fragments, or a trailing slash. */
export function urlKey(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}${u.search ? u.search : ""}`.toLowerCase();
  } catch {
    return null;
  }
}

export function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const digits = (s: string) => s.replace(/\D/g, "");

/**
 * Turns the model's cards into checked opportunities.
 *
 * - A card keeps its source link only if the search really visited that URL.
 * - Without a verified link the card becomes "not a confirmed listing": its dates,
 *   cost, and contact details are cleared, because nothing backs them up.
 * - An email or phone number is kept only if it appears in the pages the search read.
 */
export function verifyCards(
  cards: RawCard[],
  sources: Source[],
  origin: { lat: number; lng: number } | null,
): Opportunity[] {
  const byKey = new Map<string, Source>();
  for (const s of sources) {
    const key = urlKey(s.url);
    if (key && !byKey.has(key)) byKey.set(key, s);
  }

  const seen = new Set<string>();
  const out: Opportunity[] = [];

  for (const card of cards) {
    if (!isStudentSafeText(card.title, card.organization, card.summary)) continue;

    const key = card.sourceUrl ? urlKey(card.sourceUrl) : null;
    const source = key ? byKey.get(key) : undefined;
    const confirmed = Boolean(source);
    const dedupe = `${(card.organization ?? "").toLowerCase()}|${card.title.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    const pageText = source ? source.content.toLowerCase() : "";
    const email = confirmed && card.email && pageText.includes(card.email.toLowerCase()) ? card.email : null;
    const phone = confirmed && card.phone && digits(card.phone).length >= 7 && digits(pageText).includes(digits(card.phone)) ? card.phone : null;

    out.push({
      id: key ?? `unconfirmed-${out.length}-${dedupe}`,
      title: card.title,
      organization: card.organization,
      category: card.category,
      summary: card.summary,
      whyFits: card.whyFits,
      city: card.city,
      distanceMiles: origin ? milesBetween(origin, card.city) : null,
      online: card.online,
      cost: confirmed ? card.cost : "unknown",
      costNote: confirmed ? card.costNote : null,
      deadline: confirmed ? card.deadline : null,
      eligibility: confirmed ? card.eligibility : null,
      howToApply: confirmed ? card.howToApply : null,
      email,
      phone,
      sourceUrl: source ? source.url : null,
      sourceHost: source ? hostOf(source.url) : null,
      confirmed,
      scamFlags: scamCheck(card.title, card.summary, card.costNote, card.howToApply, card.eligibility),
      outreachEmail: confirmed ? null : card.outreachEmail,
      phoneScript: confirmed ? null : card.phoneScript,
    });
  }

  // Confirmed first; unconfirmed suggestions never outnumber the leftover slots.
  out.sort((a, b) => Number(b.confirmed) - Number(a.confirmed));
  return out;
}
