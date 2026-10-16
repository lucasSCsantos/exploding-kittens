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

describe("applyAction — Attack (§8.1)", () => {
  it("ends the turn with no draw and gives the next alive player 2 turns", () => {
    const atk = card("ATK");
    const state = baseState({
      deck: [card("SKIP")],
      players: [player("a", [atk]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_ATTACK", cardUid: atk.uid });
    expect(afterPlay.phase).toBe("NOPE_WINDOW");
    expect(afterPlay.discard.map((c) => c.id)).toEqual(["ATK"]);

    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.players[0]!.hand).toHaveLength(0);
    expect(next.deck).toHaveLength(1);
    expect(next.currentPlayer).toBe(1);
    expect(next.turnsRemaining).toBe(2);
    expect(next.phase).toBe("ACTION");
  });

  it("skips eliminated seats when handing off the attack", () => {
    const atk = card("ATK");
    const state = baseState({
      players: [player("a", [atk]), player("b", [], false), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_ATTACK", cardUid: atk.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.currentPlayer).toBe(2);
  });

  it("stacks: transfers remaining turns + 2 when attackStacking is on (default)", () => {
    const atk = card("ATK");
    const state = baseState({
      players: [player("a", [atk]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 3,
    });

    const afterPlay = applyAction(state, { type: "PLAY_ATTACK", cardUid: atk.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    // 3 turns owed, this one is consumed by playing ATK -> 2 remainder + 2 stacked = 4
    expect(next.turnsRemaining).toBe(4);
  });

  it("does not stack when attackStacking is off: next player simply gets 2", () => {
    const atk = card("ATK");
    const state = baseState({
      config: { ...createGame(["a", "b", "c"], { seed: 1 }).config, attackStacking: false },
      players: [player("a", [atk]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 3,
    });

    const afterPlay = applyAction(state, { type: "PLAY_ATTACK", cardUid: atk.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.turnsRemaining).toBe(2);
  });

  it("rejects playing a card not in the current player's hand", () => {
    const state = baseState({
      players: [player("a", []), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    expect(() => applyAction(state, { type: "PLAY_ATTACK", cardUid: "nope" })).toThrow();
  });
});

describe("applyAction — Targeted Attack (§8.2)", () => {
  it("hands turns to the chosen opponent and play continues clockwise from them", () => {
    const tatk = card("TATK");
    const state = baseState({
      players: [player("a", [tatk]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_TARGETED_ATTACK", cardUid: tatk.uid, target: 2 });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.currentPlayer).toBe(2);
    expect(next.turnsRemaining).toBe(2);
  });

  it("stacks like Attack when already under attack", () => {
    const tatk = card("TATK");
    const state = baseState({
      players: [player("a", [tatk]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 2,
    });

    const afterPlay = applyAction(state, { type: "PLAY_TARGETED_ATTACK", cardUid: tatk.uid, target: 2 });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.turnsRemaining).toBe(3);
  });

  it("rejects targeting yourself or a dead player", () => {
    const tatk = card("TATK");
    const state = baseState({
      players: [player("a", [tatk]), player("b", [], false), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    expect(() =>
      applyAction(state, { type: "PLAY_TARGETED_ATTACK", cardUid: tatk.uid, target: 0 }),
    ).toThrow();
    expect(() =>
      applyAction(state, { type: "PLAY_TARGETED_ATTACK", cardUid: tatk.uid, target: 1 }),
    ).toThrow();
  });
});

describe("applyAction — Skip (§8.3)", () => {
  it("ends one turn without drawing", () => {
    const skip = card("SKIP");
    const state = baseState({
      deck: [card("NOPE")],
      players: [player("a", [skip]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_SKIP", cardUid: skip.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.deck).toHaveLength(1);
    expect(next.currentPlayer).toBe(1);
    expect(next.turnsRemaining).toBe(1);
  });

  it("edge case: only skips 1 of 2 owed turns, same player continues", () => {
    const skip = card("SKIP");
    const state = baseState({
      players: [player("a", [skip]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 2,
    });

    const afterPlay = applyAction(state, { type: "PLAY_SKIP", cardUid: skip.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.currentPlayer).toBe(0);
    expect(next.turnsRemaining).toBe(1);
  });
});

describe("applyAction — Favor (§8.4)", () => {
  it("lets the target choose which card to give", () => {
    const fav = card("FAV");
    const theirCard = card("SHUF");
    const state = baseState({
      players: [player("a", [fav]), player("b", [theirCard, card("STF")]), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const played = applyAction(state, { type: "PLAY_FAVOR", cardUid: fav.uid, target: 1 });
    expect(played.phase).toBe("NOPE_WINDOW");
    expect(played.discard.map((c) => c.id)).toEqual(["FAV"]);

    const afterPlay = applyAction(played, { type: "PASS_NOPE_WINDOW" });
    expect(afterPlay.phase).toBe("FAVOR_RESOLVE");

    const resolved = applyAction(afterPlay, { type: "RESOLVE_FAVOR", cardUid: theirCard.uid });

    expect(resolved.phase).toBe("ACTION");
    expect(resolved.players[0]!.hand.map((c) => c.id)).toEqual(["SHUF"]);
    expect(resolved.players[1]!.hand.map((c) => c.id)).toEqual(["STF"]);
  });

  it("is a no-op (card still consumed) when the target has no cards", () => {
    const fav = card("FAV");
    const state = baseState({
      players: [player("a", [fav]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_FAVOR", cardUid: fav.uid, target: 1 });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.phase).toBe("ACTION");
    expect(next.discard.map((c) => c.id)).toEqual(["FAV"]);
    expect(next.pendingAction).toBeNull();
  });
});

describe("applyAction — Shuffle (§8.5)", () => {
  it("changes deck order (seeded RNG) and invalidates all players' known_deck", () => {
    const shuf = card("SHUF");
    const deck = Array.from({ length: 10 }, (_, i) => card("SKIP", `skip-${i}`));
    const state = baseState({
      deck,
      players: [
        { ...player("a", [shuf]), knownDeck: [{ position: 0, card: deck[0]! }] },
        { ...player("b", []), knownDeck: [{ position: 1, card: deck[1]! }] },
        player("c", []),
      ],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_SHUFFLE", cardUid: shuf.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.deck.map((c) => c.uid)).not.toEqual(deck.map((c) => c.uid));
    expect(next.deck).toHaveLength(10);
    expect(next.players.every((p) => p.knownDeck.length === 0)).toBe(true);
    expect(next.phase).toBe("ACTION");
    expect(next.currentPlayer).toBe(0);
  });

  it("edge case: invalidates a defuser's tracked reinsertion position", () => {
    const ek = card("EK");
    const shuf = card("SHUF");
    const state = baseState({
      deck: [ek, card("SKIP"), card("NOPE")],
      players: [player("a", [card("DEF"), shuf]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 2,
    });

    const afterDraw = applyAction(state, { type: "DRAW" });
    const afterReinsert = applyAction(afterDraw, { type: "DEFUSE_REINSERT", position: 0 });
    expect(afterReinsert.currentPlayer).toBe(0);
    expect(afterReinsert.players[0]!.knownDeck).toHaveLength(1);

    const shuffPlayed = applyAction(afterReinsert, {
      type: "PLAY_SHUFFLE",
      cardUid: shuf.uid,
    });
    const afterShuffle = applyAction(shuffPlayed, { type: "PASS_NOPE_WINDOW" });

    expect(afterShuffle.players[0]!.knownDeck).toHaveLength(0);
  });
});

describe("applyAction — See the Future (§8.6)", () => {
  it("views the top 3 cards without changing order, updating only the acting player", () => {
    const stf = card("STF");
    const deck = [card("SKIP"), card("NOPE"), card("ATK"), card("FAV")];
    const state = baseState({
      deck,
      players: [player("a", [stf]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_SEE_FUTURE", cardUid: stf.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.deck.map((c) => c.id)).toEqual(["SKIP", "NOPE", "ATK", "FAV"]);
    expect(next.players[0]!.knownDeck.map((e) => e.card.id)).toEqual(["SKIP", "NOPE", "ATK"]);
    expect(next.players[1]!.knownDeck).toHaveLength(0);
    expect(next.phase).toBe("ACTION");
    expect(next.currentPlayer).toBe(0);
  });

  it("edge case: views only what remains when fewer than 3 cards are left", () => {
    const stf = card("STF");
    const deck = [card("SKIP")];
    const state = baseState({
      deck,
      players: [player("a", [stf]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_SEE_FUTURE", cardUid: stf.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.players[0]!.knownDeck.map((e) => e.card.id)).toEqual(["SKIP"]);
  });

  it("updates only the viewed positions, preserving other known_deck knowledge (§8.6)", () => {
    const stf = card("STF");
    const deck = [card("SKIP"), card("NOPE"), card("ATK"), card("FAV")];
    const trackedReinsertion = { position: 3, card: deck[3]! };
    const state = baseState({
      deck,
      players: [
        { ...player("a", [stf]), knownDeck: [trackedReinsertion] },
        player("b", []),
        player("c", []),
      ],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_SEE_FUTURE", cardUid: stf.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.players[0]!.knownDeck).toEqual([
      { position: 0, card: deck[0] },
      { position: 1, card: deck[1] },
      { position: 2, card: deck[2] },
      trackedReinsertion,
    ]);
  });
});

describe("applyAction — Alter the Future (§8.7)", () => {
  it("reorders the top 3 cards arbitrarily, deck size unchanged", () => {
    const atf = card("ATF");
    const top3 = [card("SKIP"), card("NOPE"), card("ATK")];
    const deck = [...top3, card("FAV")];
    const state = baseState({
      deck,
      players: [player("a", [atf]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const newOrder = [top3[2]!.uid, top3[0]!.uid, top3[1]!.uid];
    const afterPlay = applyAction(state, {
      type: "PLAY_ALTER_FUTURE",
      cardUid: atf.uid,
      order: newOrder,
    });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.deck.map((c) => c.id)).toEqual(["ATK", "SKIP", "NOPE", "FAV"]);
    expect(next.deck).toHaveLength(4);
    expect(next.players[0]!.knownDeck.map((e) => e.card.id)).toEqual(["ATK", "SKIP", "NOPE"]);
  });

  it("edge case: reorders only what remains when fewer than 3 cards are left", () => {
    const atf = card("ATF");
    const two = [card("SKIP"), card("NOPE")];
    const state = baseState({
      deck: two,
      players: [player("a", [atf]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, {
      type: "PLAY_ALTER_FUTURE",
      cardUid: atf.uid,
      order: [two[1]!.uid, two[0]!.uid],
    });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.deck.map((c) => c.id)).toEqual(["NOPE", "SKIP"]);
  });

  it("rejects an order that is not a permutation of the viewed cards", () => {
    const atf = card("ATF");
    const deck = [card("SKIP"), card("NOPE"), card("ATK")];
    const state = baseState({
      deck,
      players: [player("a", [atf]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    expect(() =>
      applyAction(state, { type: "PLAY_ALTER_FUTURE", cardUid: atf.uid, order: ["bogus"] }),
    ).toThrow();
  });
});

describe("applyAction — Draw from the Bottom (§8.8)", () => {
  it("draws deck[len-1] and ends the turn", () => {
    const dfb = card("DFB");
    const bottom = card("SKIP");
    const deck = [card("NOPE"), card("ATK"), bottom];
    const state = baseState({
      deck,
      players: [player("a", [dfb]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_DRAW_FROM_BOTTOM", cardUid: dfb.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.players[0]!.hand.map((c) => c.id)).toEqual(["SKIP"]);
    expect(next.deck.map((c) => c.id)).toEqual(["NOPE", "ATK"]);
    expect(next.currentPlayer).toBe(1);
  });

  it("resolves via the Exploding Kitten path when the bottom card is EK", () => {
    const dfb = card("DFB");
    const ek = card("EK");
    const deck = [card("NOPE"), ek];
    const state = baseState({
      deck,
      players: [player("a", [dfb, card("DEF")]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterPlay = applyAction(state, { type: "PLAY_DRAW_FROM_BOTTOM", cardUid: dfb.uid });
    const next = applyAction(afterPlay, { type: "PASS_NOPE_WINDOW" });

    expect(next.phase).toBe("DEFUSE_REINSERT");
    expect(next.deck.map((c) => c.id)).toEqual(["NOPE"]);
  });
});

describe("applyAction — Nope reaction stack (§7)", () => {
  it("a single Nope cancels the pending action", () => {
    const skip = card("SKIP");
    const nope = card("NOPE");
    const state = baseState({
      players: [player("a", [skip]), player("b", [nope]), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 2,
    });

    const played = applyAction(state, { type: "PLAY_SKIP", cardUid: skip.uid });
    expect(played.phase).toBe("NOPE_WINDOW");

    const noped = applyAction(played, { type: "PLAY_NOPE", player: 1, cardUid: nope.uid });
    const next = applyAction(noped, { type: "PASS_NOPE_WINDOW" });

    // SKIP never took effect: still player 0's turn, still owing the same 2 turns.
    expect(next.currentPlayer).toBe(0);
    expect(next.turnsRemaining).toBe(2);
    expect(next.phase).toBe("ACTION");
    expect(next.pendingAction).toBeNull();
  });

  it("Nope-on-Nope (2 total, even) lets the original action resolve", () => {
    const atk = card("ATK");
    const nope1 = card("NOPE", "nope1");
    const nope2 = card("NOPE", "nope2");
    const state = baseState({
      players: [player("a", [atk]), player("b", [nope1]), player("c", [nope2])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    let next = applyAction(state, { type: "PLAY_ATTACK", cardUid: atk.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 1, cardUid: nope1.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 2, cardUid: nope2.uid });
    next = applyAction(next, { type: "PASS_NOPE_WINDOW" });

    expect(next.currentPlayer).toBe(1);
    expect(next.turnsRemaining).toBe(2);
    expect(next.phase).toBe("ACTION");
  });

  it("three Nopes (odd) cancels the action", () => {
    const atk = card("ATK");
    const nope1 = card("NOPE", "nope1");
    const nope2 = card("NOPE", "nope2");
    const nope3 = card("NOPE", "nope3");
    const state = baseState({
      players: [
        player("a", [atk, nope3]),
        player("b", [nope1]),
        player("c", [nope2]),
      ],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    let next = applyAction(state, { type: "PLAY_ATTACK", cardUid: atk.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 1, cardUid: nope1.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 2, cardUid: nope2.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 0, cardUid: nope3.uid });
    next = applyAction(next, { type: "PASS_NOPE_WINDOW" });

    expect(next.currentPlayer).toBe(0);
    expect(next.turnsRemaining).toBe(1);
    expect(next.phase).toBe("ACTION");
  });

  it("sends the cancelled card and all Nopes to discard, never back to a hand", () => {
    const atk = card("ATK");
    const nope1 = card("NOPE", "nope1");
    const nope2 = card("NOPE", "nope2");
    const nope3 = card("NOPE", "nope3");
    const state = baseState({
      players: [
        player("a", [atk, nope3]),
        player("b", [nope1]),
        player("c", [nope2]),
      ],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    let next = applyAction(state, { type: "PLAY_ATTACK", cardUid: atk.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 1, cardUid: nope1.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 2, cardUid: nope2.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 0, cardUid: nope3.uid });
    next = applyAction(next, { type: "PASS_NOPE_WINDOW" });

    expect(next.discard.map((c) => c.uid).sort()).toEqual(
      ["ATK", "nope1", "nope2", "nope3"].sort(),
    );
    expect(next.players.every((p) => p.hand.length === 0)).toBe(true);
  });

  it("a Noped ATK/TATK/SKIP/DFB does not end the turn — the player continues their action phase", () => {
    const skip = card("SKIP");
    const nope = card("NOPE");
    const state = baseState({
      players: [player("a", [skip]), player("b", [nope]), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    let next = applyAction(state, { type: "PLAY_SKIP", cardUid: skip.uid });
    next = applyAction(next, { type: "PLAY_NOPE", player: 1, cardUid: nope.uid });
    next = applyAction(next, { type: "PASS_NOPE_WINDOW" });

    expect(next.currentPlayer).toBe(0);
    expect(next.turnsRemaining).toBe(1);
    expect(next.phase).toBe("ACTION");
  });

  it("lets any alive player, including the one who played the card, play Nope", () => {
    const skip = card("SKIP");
    const nope = card("NOPE");
    const state = baseState({
      players: [player("a", [skip, nope]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const played = applyAction(state, { type: "PLAY_SKIP", cardUid: skip.uid });
    const noped = applyAction(played, { type: "PLAY_NOPE", player: 0, cardUid: nope.uid });

    expect(noped.nopeStack).toEqual([{ player: 0 }]);
  });

  it("rejects an eliminated player playing Nope", () => {
    const skip = card("SKIP");
    const nope = card("NOPE");
    const state = baseState({
      players: [player("a", [skip]), player("b", [nope], false), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const played = applyAction(state, { type: "PLAY_SKIP", cardUid: skip.uid });

    expect(() =>
      applyAction(played, { type: "PLAY_NOPE", player: 1, cardUid: nope.uid }),
    ).toThrow();
  });

  it("still eliminates a player holding Nope but no Defuse who draws an EK", () => {
    const state = baseState({
      deck: [card("EK")],
      players: [player("a", [card("NOPE")]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const next = applyAction(state, { type: "DRAW" });

    expect(next.players[0]!.alive).toBe(false);
    expect(next.players[0]!.hand).toHaveLength(0);
  });

  it("never opens a Nope window for EK or DEF plays", () => {
    const state = baseState({
      deck: [card("EK"), card("SKIP"), card("NOPE", "bystander-nope")],
      players: [
        player("a", [card("DEF"), card("NOPE", "actor-nope")]),
        player("b", [card("NOPE", "bystander-nope2")]),
        player("c", []),
      ],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    const afterDraw = applyAction(state, { type: "DRAW" });
    expect(afterDraw.phase).toBe("DEFUSE_REINSERT");

    expect(() =>
      applyAction(afterDraw, { type: "PLAY_NOPE", player: 1, cardUid: "bystander-nope2" }),
    ).toThrow();
  });

  it("rejects playing Nope outside a Nope window", () => {
    const nope = card("NOPE");
    const state = baseState({
      players: [player("a", []), player("b", [nope]), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    expect(() =>
      applyAction(state, { type: "PLAY_NOPE", player: 1, cardUid: nope.uid }),
    ).toThrow();
  });
});

describe("applyAction — Cat cards / Feral Cat (§8.9)", () => {
  it("rejects playing a cat card standalone", () => {
    const cat = card("CAT_TACOCAT");
    const state = baseState({
      players: [player("a", [cat]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    expect(() => applyAction(state, { type: "PLAY_CAT", cardUid: cat.uid })).toThrow();
  });

  it("rejects playing Feral Cat standalone", () => {
    const feral = card("FERAL");
    const state = baseState({
      players: [player("a", [feral]), player("b", []), player("c", [])],
      currentPlayer: 0,
      turnsRemaining: 1,
    });

    expect(() => applyAction(state, { type: "PLAY_CAT", cardUid: feral.uid })).toThrow();
  });
});
