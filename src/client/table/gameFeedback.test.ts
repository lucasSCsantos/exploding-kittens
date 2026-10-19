import { describe, expect, it, vi } from "vitest";
import type { ServerView } from "./gameStore.js";
import type { SoundName } from "../sound.js";

type Handler = (...args: unknown[]) => void;

vi.mock("../socket.js", () => ({
  socket: { on: () => {}, emit: () => {} },
}));
vi.mock("../session.js", () => ({
  loadSession: () => null,
  saveSession: () => {},
  clearSession: () => {},
}));

const playedSounds: SoundName[] = [];
vi.mock("../sound.js", () => ({
  playSound: (name: SoundName) => playedSounds.push(name),
}));

const vibrations: (number | number[])[] = [];
vi.mock("../haptics.js", () => ({
  vibrate: (pattern: number | number[]) => vibrations.push(pattern),
}));

const { diffViewForFeedback, detectKittenEvent, detectCardTransfer } = await import("./gameFeedback.js");

function baseView(overrides: Partial<ServerView> = {}): ServerView {
  return {
    you: 0,
    players: [
      { id: "Alice", alive: true, handSize: 7 },
      { id: "Bob", alive: true, handSize: 7 },
    ],
    currentPlayer: 0,
    turnsRemaining: 1,
    deckSize: 20,
    discard: [],
    hand: [],
    knownDeck: [],
    pendingAction: null,
    nopeStack: [],
    playHistory: [],
    phase: "ACTION",
    winner: null,
    nopeDeadline: null,
    explodedKittens: [],
    ...overrides,
  };
}

describe("diffViewForFeedback", () => {
  it("does nothing on the very first view (no previous to diff against)", () => {
    playedSounds.length = 0;
    diffViewForFeedback(null, baseView());
    expect(playedSounds).toEqual([]);
  });

  it("plays win and nothing else once a winner is set", () => {
    playedSounds.length = 0;
    diffViewForFeedback(baseView(), baseView({ winner: 0, phase: "GAME_OVER" }));
    expect(playedSounds).toEqual(["win"]);
  });

  it("plays swish when a card enters the Nope window", () => {
    playedSounds.length = 0;
    diffViewForFeedback(baseView({ phase: "ACTION" }), baseView({ phase: "NOPE_WINDOW" }));
    expect(playedSounds).toContain("swish");
  });

  it("plays the Nope stamp when the Nope stack grows", () => {
    playedSounds.length = 0;
    diffViewForFeedback(
      baseView({ phase: "NOPE_WINDOW", nopeStack: [] }),
      baseView({ phase: "NOPE_WINDOW", nopeStack: [{ player: 1 }] }),
    );
    expect(playedSounds).toContain("nopeStamp");
  });

  it("plays draw when the deck shrinks", () => {
    playedSounds.length = 0;
    diffViewForFeedback(baseView({ deckSize: 20 }), baseView({ deckSize: 19 }));
    expect(playedSounds).toContain("draw");
  });

  it("plays explosion and vibrates when you survive a kitten via defuse", () => {
    playedSounds.length = 0;
    vibrations.length = 0;
    diffViewForFeedback(
      baseView({ phase: "ACTION", currentPlayer: 0, you: 0 }),
      baseView({ phase: "DEFUSE_REINSERT", currentPlayer: 0, you: 0 }),
    );
    expect(playedSounds).toContain("explosion");
    expect(vibrations).toHaveLength(1);
  });

  it("plays explosion but does not vibrate for another player's kitten", () => {
    playedSounds.length = 0;
    vibrations.length = 0;
    diffViewForFeedback(
      baseView({ phase: "ACTION", currentPlayer: 1, you: 0 }),
      baseView({ phase: "DEFUSE_REINSERT", currentPlayer: 1, you: 0 }),
    );
    expect(playedSounds).toContain("explosion");
    expect(vibrations).toHaveLength(0);
  });

  it("plays explosion and vibrates when you are eliminated outright (no defuse)", () => {
    playedSounds.length = 0;
    vibrations.length = 0;
    diffViewForFeedback(
      baseView({ you: 0 }),
      baseView({
        you: 0,
        players: [
          { id: "Alice", alive: false, handSize: 0 },
          { id: "Bob", alive: true, handSize: 7 },
        ],
      }),
    );
    expect(playedSounds).toContain("explosion");
    expect(vibrations).toHaveLength(1);
  });

  it("vibrates the target of a resolved targeted attack", () => {
    vibrations.length = 0;
    diffViewForFeedback(
      baseView({ you: 1, playHistory: [] }),
      baseView({
        you: 1,
        playHistory: [{ player: 0, effect: { kind: "TARGETED_ATTACK", target: 1 }, noped: false }],
      }),
    );
    expect(vibrations).toHaveLength(1);
  });

  it("does not vibrate a bystander to a targeted attack aimed elsewhere", () => {
    vibrations.length = 0;
    diffViewForFeedback(
      baseView({ you: 2, playHistory: [] }),
      baseView({
        you: 2,
        playHistory: [{ player: 0, effect: { kind: "TARGETED_ATTACK", target: 1 }, noped: false }],
      }),
    );
    expect(vibrations).toHaveLength(0);
  });

  it("vibrates the next player hit by a plain attack once it resolves", () => {
    vibrations.length = 0;
    diffViewForFeedback(
      baseView({ you: 1, currentPlayer: 0, playHistory: [] }),
      baseView({
        you: 1,
        currentPlayer: 1,
        playHistory: [{ player: 0, effect: { kind: "ATTACK" }, noped: false }],
      }),
    );
    expect(vibrations).toHaveLength(1);
  });

  it("does not double-vibrate when a batch contains more than one resolved attack", () => {
    vibrations.length = 0;
    diffViewForFeedback(
      baseView({ you: 1, currentPlayer: 0, playHistory: [] }),
      baseView({
        you: 1,
        currentPlayer: 1,
        playHistory: [
          { player: 1, effect: { kind: "ATTACK" }, noped: false },
          { player: 0, effect: { kind: "ATTACK" }, noped: false },
        ],
      }),
    );
    expect(vibrations).toHaveLength(1);
  });

  it("ignores a noped attack", () => {
    vibrations.length = 0;
    diffViewForFeedback(
      baseView({ you: 1, currentPlayer: 1, playHistory: [] }),
      baseView({
        you: 1,
        currentPlayer: 1,
        playHistory: [{ player: 0, effect: { kind: "ATTACK" }, noped: true }],
      }),
    );
    expect(vibrations).toHaveLength(0);
  });
});

describe("detectKittenEvent", () => {
  it("returns null when nothing kitten-related changed", () => {
    expect(detectKittenEvent(baseView(), baseView({ deckSize: 19 }))).toBeNull();
  });

  it("reports a defuse-in-progress event for the defusing seat, with the kitten card", () => {
    const kitten = { id: "EK" as const, uid: "the-kitten" };
    const event = detectKittenEvent(
      baseView({ phase: "ACTION", currentPlayer: 0 }),
      baseView({
        phase: "DEFUSE_REINSERT",
        currentPlayer: 0,
        pendingAction: { type: "DEFUSE_REINSERT", kitten },
      }),
    );
    expect(event).toEqual({ kind: "defused", seat: 0, card: kitten });
  });

  it("still reports a defuse event without a card when pendingAction is unavailable", () => {
    const event = detectKittenEvent(
      baseView({ phase: "ACTION", currentPlayer: 1 }),
      baseView({ phase: "DEFUSE_REINSERT", currentPlayer: 1 }),
    );
    expect(event).toEqual({ kind: "defused", seat: 1, card: null });
  });

  it("reports an elimination for the newly-dead seat, with the exploded kitten card", () => {
    const kitten = { id: "EK" as const, uid: "the-kitten" };
    const event = detectKittenEvent(
      baseView({ explodedKittens: [] }),
      baseView({
        players: [
          { id: "Alice", alive: false, handSize: 0 },
          { id: "Bob", alive: true, handSize: 7 },
        ],
        explodedKittens: [kitten],
      }),
    );
    expect(event).toEqual({ kind: "eliminated", seat: 0, card: kitten });
  });
});

describe("detectCardTransfer", () => {
  it("returns null when nothing transferred", () => {
    expect(detectCardTransfer(baseView(), baseView({ deckSize: 19 }))).toBeNull();
  });

  it("detects a Pair steal from the resolved playHistory entry", () => {
    const transfer = detectCardTransfer(
      baseView({ playHistory: [] }),
      baseView({
        playHistory: [{ player: 0, effect: { kind: "PAIR", target: 1 }, noped: false }],
        players: [
          { id: "Alice", alive: true, handSize: 8 },
          { id: "Bob", alive: true, handSize: 6 },
        ],
      }),
    );
    expect(transfer).toEqual({ fromSeat: 1, toSeat: 0 });
  });

  it("detects a Triple steal from the resolved playHistory entry", () => {
    const transfer = detectCardTransfer(
      baseView({ playHistory: [] }),
      baseView({
        playHistory: [
          { player: 1, effect: { kind: "TRIPLE", target: 0, namedCard: "SKIP" }, noped: false },
        ],
        players: [
          { id: "Alice", alive: true, handSize: 6 },
          { id: "Bob", alive: true, handSize: 8 },
        ],
      }),
    );
    expect(transfer).toEqual({ fromSeat: 0, toSeat: 1 });
  });

  it("ignores a fizzled Pair/Triple where no card actually changed hands (target had nothing to give)", () => {
    // handlePassNopeWindow logs the playHistory entry before resolveNopeableEffect runs, so a
    // Pair/Triple that bails out early (empty hand / named card absent) still produces a
    // non-noped playHistory entry — detectCardTransfer must not be fooled by it.
    const emptyHandedBob = { id: "Bob", alive: true, handSize: 0 };
    const transfer = detectCardTransfer(
      baseView({ playHistory: [], players: [{ id: "Alice", alive: true, handSize: 7 }, emptyHandedBob] }),
      baseView({
        playHistory: [{ player: 0, effect: { kind: "PAIR", target: 1 }, noped: false }],
        players: [{ id: "Alice", alive: true, handSize: 7 }, emptyHandedBob],
      }),
    );
    expect(transfer).toBeNull();
  });

  it("ignores a noped Pair/Triple", () => {
    const transfer = detectCardTransfer(
      baseView({ playHistory: [] }),
      baseView({ playHistory: [{ player: 0, effect: { kind: "PAIR", target: 1 }, noped: true }] }),
    );
    expect(transfer).toBeNull();
  });

  it("ignores unrelated playHistory growth (Skip, Shuffle, etc.)", () => {
    const transfer = detectCardTransfer(
      baseView({ playHistory: [] }),
      baseView({ playHistory: [{ player: 0, effect: { kind: "SKIP" }, noped: false }] }),
    );
    expect(transfer).toBeNull();
  });

  it("detects a Favor hand-off when FAVOR_RESOLVE closes back to ACTION, not when the Favor is first played", () => {
    const favorOpened = detectCardTransfer(
      baseView({ phase: "ACTION", playHistory: [] }),
      baseView({
        phase: "FAVOR_RESOLVE",
        pendingAction: { type: "FAVOR", from: 0, target: 1 },
        playHistory: [{ player: 0, effect: { kind: "FAVOR", target: 1 }, noped: false }],
      }),
    );
    expect(favorOpened).toBeNull();

    const favorResolved = detectCardTransfer(
      baseView({ phase: "FAVOR_RESOLVE", pendingAction: { type: "FAVOR", from: 0, target: 1 } }),
      baseView({ phase: "ACTION", pendingAction: null }),
    );
    expect(favorResolved).toEqual({ fromSeat: 1, toSeat: 0 });
  });
});
