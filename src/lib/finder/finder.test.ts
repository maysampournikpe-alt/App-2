import { describe, expect, it } from "vitest";
import { haversineMiles, lookupPlace, nearestPlace } from "./geo";
import { scamCheck } from "./scam";
import { isStudentSafeText, safetyCheck } from "./safety";
import { urlKey, verifyCards, type Source } from "./verify";
import { RateLimiter, TtlCache, cacheKey } from "./limits";
import { rawCardSchema } from "./types";

describe("geo", () => {
  it("finds a place by ZIP, city, and messy text", () => {
    expect(lookupPlace("78501")?.name).toBe("McAllen");
    expect(lookupPlace("Pharr, TX")?.name).toBe("Pharr");
    expect(lookupPlace("city of Edinburg texas")?.name).toBe("Edinburg");
    expect(lookupPlace("78577 ")?.name).toBe("Pharr");
  });
  it("falls back to a 3-digit ZIP area and returns null for unknown places", () => {
    expect(lookupPlace("78599")?.name).toBe("Weslaco");
    expect(lookupPlace("78590")?.name).toBe("McAllen");
    expect(lookupPlace("Atlantis")).toBeNull();
    expect(lookupPlace("")).toBeNull();
  });
  it("measures distance", () => {
    const mc = lookupPlace("McAllen")!;
    const bv = lookupPlace("Brownsville")!;
    const miles = haversineMiles(mc, bv);
    expect(miles).toBeGreaterThan(45);
    expect(miles).toBeLessThan(56);
    expect(nearestPlace({ lat: 26.21, lng: -98.22 }).place.name).toBe("McAllen");
  });
});

describe("scamCheck", () => {
  it("flags upfront money, private info, and pressure", () => {
    expect(scamCheck("Pay a $50 registration fee to start")).toContain("upfrontMoney");
    expect(scamCheck("Send your social security number")).toContain("sensitiveInfo");
    expect(scamCheck("Act now, only 3 spots left")).toContain("pressure");
    expect(scamCheck("Earn $500 per day from home")).toContain("tooGoodToBeTrue");
    expect(scamCheck("Message us on WhatsApp")).toContain("offPlatform");
  });
  it("leaves ordinary listings alone", () => {
    expect(scamCheck("Free summer coding camp at the McAllen Public Library. Apply online by May 1.")).toEqual([]);
  });
});

describe("safety", () => {
  it("catches serious topics in English and Spanish", () => {
    expect(safetyCheck("I want to kill myself")).toBe("crisis");
    expect(safetyCheck("me quiero morir")).toBe("crisis");
    expect(safetyCheck("my uncle touches me")).toBe("abuse");
    expect(safetyCheck("how to make a bomb")).toBe("danger");
  });
  it("lets normal searches through", () => {
    expect(safetyCheck("free summer internships for juniors")).toBeNull();
    expect(safetyCheck("volunteer at an animal shelter")).toBeNull();
  });
  it("blocks adult topics from results", () => {
    expect(isStudentSafeText("Casino dealer training")).toBe(false);
    expect(isStudentSafeText("Library teen volunteers")).toBe(true);
  });
});

const sources: Source[] = [
  {
    title: "Teen volunteers",
    url: "https://www.mcallenlibrary.net/teens/",
    content: "Teens can volunteer. Email teens@mcallenlibrary.net or call (956) 555-0142.",
  },
];

const card = (over: Record<string, unknown> = {}) =>
  rawCardSchema.parse({
    title: "Teen Volunteers",
    organization: "McAllen Public Library",
    category: "volunteering",
    summary: "Help at library events.",
    city: "McAllen",
    cost: "free",
    deadline: "May 1",
    email: "teens@mcallenlibrary.net",
    phone: "956-555-0142",
    sourceUrl: "https://mcallenlibrary.net/teens",
    ...over,
  });

describe("verifyCards", () => {
  it("normalizes URLs", () => {
    expect(urlKey("https://www.Example.com/a/?x=1#top")).toBe("example.com/a?x=1");
    expect(urlKey("javascript:alert(1)")).toBeNull();
  });
  it("confirms a card whose URL the search visited and keeps contacts found on the page", () => {
    const [r] = verifyCards([card()], sources, lookupPlace("Pharr"));
    expect(r.confirmed).toBe(true);
    expect(r.sourceUrl).toBe("https://www.mcallenlibrary.net/teens/");
    expect(r.email).toBe("teens@mcallenlibrary.net");
    expect(r.phone).toBe("956-555-0142");
    expect(r.distanceMiles).toBeGreaterThan(0);
  });
  it("drops invented contact details", () => {
    const [r] = verifyCards([card({ email: "fake@nowhere.org", phone: "999-999-9999" })], sources, null);
    expect(r.email).toBeNull();
    expect(r.phone).toBeNull();
  });
  it("downgrades a card with an unvisited URL and clears its unbacked details", () => {
    const [r] = verifyCards([card({ sourceUrl: "https://invented.example/program" })], sources, null);
    expect(r.confirmed).toBe(false);
    expect(r.sourceUrl).toBeNull();
    expect(r.deadline).toBeNull();
    expect(r.cost).toBe("unknown");
    expect(r.email).toBeNull();
  });
  it("sorts confirmed first, removes duplicates and unsafe cards", () => {
    const out = verifyCards(
      [
        card({ title: "Contact the library", sourceUrl: null }),
        card(),
        card(),
        card({ title: "Casino dealer academy", sourceUrl: null }),
      ],
      sources,
      null,
    );
    expect(out.map((o) => o.confirmed)).toEqual([true, false]);
  });
  it("adds scam flags from the card text", () => {
    const [r] = verifyCards([card({ howToApply: "Send a $40 registration fee by Zelle" })], sources, null);
    expect(r.scamFlags).toContain("upfrontMoney");
  });
});

describe("limits", () => {
  it("expires cache entries", () => {
    const c = new TtlCache<number>(1000);
    c.set("a", 1, 0);
    expect(c.get("a", 500)).toBe(1);
    expect(c.get("a", 1500)).toBeUndefined();
  });
  it("limits calls inside a window", () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.take("x", 0)).toBe(true);
    expect(rl.take("x", 10)).toBe(true);
    expect(rl.take("x", 20)).toBe(false);
    expect(rl.take("x", 1500)).toBe(true);
  });
  it("builds the same key for the same search", () => {
    expect(cacheKey("Free  Internships!", "any", "McAllen", "en")).toBe(cacheKey("free internships", "any", "mcallen", "en"));
  });
});

describe("rawCardSchema", () => {
  it("fixes bad enum values and nulls", () => {
    const c = rawCardSchema.parse({ title: "x", summary: "y", category: "weird", cost: "maybe", email: null });
    expect(c.category).toBe("other");
    expect(c.cost).toBe("unknown");
    expect(c.email).toBeNull();
  });
});
