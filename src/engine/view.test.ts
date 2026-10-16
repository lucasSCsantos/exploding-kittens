import { describe, expect, it } from "vitest";
import { applyAction } from "./actions.js";
import { createGame } from "./setup.js";
import { getPlayerView } from "./view.js";
import type { Card, GameState, KnownDeckEntry, Player } from "./types.js";

function card(id: Card["id"], uid: string = id): Card {
  return { id, uid };
}

function player(
  id: string,
  hand: Card[],
  alive = true,
  knownDeck: KnownDeckEntry[] = [],
): Player {
  return { id, hand, alive, knownDeck };
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  const state = createGame(["a", "b", "c"], { seed: 1 });
  return { ...state, phase: "ACTION", ...overrides };
}

describe("getPlayerView (§3 hidden information)", () => {
  it("never includes another player's hand contents, only sizes", () => {
    const state = baseState({
      players: [
        player("a", [card("SKIP"), card("NOPE")]),
        player("b", [card("FAV", "fav-1"), card("FAV", "fav-2"), card("SHUF")]),
        player("c", []),
      ],
    });

    const view = getPlayerView(state, "a");

    expect(view.hand).toEqual([card("SKIP"), card("NOPE")]);
    expect(view.players).toEqual([
      { id: "a", alive: true, handSize: 2 },
      { id: "b", alive: true, handSize: 3 },
      { id: "c", alive: true, handSize: 0 },
    ]);
    expect(view.players.map((p) => "hand" in p)).toEqual([false, false, false]);
  });

  it("never includes deck order or contents beyond a player's own known_deck", () => {
    const deck = [card("SKIP", "d0"), card("NOPE", "d1"), card("FAV", "d2"), card("SHUF", "d3")];
    const state = baseState({
      deck,
      players: [
        player("a", [], true, [{ position: 0, card: deck[0]! }, { position: 1, card: deck[1]! }]),
        player("b", []),
        player("c", []),
      ],
    });

    const viewA = getPlayerView(state, "a");
    const viewB = getPlayerView(state, "b");

    expect(viewA.deckSize).toBe(4);
    expect(viewA.knownDeck).toEqual([{ position: 0, card: deck[0] }, { position: 1, card: deck[1] }]);
    expect(viewB.deckSize).toBe(4);
    expect(viewB.knownDeck).toEqual([]);
    expect(viewA).not.toHaveProperty("deck");
  });

  it("drops known_deck entries that fall outside the current deck bounds", () => {
    const deck = [card("SKIP", "d0")];
    const state = baseState({
      deck,
      players: [
        player("a", [], true, [
          { position: 0, card: deck[0]! },
          { position: 2, card: card("EK", "stale") },
        ]),
        player("b", []),
        player("c", []),
      ],
    });

    const view = getPlayerView(state, "a");

    expect(view.knownDeck).toEqual([{ position: 0, card: deck[0] }]);
  });

  it("never reveals where any player reinserted a kitten, except to that player", () => {
    const deck = [card("SKIP"), card("EK", "the-kitten"), card("NOPE")];
    const state = baseState({
      deck,
      players: [
        player("a", [], true, [{ position: 1, card: card("EK", "the-kitten") }]),
        player("b", []),
        player("c", []),
      ],
    });

    const viewA = getPlayerView(state, "a");
    const viewB = getPlayerView(state, "b");
    const viewC = getPlayerView(state, "c");

    expect(viewA.knownDeck).toEqual([{ position: 1, card: card("EK", "the-kitten") }]);
    expect(viewB.knownDeck).toEqual([]);
    expect(viewC.knownDeck).toEqual([]);
  });

  it("exposes public fields accurately for every viewer", () => {
    const state = baseState({
      players: [player("a", []), player("b", [], false), player("c", [])],
      currentPlayer: 2,
      turnsRemaining: 2,
      discard: [card("SKIP"), card("NOPE")],
      phase: "DRAW",
    });

    for (const id of ["a", "b", "c"]) {
      const view = getPlayerView(state, id);
      expect(view.currentPlayer).toBe(2);
      expect(view.turnsRemaining).toBe(2);
      expect(view.discard).toEqual([card("SKIP"), card("NOPE")]);
      expect(view.deckSize).toBe(state.deck.length);
      expect(view.phase).toBe("DRAW");
      expect(view.players.map((p) => p.alive)).toEqual([true, false, true]);
    }
  });

  it("invalidates every player's known_deck after a shuffle, including a tracked reinsertion", () => {
    const ek = card("EK");
    const shuf = card("SHUF");
    const state = baseState({
      deck: [ek, card("SKIP"), card("NOPE")],
      players: [
        player("a", [card("DEF"), shuf]),
        player("b", [], true, [{ position: 1, card: card("SKIP") }]),
        player("c", []),
      ],
      currentPlayer: 0,
      turnsRemaining: 2,
    });

    const afterDraw = applyAction(state, { type: "DRAW" });
    const afterReinsert = applyAction(afterDraw, { type: "DEFUSE_REINSERT", position: 0 });
    expect(getPlayerView(afterReinsert, "a").knownDeck).toHaveLength(1);
    expect(getPlayerView(afterReinsert, "b").knownDeck).toHaveLength(1);

    const shuffPlayed = applyAction(afterReinsert, { type: "PLAY_SHUFFLE", cardUid: shuf.uid });
    const afterShuffle = applyAction(shuffPlayed, { type: "PASS_NOPE_WINDOW" });

    expect(getPlayerView(afterShuffle, "a").knownDeck).toEqual([]);
    expect(getPlayerView(afterShuffle, "b").knownDeck).toEqual([]);
    expect(getPlayerView(afterShuffle, "c").knownDeck).toEqual([]);
  });

  it("exposes play history (card played and its target) identically for every viewer", () => {
    const skip = card("SKIP");
    const state = baseState({
      deck: [card("NOPE")],
      players: [player("a", [skip]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const played = applyAction(state, { type: "PLAY_SKIP", cardUid: skip.uid });
    const afterSkip = applyAction(played, { type: "PASS_NOPE_WINDOW" });

    const expectedHistory = [{ player: 0, effect: { kind: "SKIP" }, noped: false }];
    expect(getPlayerView(afterSkip, "a").playHistory).toEqual(expectedHistory);
    expect(getPlayerView(afterSkip, "b").playHistory).toEqual(expectedHistory);
    expect(getPlayerView(afterSkip, "c").playHistory).toEqual(expectedHistory);
  });

  it("throws for an unknown player id", () => {
    const state = baseState();
    expect(() => getPlayerView(state, "nobody")).toThrow(/no player with id/);
  });
});
