import { describe, expect, it } from "vitest";
import {
  addCustomInterest,
  ageFrom,
  ageGroupFor,
  interestsFromQuiz,
  isUnder13,
  parseProfile,
  suggestGrade,
  toggleInterest,
  validBirth,
} from "./profile";

const oct2026 = new Date(2026, 9, 9);

describe("age", () => {
  it("never over-counts a birthday in the current month", () => {
    expect(ageFrom(10, 2013, oct2026)).toBe(12); // turns 13 sometime in October
    expect(ageFrom(9, 2013, oct2026)).toBe(13);
    expect(ageFrom(12, 2010, oct2026)).toBe(15);
  });
  it("groups by age", () => {
    expect(ageGroupFor(10, 2013, oct2026)).toBe("under13");
    expect(ageGroupFor(3, 2010, oct2026)).toBe("teen");
    expect(ageGroupFor(1, 2007, oct2026)).toBe("adult");
    expect(ageGroupFor(null, null)).toBe("teen");
    expect(isUnder13(10, 2013, oct2026)).toBe(true);
    expect(isUnder13(3, 2010, oct2026)).toBe(false);
  });
  it("rejects impossible birth dates", () => {
    expect(validBirth(13, 2010, oct2026)).toBe(false);
    expect(validBirth(5, 2026, oct2026)).toBe(false);
    expect(validBirth(5, 1950, oct2026)).toBe(false);
    expect(validBirth(5, 2010, oct2026)).toBe(true);
  });
});

describe("suggestGrade", () => {
  it("matches the Texas school year", () => {
    expect(suggestGrade(3, 2010, oct2026)).toBe(11);
    expect(suggestGrade(10, 2010, oct2026)).toBe(10);
    expect(suggestGrade(3, 2010, new Date(2026, 5, 1))).toBe(10); // before August
  });
});

describe("interests", () => {
  it("caps at 10 and ignores duplicates", () => {
    let list: string[] = [];
    for (const id of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"]) list = toggleInterest(list, id);
    expect(list).toHaveLength(10);
    expect(toggleInterest(list, "a")).toHaveLength(9);
    expect(addCustomInterest(["Chess"], " chess ")).toEqual(["Chess"]);
    expect(addCustomInterest([], "  robotics   club ")).toEqual(["robotics club"]);
  });
  it("turns quiz answers into interests", () => {
    expect(interestsFromQuiz(["build", "figure"])).toEqual(["engineering", "coding", "science", "math"]);
  });
});

describe("parseProfile", () => {
  it("repairs bad data", () => {
    const p = parseProfile({ nickname: 5, birthMonth: 99, grade: 9, interests: ["art", "art", 3, ""] });
    expect(p.nickname).toBe("");
    expect(p.birthMonth).toBeNull();
    expect(p.grade).toBe(9);
    expect(p.interests).toEqual(["art"]);
    expect(parseProfile(null).onboarded).toBe(false);
  });
});
