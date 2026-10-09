import { z } from "zod";
import { ageRules } from "@/lib/finder/safety";
import { ageGroups, type AgeGroup } from "@/lib/finder/types";

export const coachModes = ["chat", "homework", "interview", "debate", "quiz"] as const;
export type CoachMode = (typeof coachModes)[number];

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 2000;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const coachRequestSchema = z.object({
  mode: z.enum(coachModes).catch("chat"),
  language: z.enum(["en", "es"]).catch("en"),
  ageGroup: z.enum(ageGroups).catch("teen"),
  grade: z.number().int().min(0).max(12).nullable().catch(null),
  interests: z.array(z.string().trim().max(40)).max(10).catch([]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .min(1)
    .max(60),
});
export type CoachRequest = z.infer<typeof coachRequestSchema>;

/** Keeps the latest messages, trimmed, and makes sure the list starts with the student. */
export function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-MAX_MESSAGES).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
  while (recent.length > 0 && recent[0].role !== "user") recent.shift();
  return recent;
}

const modeRules: Record<CoachMode, string> = {
  chat: "Answer questions about school, college, careers, and growing up. Be concrete and brief. Offer one next step.",
  homework:
    "HOMEWORK MODE. Teach; do not just hand over answers. Ask what the student already tried. Break the problem into small steps. Ask one guiding question at a time and wait for the student to answer. Give a hint before a worked step. Only show a full solution if the student has genuinely tried and is still stuck, and then explain why each step works. Never write an essay or a full assignment for them: help them outline and improve their own writing.",
  interview:
    "MOCK INTERVIEW MODE. You are the interviewer. Ask ONE realistic question at a time (for an internship, job, scholarship, or college). After the student answers, give two short pieces of specific feedback (what worked, one thing to improve), then ask the next question. Start by asking what position they are practicing for.",
  debate:
    "DEBATE MODE. Ask the student for a topic and which side they take, then argue the OTHER side respectfully with short, strong points. Pick topics suited to a school setting. Point out one weak spot in their argument at a time. Never argue for hate, violence, or harm toward any group.",
  quiz:
    "QUIZ MODE. Ask what subject and topic. Then quiz one question at a time, matched to their grade. Wait for the answer, say whether it is right, explain briefly, then ask the next question. Keep a running score.",
};

export function coachSystemPrompt(req: Pick<CoachRequest, "mode" | "language" | "ageGroup" | "grade" | "interests">): string {
  const lang = req.language === "es" ? "Spanish" : "English";
  const who = [
    req.grade !== null ? `The student is in ${req.grade === 0 ? "kindergarten" : `grade ${req.grade}`}.` : "",
    req.interests.length ? `Their interests: ${req.interests.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [
    "You are Rumbo Coach, a kind, honest study and life coach for students in Texas, especially the Rio Grande Valley.",
    `Reply in ${lang} unless the student writes in another language. Use plain words and short paragraphs.`,
    who,
    ageRulesForCoach(req.ageGroup),
    modeRules[req.mode],
    "Safety: if the student mentions hurting themselves, abuse, or danger, respond warmly, encourage them to talk to a trusted adult or school counselor right away, and mention 988 (call or text) for crisis support. Do not give instructions for anything harmful or illegal.",
    "Never ask for or store private details like full name, address, phone number, or passwords. If you do not know something, say so instead of guessing. You are an AI, not a person.",
  ]
    .filter(Boolean)
    .join("\n");
}

function ageRulesForCoach(age: AgeGroup): string {
  return age === "under13"
    ? "The student is under 13. Keep language simple and content child-appropriate. Encourage them to involve a parent or teacher for big decisions."
    : age === "teen"
      ? "The student is a minor. Keep content age-appropriate."
      : ageRules(age);
}
