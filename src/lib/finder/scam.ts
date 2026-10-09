import type { ScamFlag } from "./types";

// Plain pattern checks. A flag is a warning to slow down, not proof of a scam
// (real programs sometimes charge fees), so the wording in the app says "check first".

const rules: { flag: ScamFlag; test: RegExp }[] = [
  {
    flag: "upfrontMoney",
    test: /\b(registration fee|application fee|processing fee|starter kit|training fee|deposit|pay (?:us|upfront|up front|first)|send (?:money|payment)|wire transfer|gift ?cards?|zelle|cash ?app|venmo|western union|bitcoin|crypto(?:currency)?|cheque|check (?:deposit|will be sent)|buy (?:your own )?equipment)\b/i,
  },
  {
    flag: "sensitiveInfo",
    test: /\b(social security|ssn|bank (?:account|login|details)|routing number|credit card|debit card|card number|passport number|driver'?s? licen[sc]e number|password|pin number)\b/i,
  },
  {
    flag: "tooGoodToBeTrue",
    test: /\b(earn (?:up to )?\$?\d{3,}[\d,]*\s*(?:\/|per|a)?\s*(?:day|week|hour|hr)|guaranteed (?:job|income|admission|scholarship|winner)|no experience (?:needed|required)[^.]{0,60}\$\d{3,}|get rich|easy money|make \$\d{3,}[\d,]* (?:fast|quick|from home)|you(?:'ve| have) (?:been selected|won))\b/i,
  },
  {
    flag: "pressure",
    test: /\b(act (?:now|fast|today)|limited spots?[^.]{0,40}(?:pay|today|now)|only \d+ spots? left|urgent(?:ly)? hiring|respond immediately|offer expires (?:today|tonight)|don'?t tell (?:your )?(?:parents|family))\b/i,
  },
  {
    flag: "offPlatform",
    test: /\b(whatsapp|telegram|signal me|text me at|dm me|contact (?:us )?only (?:on|via|through) (?:instagram|snapchat|facebook))\b/i,
  },
];

export function scamCheck(...parts: (string | null | undefined)[]): ScamFlag[] {
  const text = parts.filter(Boolean).join(" \n ");
  const found: ScamFlag[] = [];
  for (const rule of rules) {
    if (rule.test.test(text)) found.push(rule.flag);
  }
  return found;
}
