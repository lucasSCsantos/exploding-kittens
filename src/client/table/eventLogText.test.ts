import { describe, expect, it } from "vitest";
import { describeHistoryEntry } from "./eventLogText.js";
import type { PlayHistoryEntry } from "../../engine/types.js";

const players = [{ id: "Ana" }, { id: "Bob" }];

function entry(overrides: Partial<PlayHistoryEntry>): PlayHistoryEntry {
  return { player: 0, effect: { kind: "SKIP" }, noped: false, ...overrides };
}

describe("describeHistoryEntry", () => {
  it("describes a simple play", () => {
    expect(describeHistoryEntry(entry({ effect: { kind: "SKIP" } }), players)).toBe(
      "Ana played Skip",
    );
  });

  it("names the target of a targeted effect", () => {
    expect(
      describeHistoryEntry(
        entry({ player: 1, effect: { kind: "TARGETED_ATTACK", target: 0 } }),
        players,
      ),
    ).toBe("Bob played Targeted Attack on Ana");
  });

  it("names the card asked for in a triple", () => {
    expect(
      describeHistoryEntry(
        entry({ effect: { kind: "TRIPLE", target: 1, namedCard: "SKIP" } }),
        players,
      ),
    ).toBe("Ana played a triple, asking Bob for Skip");
  });

  it("appends a noped marker when the play was cancelled", () => {
    expect(describeHistoryEntry(entry({ effect: { kind: "SHUFFLE" }, noped: true }), players)).toBe(
      "Ana played Shuffle — Noped!",
    );
  });

  it("falls back to a generic label for an unknown player index", () => {
    expect(describeHistoryEntry(entry({ player: 5 }), players)).toBe("Player 5 played Skip");
  });
});
