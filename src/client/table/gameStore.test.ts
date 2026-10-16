import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./gameStore.js";

function names(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i}`);
}

beforeEach(() => {
  useGameStore.setState({ game: null, activeSeat: 0, lastError: null });
});

describe("startGame", () => {
  it("creates a game and resets seat/error state", () => {
    useGameStore.getState().startGame(names(3), { seed: 1 });
    const { game, activeSeat, lastError } = useGameStore.getState();

    expect(game).not.toBeNull();
    expect(game!.players).toHaveLength(3);
    expect(game!.phase).toBe("ACTION");
    expect(activeSeat).toBe(0);
    expect(lastError).toBeNull();
  });
});

describe("dispatch", () => {
  it("applies a valid action and advances game state", () => {
    useGameStore.getState().startGame(names(2), { seed: 2 });
    const before = useGameStore.getState().game!;

    useGameStore.getState().dispatch({ type: "DRAW" });

    const after = useGameStore.getState().game!;
    expect(after).not.toBe(before);
    expect(useGameStore.getState().lastError).toBeNull();
  });

  it("records an error instead of throwing when the action is invalid", () => {
    useGameStore.getState().startGame(names(2), { seed: 3 });
    const before = useGameStore.getState().game;

    expect(() =>
      useGameStore.getState().dispatch({ type: "PLAY_SKIP", cardUid: "not-a-real-card" }),
    ).not.toThrow();

    expect(useGameStore.getState().lastError).toMatch(/not in the current player's hand/);
    expect(useGameStore.getState().game).toBe(before);
  });

  it("is a no-op before a game has started", () => {
    expect(() => useGameStore.getState().dispatch({ type: "DRAW" })).not.toThrow();
    expect(useGameStore.getState().game).toBeNull();
  });
});

describe("setActiveSeat", () => {
  it("switches which seat's view is active", () => {
    useGameStore.getState().startGame(names(3), { seed: 4 });
    useGameStore.getState().setActiveSeat(2);
    expect(useGameStore.getState().activeSeat).toBe(2);
  });
});
