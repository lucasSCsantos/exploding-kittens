import { describe, expect, it } from "vitest";
import { CAT_BREAKDOWN, DECK_COMPOSITION, buildBaseDeck, deckTierForPlayerCount } from "./decks";
import type { CatCardId, DeckTier } from "./types";

describe("deckTierForPlayerCount", () => {
  it.each([
    [2, "paw-print"],
    [3, "paw-print"],
    [4, "standard"],
    [7, "standard"],
    [8, "combined"],
    [10, "combined"],
  ] satisfies [number, DeckTier][])("N=%i -> %s", (n, expected) => {
    expect(deckTierForPlayerCount(n)).toBe(expected);
  });
});

describe("DECK_COMPOSITION", () => {
  it("totals 44/71/115 cards per tier before kittens are added", () => {
    expect(buildBaseDeck("paw-print")).toHaveLength(44);
    expect(buildBaseDeck("standard")).toHaveLength(71);
    expect(buildBaseDeck("combined")).toHaveLength(115);
  });

  it("matches the §2.1 per-card-type counts for each tier", () => {
    expect(DECK_COMPOSITION["paw-print"]).toEqual({
      DEF: 3,
      NOPE: 5,
      ATK: 4,
      TATK: 0,
      SKIP: 4,
      FAV: 2,
      SHUF: 2,
      STF: 4,
      ATF: 0,
      DFB: 4,
      FERAL: 2,
    });
    expect(DECK_COMPOSITION.standard).toEqual({
      DEF: 7,
      NOPE: 5,
      ATK: 4,
      TATK: 3,
      SKIP: 6,
      FAV: 4,
      SHUF: 4,
      STF: 4,
      ATF: 6,
      DFB: 4,
      FERAL: 4,
    });
    expect(DECK_COMPOSITION.combined).toEqual({
      DEF: 10,
      NOPE: 10,
      ATK: 8,
      TATK: 3,
      SKIP: 10,
      FAV: 6,
      SHUF: 6,
      STF: 8,
      ATF: 6,
      DFB: 8,
      FERAL: 6,
    });
  });

  it("paw-print tier has zero TATK and zero ATF", () => {
    expect(DECK_COMPOSITION["paw-print"].TATK).toBe(0);
    expect(DECK_COMPOSITION["paw-print"].ATF).toBe(0);
  });

  it("CAT_BREAKDOWN sums to 14/20/34 per tier", () => {
    const sum = (tier: DeckTier) =>
      Object.values(CAT_BREAKDOWN[tier]).reduce((a, b) => a + b, 0);
    expect(sum("paw-print")).toBe(14);
    expect(sum("standard")).toBe(20);
    expect(sum("combined")).toBe(34);
  });

  it("combined-tier cat counts are the sum of paw-print and standard", () => {
    const catIds = Object.keys(CAT_BREAKDOWN.combined) as CatCardId[];
    for (const catId of catIds) {
      expect(CAT_BREAKDOWN.combined[catId]).toBe(
        CAT_BREAKDOWN["paw-print"][catId] + CAT_BREAKDOWN.standard[catId],
      );
    }
  });
});
