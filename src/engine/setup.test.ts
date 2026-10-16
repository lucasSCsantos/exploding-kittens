import { describe, expect, it } from "vitest";
import { totalDefuseCount } from "./decks";
import { createGame } from "./setup";
import type { DeckTier } from "./types";

describe("createGame", () => {
  it("rejects N<2 or N>10", () => {
    expect(() => createGame([], { seed: 1 })).toThrow();
    expect(() => createGame(["solo"], { seed: 1 })).toThrow();
    expect(() =>
      createGame(
        Array.from({ length: 11 }, (_, i) => `p${i}`),
        { seed: 1 },
      ),
    ).toThrow();
  });

  it("deals every player 7 cards + 1 DEF (8-card starting hand)", () => {
    const state = createGame(["a", "b", "c", "d"], { seed: 42 });
    for (const player of state.players) {
      expect(player.hand).toHaveLength(8);
      expect(player.hand.filter((c) => c.id === "DEF")).toHaveLength(1);
    }
  });

  it.each([
    [2, "paw-print"],
    [3, "paw-print"],
    [5, "standard"],
    [7, "standard"],
    [8, "combined"],
    [10, "combined"],
  ] satisfies [number, DeckTier][])(
    "inserts exactly N-1 Exploding Kittens for N=%i (%s tier)",
    (n, tier) => {
      const names = Array.from({ length: n }, (_, i) => `p${i}`);
      const state = createGame(names, { seed: 7 });
      expect(state.config.deckTier).toBe(tier);
      const kittensInDeck = state.deck.filter((c) => c.id === "EK");
      expect(kittensInDeck).toHaveLength(n - 1);
    },
  );

  it.each([
    [2, "paw-print"],
    [5, "standard"],
    [9, "combined"],
  ] satisfies [number, DeckTier][])(
    "inserts total_DEF_in_tier - N extra DEF into the deck for N=%i (%s)",
    (n, tier) => {
      const names = Array.from({ length: n }, (_, i) => `p${i}`);
      const state = createGame(names, { seed: 13 });
      const deckDefuseCount = state.deck.filter((c) => c.id === "DEF").length;
      expect(deckDefuseCount).toBe(totalDefuseCount(tier) - n);
    },
  );

  it("shuffles the deck (seeded RNG, order differs between seeds)", () => {
    const stateA = createGame(["a", "b", "c", "d"], { seed: 1 });
    const stateB = createGame(["a", "b", "c", "d"], { seed: 2 });
    const idsA = stateA.deck.map((c) => c.id).join(",");
    const idsB = stateB.deck.map((c) => c.id).join(",");
    expect(idsA).not.toBe(idsB);
  });

  it("chooses a valid starting player and starts in SETUP phase", () => {
    const state = createGame(["a", "b", "c", "d"], { seed: 5 });
    expect(state.currentPlayer).toBeGreaterThanOrEqual(0);
    expect(state.currentPlayer).toBeLessThan(state.players.length);
    expect(state.phase).toBe("SETUP");
  });

  it("is deterministic for a given seed", () => {
    const stateA = createGame(["a", "b", "c", "d"], { seed: 99 });
    const stateB = createGame(["a", "b", "c", "d"], { seed: 99 });
    expect(stateA.deck.map((c) => c.id)).toEqual(stateB.deck.map((c) => c.id));
  });
});
