import { describe, expect, it } from "vitest";
import { remoteWins } from "./sync-merge";

describe("remoteWins", () => {
  it("takes the newest change", () => {
    expect(remoteWins(undefined, { updatedAt: 1 })).toBe(true);
    expect(remoteWins({ updatedAt: 5 }, { updatedAt: 9 })).toBe(true);
    expect(remoteWins({ updatedAt: 9 }, { updatedAt: 5 })).toBe(false);
    expect(remoteWins({ updatedAt: 5 }, { updatedAt: 5 })).toBe(false);
  });
});
