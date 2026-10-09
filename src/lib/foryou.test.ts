import { describe, expect, it } from "vitest";
import type { Opportunity } from "@/lib/finder/types";
import { buildFeed, matchInterest, overflowIds, suggestTools, type Seen } from "./foryou";

const opp = (over: Partial<Opportunity>): Opportunity => ({
  id: "x", title: "Teen volunteers", organization: "Library", category: "volunteering", summary: "Help at events.", whyFits: null,
  city: "McAllen", distanceMiles: 5, online: false, cost: "free", costNote: null, deadline: null, eligibility: null, howToApply: null,
  email: null, phone: null, sourceUrl: "https://a.org", sourceHost: "a.org", confirmed: true, scamFlags: [], outreachEmail: null, phoneScript: null, ...over,
});
const seen = (o: Opportunity, at = 1, query = "q"): Seen => ({ opportunity: o, query, seenAt: at });

describe("matchInterest", () => {
  it("finds an interest by word, tolerating plurals", () => {
    expect(matchInterest(opp({ title: "Animal shelter helper" }), [{ id: "animals", label: "Animals" }])?.id).toBe("animals");
    expect(matchInterest(opp({}), [{ id: "coding", label: "Coding" }])).toBeNull();
  });
});

describe("buildFeed", () => {
  it("puts free, close, confirmed, and matching items first", () => {
    const good = opp({ id: "good", title: "Animal shelter" });
    const paid = opp({ id: "paid", cost: "paid" });
    const far = opp({ id: "far", distanceMiles: 80, confirmed: false });
    const feed = buildFeed([seen(far), seen(paid), seen(good)], {}, [{ id: "animals", label: "Animals" }]);
    expect(feed.map((f) => f.id)).toEqual(["good", "paid", "far"]);
    expect(feed[0].reason).toEqual({ type: "interest", label: "Animals" });
  });
  it("hides not-interested items and anything with a scam warning", () => {
    const feed = buildFeed([seen(opp({ id: "a" })), seen(opp({ id: "b" })), seen(opp({ id: "c", scamFlags: ["upfrontMoney"] }))], { a: "notInterested" }, []);
    expect(feed.map((f) => f.id)).toEqual(["b"]);
  });
  it("boosts the category of liked items and uses the newest copy", () => {
    const club = opp({ id: "club", category: "club", distanceMiles: 20 });
    const vol = opp({ id: "vol", distanceMiles: 20 });
    const liked = opp({ id: "liked", category: "club", distanceMiles: 20 });
    const feed = buildFeed([seen(vol), seen(club), seen(liked), seen(opp({ id: "vol", title: "New title", distanceMiles: 20 }), 9)], { liked: "liked" }, []);
    expect(feed[0].opportunity.category).toBe("club");
    expect(feed.find((f) => f.id === "vol")?.opportunity.title).toBe("New title");
  });
  it("falls back to the search words when no interest matches", () => {
    expect(buildFeed([seen(opp({}), 1, "free camps")], {}, [])[0].reason).toEqual({ type: "query", label: "free camps" });
  });
});

describe("helpers", () => {
  it("lists the oldest ids beyond the cap", () => {
    const rows = [1, 2, 3, 4].map((n) => ({ id: `r${n}`, updatedAt: n }));
    expect(overflowIds(rows, 2)).toEqual(["r2", "r1"]);
  });
  it("suggests grade-appropriate tools", () => {
    expect(suggestTools(6).map((t) => t.toolId)).not.toContain("gpa");
    expect(suggestTools(10).map((t) => t.toolId)).toContain("gpa");
  });
});
