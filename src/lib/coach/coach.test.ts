import { describe, expect, it } from "vitest";
import { coachRequestSchema, coachSystemPrompt, trimMessages } from "./coach";

describe("trimMessages", () => {
  it("keeps the latest 20, starts with the student, and trims long text", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 === 0 ? ("user" as const) : ("assistant" as const), content: "x".repeat(3000) }));
    const out = trimMessages(many);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out[0].role).toBe("user");
    expect(out[0].content).toHaveLength(2000);
  });
  it("returns nothing when there is no student message", () => {
    expect(trimMessages([{ role: "assistant", content: "hi" }])).toEqual([]);
  });
});

describe("coachSystemPrompt", () => {
  it("teaches instead of answering in homework mode and follows the language", () => {
    const p = coachSystemPrompt({ mode: "homework", language: "es", ageGroup: "teen", grade: 9, interests: ["art"] });
    expect(p).toContain("HOMEWORK MODE");
    expect(p).toContain("Spanish");
    expect(p).toContain("grade 9");
    expect(p).toContain("988");
  });
});

describe("coachRequestSchema", () => {
  it("rejects empty chats and repairs bad modes", () => {
    expect(coachRequestSchema.safeParse({ messages: [] }).success).toBe(false);
    const ok = coachRequestSchema.parse({ mode: "nope", messages: [{ role: "user", content: "hi" }] });
    expect(ok.mode).toBe("chat");
  });
});
