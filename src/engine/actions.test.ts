import { describe, expect, it } from "vitest";
import { applyAction, canBeNoped } from "./actions.js";
import { createGame } from "./setup.js";
import type { Card, GameState, Player } from "./types.js";

function card(id: Card["id"], uid: string = id): Card {
  return { id, uid };
}

function player(id: string, hand: Card[], alive = true): Player {
  return { id, hand, alive, knownDeck: [] };
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  const state = createGame(["a", "b", "c"], { seed: 1 });
  return { ...state, phase: "ACTION", ...overrides };
}

describe("applyAction — turn loop (§5)", () => {
  it("lets a player play zero cards and end their turn by drawing", () => {
    const state = baseState({
      deck: [card("SHUF")],
      players: [player("a", []), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.players[0]!.hand).toEqual([card("SHUF")]);
    expect(next.deck).toHaveLength(0);
  });

  it("adds a drawn non-EK card to the hand and ends the turn", () => {
    const state = baseState({
      deck: [card("SKIP"), card("NOPE")],
      players: [player("a", []), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.players[0]!.hand.map((c) => c.id)).toEqual(["SKIP"]);
    expect(next.deck.map((c) => c.id)).toEqual(["NOPE"]);
    expect(next.currentPlayer).toBe(1);
  });

  it("decrements turns_remaining and re-grants the same player another turn when still >0", () => {
    const state = baseState({
      deck: [card("SKIP")],
      players: [player("a", []), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 2,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.currentPlayer).toBe(0);
    expect(next.turnsRemaining).toBe(1);
    expect(next.phase).toBe("ACTION");
  });

  it("advances to the next alive player, skipping eliminated seats, once turns_remaining hits 0", () => {
    const state = baseState({
      deck: [card("SKIP")],
      players: [player("a", []), player("b", [], false), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.currentPlayer).toBe(2);
    expect(next.turnsRemaining).toBe(1);
  });

  it("enforces no hand-size cap", () => {
    const bigHand = Array.from({ length: 50 }, (_, i) => card("SKIP", `skip-${i}`));
    const state = baseState({
      deck: [card("SKIP", "drawn")],
      players: [player("a", bigHand), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.players[0]!.hand).toHaveLength(51);
  });
});

describe("applyAction — Exploding Kitten resolution (§6)", () => {
  it("discards DEF and lets the player choose a reinsertion position at k=0", () => {
    const state = baseState({
      deck: [card("EK"), card("SKIP"), card("NOPE")],
      players: [player("a", [card("DEF")]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterDraw = applyAction(state, { type: "DRAW" });
    expect(afterDraw.phase).toBe("DEFUSE_REINSERT");
    expect(afterDraw.players[0]!.hand).toHaveLength(0);
    expect(afterDraw.discard.map((c) => c.id)).toEqual(["DEF"]);
    expect(afterDraw.deck.map((c) => c.id)).toEqual(["SKIP", "NOPE"]);

    const afterReinsert = applyAction(afterDraw, { type: "DEFUSE_REINSERT", position: 0 });
    expect(afterReinsert.deck.map((c) => c.id)).toEqual(["EK", "SKIP", "NOPE"]);
    expect(afterReinsert.phase).toBe("ACTION");
    expect(afterReinsert.currentPlayer).toBe(1);
  });

  it("covers reinsertion at a mid position", () => {
    const state = baseState({
      deck: [card("EK"), card("SKIP"), card("NOPE")],
      players: [player("a", [card("DEF")]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterDraw = applyAction(state, { type: "DRAW" });
    const afterReinsert = applyAction(afterDraw, { type: "DEFUSE_REINSERT", position: 1 });

    expect(afterReinsert.deck.map((c) => c.id)).toEqual(["SKIP", "EK", "NOPE"]);
  });

  it("covers reinsertion at the bottom of the deck", () => {
    const state = baseState({
      deck: [card("EK"), card("SKIP"), card("NOPE")],
      players: [player("a", [card("DEF")]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterDraw = applyAction(state, { type: "DRAW" });
    const afterReinsert = applyAction(afterDraw, { type: "DEFUSE_REINSERT", position: 2 });

    expect(afterReinsert.deck.map((c) => c.id)).toEqual(["SKIP", "NOPE", "EK"]);
  });

  it("eliminates a player who draws EK without DEF, discards their hand, and advances the turn", () => {
    const state = baseState({
      deck: [card("EK"), card("SKIP")],
      players: [
        player("a", [card("SHUF"), card("STF")]),
        player("b", []),
        player("c", []),
      ],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.players[0]!.alive).toBe(false);
    expect(next.players[0]!.hand).toHaveLength(0);
    expect(next.discard.map((c) => c.id).sort()).toEqual(["SHUF", "STF"]);
    expect(next.explodedKittens.map((c) => c.id)).toEqual(["EK"]);
    expect(next.deck.some((c) => c.id === "EK")).toBe(false);
    expect(next.currentPlayer).toBe(1);
    expect(next.turnsRemaining).toBe(1);
    expect(next.phase).toBe("ACTION");
  });

  it("vanishes a player's owed turns from an attack when they are eliminated", () => {
    const state = baseState({
      deck: [card("EK")],
      players: [player("a", []), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 3,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.players[0]!.alive).toBe(false);
    expect(next.currentPlayer).toBe(1);
    expect(next.turnsRemaining).toBe(1);
  });

  it("sets GAME_OVER exactly when one player remains and reports the winner", () => {
    const state = baseState({
      deck: [card("EK")],
      players: [player("a", []), player("b", [], false), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.phase).toBe("GAME_OVER");
    expect(next.winner).toBe(2);
  });

  it("continues correctly through multiple sequential eliminations", () => {
    let state = baseState({
      deck: [card("EK"), card("EK", "ek2")],
      players: [player("a", []), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    state = applyAction(state, { type: "DRAW" });
    expect(state.players[0]!.alive).toBe(false);
    expect(state.currentPlayer).toBe(1);
    expect(state.phase).toBe("ACTION");

    state = applyAction(state, { type: "DRAW" });
    expect(state.players[1]!.alive).toBe(false);
    expect(state.phase).toBe("GAME_OVER");
    expect(state.winner).toBe(2);
  });

  it("flags an error instead of drawing from an empty deck", () => {
    const state = baseState({
      deck: [],
      players: [player("a", []), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    expect(() => applyAction(state, { type: "DRAW" })).toThrow();
  });
});

describe("canBeNoped (§6)", () => {
  it("rejects EK and DEF as Noppable", () => {
    expect(canBeNoped("EK")).toBe(false);
    expect(canBeNoped("DEF")).toBe(false);
  });

  it("allows other action cards to be Noped", () => {
    expect(canBeNoped("SKIP")).toBe(true);
    expect(canBeNoped("ATK")).toBe(true);
    expect(canBeNoped("NOPE")).toBe(true);
  });
});
