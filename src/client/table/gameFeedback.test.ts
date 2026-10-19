import { describe, expect, it, vi } from "vitest";
import type { ServerView } from "./gameStore.js";
import type { SoundName } from "../sound.js";
import type { Card } from "../../engine/types.js";

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

const { diffViewForFeedback, detectKittenEvent, detectCardTransfer, resolveTransferCard, detectDraw } =
  await import("./gameFeedback.js");
const { useGameStore } = await import("./gameStore.js");

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

  it("records the elimination (ticket 25) in the store for the loss overlays to render", () => {
    const kitten = { id: "EK" as const, uid: "the-kitten" };
    useGameStore.setState({ lastElimination: null });
    diffViewForFeedback(
      baseView({ explodedKittens: [] }),
      baseView({
        players: [
          { id: "Alice", alive: false, handSize: 0 },
          { id: "Bob", alive: true, handSize: 7 },
        ],
        explodedKittens: [kitten],
      }),
    );
    expect(useGameStore.getState().lastElimination).toEqual({ seat: 0, card: kitten });
  });

  it("does not record an elimination for a defuse save", () => {
    useGameStore.setState({ lastElimination: null });
    diffViewForFeedback(
      baseView({ phase: "ACTION", currentPlayer: 0 }),
      baseView({ phase: "DEFUSE_REINSERT", currentPlayer: 0 }),
    );
    expect(useGameStore.getState().lastElimination).toBeNull();
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

describe("detectDraw", () => {
  it("returns null when the deck hasn't shrunk", () => {
    expect(detectDraw(baseView({ deckSize: 20 }), baseView({ deckSize: 20 }))).toBeNull();
  });

  it("reports the viewer's own draw with the newly-arrived card", () => {
    const drawn = { id: "SKIP" as const, uid: "drawn-card" };
    const event = detectDraw(
      baseView({ you: 0, currentPlayer: 0, deckSize: 20, hand: [] }),
      baseView({ you: 0, currentPlayer: 0, deckSize: 19, hand: [drawn] }),
    );
    expect(event).toEqual({ kind: "own", seat: 0, card: drawn });
  });

  it("reports an opponent's draw face-down, with no card", () => {
    const event = detectDraw(
      baseView({ you: 0, currentPlayer: 1, deckSize: 20 }),
      baseView({ you: 0, currentPlayer: 1, deckSize: 19 }),
    );
    expect(event).toEqual({ kind: "opponent", seat: 1, card: null });
  });

  it("attributes the draw to whoever's turn it was before the draw, even if the turn already advanced", () => {
    const event = detectDraw(
      baseView({ you: 0, currentPlayer: 1, deckSize: 20 }),
      baseView({ you: 0, currentPlayer: 2, deckSize: 19 }),
    );
    expect(event?.seat).toBe(1);
  });

  it("does not animate a draw that eliminated the drawer (no defuse)", () => {
    const event = detectDraw(
      baseView({ you: 0, currentPlayer: 1, deckSize: 20 }),
      baseView({
        you: 0,
        currentPlayer: 2,
        deckSize: 19,
        players: [
          { id: "Alice", alive: true, handSize: 7 },
          { id: "Bob", alive: false, handSize: 0 },
        ],
      }),
    );
    expect(event).toBeNull();
  });

  it("does not fire on a reinsertion growing the deck back", () => {
    expect(detectDraw(baseView({ deckSize: 19 }), baseView({ deckSize: 20 }))).toBeNull();
  });

  it("does not animate a draw that triggered a defuse reinsertion (the kitten reveal covers it)", () => {
    const event = detectDraw(
      baseView({ you: 0, currentPlayer: 0, deckSize: 20, phase: "ACTION" }),
      baseView({ you: 0, currentPlayer: 0, deckSize: 19, phase: "DEFUSE_REINSERT" }),
    );
    expect(event).toBeNull();
  });
});

describe("resolveTransferCard", () => {
  const stolenCard = { id: "SKIP" as const, uid: "stolen-card" };

  it("resolves the card when the viewer is the giver (it just left their hand)", () => {
    const card = resolveTransferCard(
      baseView({ you: 1, hand: [stolenCard] }),
      baseView({ you: 1, hand: [] }),
      { fromSeat: 1, toSeat: 0 },
    );
    expect(card).toEqual(stolenCard);
  });

  it("resolves the card when the viewer is the receiver (it just arrived in their hand)", () => {
    const card = resolveTransferCard(
      baseView({ you: 0, hand: [] }),
      baseView({ you: 0, hand: [stolenCard] }),
      { fromSeat: 1, toSeat: 0 },
    );
    expect(card).toEqual(stolenCard);
  });

  it("returns null for a bystander who isn't entitled to know the card's identity", () => {
    const card = resolveTransferCard(
      baseView({ you: 2, hand: [] }),
      baseView({ you: 2, hand: [] }),
      { fromSeat: 1, toSeat: 0 },
    );
    expect(card).toBeNull();
  });
});

describe("diffViewForFeedback draw tracking (ticket 26)", () => {
  it("records the viewer's own draw in the store for the flight animation to render", () => {
    const drawn = { id: "SKIP" as const, uid: "drawn-card" };
    useGameStore.setState({ lastDraw: null });
    diffViewForFeedback(
      baseView({ you: 0, currentPlayer: 0, deckSize: 20, hand: [] }),
      baseView({ you: 0, currentPlayer: 0, deckSize: 19, hand: [drawn] }),
    );
    expect(useGameStore.getState().lastDraw).toEqual({ kind: "own", seat: 0, card: drawn });
  });

  it("records an opponent's draw with no card", () => {
    useGameStore.setState({ lastDraw: null });
    diffViewForFeedback(
      baseView({ you: 0, currentPlayer: 1, deckSize: 20 }),
      baseView({ you: 0, currentPlayer: 1, deckSize: 19 }),
    );
    expect(useGameStore.getState().lastDraw).toEqual({ kind: "opponent", seat: 1, card: null });
  });

  it("does not record anything when the deck is unchanged", () => {
    useGameStore.setState({ lastDraw: null });
    diffViewForFeedback(baseView({ deckSize: 20 }), baseView({ deckSize: 20 }));
    expect(useGameStore.getState().lastDraw).toBeNull();
  });
});

describe("diffViewForFeedback transfer tracking (ticket 27)", () => {
  const givenCard = { id: "SKIP" as const, uid: "given-card" };

  it("records a detected transfer in the store for the flight animation to render", () => {
    useGameStore.setState({ lastTransfer: null });
    diffViewForFeedback(
      baseView({ you: 0, playHistory: [] }),
      baseView({
        you: 0,
        hand: [givenCard],
        playHistory: [{ player: 0, effect: { kind: "PAIR", target: 1 }, noped: false }],
        players: [
          { id: "Alice", alive: true, handSize: 8 },
          { id: "Bob", alive: true, handSize: 6 },
        ],
      }),
    );
    expect(useGameStore.getState().lastTransfer).toEqual({ fromSeat: 1, toSeat: 0, card: givenCard });
  });

  it("records a transfer with no card for a bystander", () => {
    useGameStore.setState({ lastTransfer: null });
    diffViewForFeedback(
      baseView({ you: 2, playHistory: [] }),
      baseView({
        you: 2,
        playHistory: [{ player: 0, effect: { kind: "PAIR", target: 1 }, noped: false }],
        players: [
          { id: "Alice", alive: true, handSize: 8 },
          { id: "Bob", alive: true, handSize: 6 },
          { id: "Carl", alive: true, handSize: 7 },
        ],
      }),
    );
    expect(useGameStore.getState().lastTransfer).toEqual({ fromSeat: 1, toSeat: 0, card: null });
  });

  it("does not record a transfer for unrelated playHistory growth", () => {
    useGameStore.setState({ lastTransfer: null });
    diffViewForFeedback(
      baseView({ playHistory: [] }),
      baseView({ playHistory: [{ player: 0, effect: { kind: "SKIP" }, noped: false }] }),
    );
    expect(useGameStore.getState().lastTransfer).toBeNull();
  });
});

describe("gameFeedback's useGameStore.subscribe wiring", () => {
  // diffViewForFeedback is called directly above, but that bypasses the module-level
  // `useGameStore.subscribe` at the bottom of gameFeedback.ts — the actual seam the socket
  // handler drives via `useGameStore.setState({ view })`. That subscriber used to advance
  // `previousView` *after* diffing, so a setState triggered from inside diffViewForFeedback
  // (e.g. recording lastDraw) re-entered the subscriber with a still-stale previousView,
  // re-diffed the same pair, and recursed until the stack overflowed — on every single draw,
  // since that's the most common action in the game.
  it("does not stack-overflow when a draw's lastDraw setState re-enters the subscriber", () => {
    useGameStore.setState({ view: baseView({ deckSize: 20, hand: [] }) });
    expect(() =>
      useGameStore.setState({
        view: baseView({ deckSize: 19, hand: [{ id: "SHUFFLE", uid: "c1" } as unknown as Card] }),
      }),
    ).not.toThrow();
  });
});
