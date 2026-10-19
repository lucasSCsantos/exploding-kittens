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

const { diffViewForFeedback } = await import("./gameFeedback.js");

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
