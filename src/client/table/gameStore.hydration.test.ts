import { describe, expect, it, vi } from "vitest";

type Handler = (...args: unknown[]) => void;

const emitted: { event: string; payload: unknown; ack?: Handler }[] = [];

vi.mock("../socket.js", () => ({
  socket: {
    on: () => {},
    emit: (event: string, payload: unknown, ack?: Handler) => {
      emitted.push({ event, payload, ack });
    },
  },
}));

vi.mock("../session.js", () => ({
  loadSession: () => ({ code: "WXYZ", name: "Carol", token: "stored-token" }),
  saveSession: () => {},
  clearSession: () => {},
}));

describe("gameStore startup hydration", () => {
  it("hydrates code/name/token from a previously stored session", async () => {
    const { useGameStore } = await import("./gameStore.js");
    expect(useGameStore.getState()).toMatchObject({
      code: "WXYZ",
      name: "Carol",
      token: "stored-token",
    });
  });
});
