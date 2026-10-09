import type { AgeGroup, SafetyKind } from "./types";

// Runs before any search. If a student writes about hurting themselves or being
// hurt, the Finder does not search; it points them to a person who can help.
// Patterns cover English and Spanish. This is a safety net, not a diagnosis.

const rules: { kind: SafetyKind; test: RegExp }[] = [
  {
    kind: "crisis",
    test: /\b(kill myself|suicid\w*|end my life|want to die|don'?t want to (?:live|be alive)|hurt myself|harm myself|self[- ]harm|cutting myself|no reason to live|me quiero morir|quiero morir|quitarme la vida|suicidarme|matarme|hacerme da[ñn]o|no quiero vivir)\b/i,
  },
  {
    kind: "abuse",
    test: /\b(abus(?:e|ed|es|ing) me|(?:is|are|was) (?:hitting|touching|hurting) me|touches me|molest\w*|sexually assault\w*|raped|forced me to|being trafficked|trafficking|me (?:golpea|pega|toca|abusa)|abuso sexual|abusan de m[ií]|me violaron)\b/i,
  },
  {
    kind: "danger",
    test: /\b(kill (?:him|her|them|someone|people)|shoot up|bring a (?:gun|weapon)|make a bomb|build a bomb|hurt (?:him|her|them|someone)|run away from home|matar a|hacer una bomba|armas? a la escuela)\b/i,
  },
];

export function safetyCheck(text: string): SafetyKind | null {
  for (const rule of rules) {
    if (rule.test.test(text)) return rule.kind;
  }
  return null;
}

// Topics that do not belong in results shown to students, whatever the source says.
const blocked =
  /\b(casino|gambl\w*|sportsbook|betting|escort|adult (?:entertainment|content|dating)|onlyfans|strip club|vape|vaping shop|alcohol (?:tasting|sales)|cannabis|marijuana (?:dispensary|sales)|sugar (?:daddy|baby)|dating app|payday loan|crypto (?:trading|investment)|forex)\b/i;

export function isStudentSafeText(...parts: (string | null | undefined)[]): boolean {
  return !blocked.test(parts.filter(Boolean).join(" "));
}

/** Extra rules the search prompt adds for younger students. */
export function ageRules(age: AgeGroup): string {
  switch (age) {
    case "under13":
      return "The student is under 13. Only include free or low-cost activities run by schools, libraries, cities, museums, nonprofits, or colleges, suitable for ages under 13 with a parent or guardian involved. No paid jobs. No one-on-one online contact with adults.";
    case "teen":
      return "The student is a minor (about 13 to 17). Only include opportunities open to minors. No jobs or programs that are illegal for minors. Prefer school-, city-, college-, library-, and nonprofit-run options.";
    case "adult":
      return "The student is 18 or older and may be looking at college, jobs, and scholarships. Still prefer trustworthy school, city, college, and nonprofit sources.";
  }
}
