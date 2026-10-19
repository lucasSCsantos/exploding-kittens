import { beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (...args: unknown[]) => void;

const handlers = new Map<string, Handler>();
const emitted: { event: string; payload: unknown; ack?: Handler }[] = [];

vi.mock("../socket.js", () => ({
  socket: {
    on: (event: string, cb: Handler) => {
      handlers.set(event, cb);
    },
    emit: (event: string, payload: unknown, ack?: Handler) => {
      emitted.push({ event, payload, ack });
    },
  },
}));

const { useGameStore } = await import("./gameStore.js");

function lastEmit() {
  return emitted[emitted.length - 1]!;
}

beforeEach(() => {
  emitted.length = 0;
  useGameStore.setState({
    code: null,
    playerId: null,
    name: null,
    token: null,
    hostId: null,
    lobbyPlayers: [],
    view: null,
    lastError: null,
  });
});

describe("createRoom", () => {
  it("stores code/playerId/token once the server acknowledges", () => {
    useGameStore.getState().createRoom("Alice");
    expect(lastEmit().event).toBe("createRoom");
    expect(lastEmit().payload).toBe("Alice");

    lastEmit().ack!({ ok: true, code: "ABCD", playerId: "Alice", token: "secret" });

    expect(useGameStore.getState()).toMatchObject({
      code: "ABCD",
      playerId: "Alice",
      name: "Alice",
      token: "secret",
      lastError: null,
    });
  });

  it("records an error instead of throwing on failure", () => {
    useGameStore.getState().createRoom("Alice");
    lastEmit().ack!({ ok: false, error: "name is required" });

    expect(useGameStore.getState().lastError).toBe("name is required");
    expect(useGameStore.getState().code).toBeNull();
  });
});

describe("joinRoom", () => {
  it("sends the code and name, stores the result", () => {
    useGameStore.getState().joinRoom("abcd", "Bob");
    expect(lastEmit()).toMatchObject({ event: "joinRoom", payload: { code: "abcd", name: "Bob" } });

    lastEmit().ack!({ ok: true, code: "ABCD", playerId: "Bob", token: "secret" });
    expect(useGameStore.getState()).toMatchObject({ playerId: "Bob", name: "Bob", token: "secret" });
  });
});

describe("reconnect", () => {
  it("rejoins with the stored name and token when the socket reconnects", () => {
    useGameStore.setState({ code: "ABCD", name: "Alice", token: "secret" });
    handlers.get("connect")!();

    expect(lastEmit()).toMatchObject({
      event: "joinRoom",
      payload: { code: "ABCD", name: "Alice", token: "secret" },
    });
  });

  it("does nothing if this socket never joined a room", () => {
    handlers.get("connect")!();
    expect(emitted).toHaveLength(0);
  });
});

describe("dispatch", () => {
  it("emits the action and records an error on failure", () => {
    useGameStore.getState().dispatch({ type: "DRAW" });
    expect(lastEmit()).toMatchObject({ event: "action", payload: { type: "DRAW" } });

    lastEmit().ack!({ ok: false, error: "not your turn" });
    expect(useGameStore.getState().lastError).toBe("not your turn");
  });

  it("does not surface a PASS_NOPE_WINDOW failure as an error", () => {
    useGameStore.getState().dispatch({ type: "PASS_NOPE_WINDOW" });
    lastEmit().ack!({ ok: false, error: "no Nope window is open" });

    expect(useGameStore.getState().lastError).toBeNull();
  });
});

describe("peekTopOfDeck", () => {
  it("resolves with the cards the server sends back", async () => {
    const promise = useGameStore.getState().peekTopOfDeck();
    lastEmit().ack!({ ok: true, cards: [{ id: "SKIP", uid: "x" }] });

    await expect(promise).resolves.toEqual([{ id: "SKIP", uid: "x" }]);
  });

  it("rejects when the server refuses", async () => {
    const promise = useGameStore.getState().peekTopOfDeck();
    lastEmit().ack!({ ok: false, error: "only the current player can peek" });

    await expect(promise).rejects.toThrow("only the current player can peek");
  });
});

describe("server-pushed events", () => {
  it("lobby event replaces the roster", () => {
    handlers.get("lobby")!({ code: "ABCD", hostId: "Alice", players: [{ id: "Alice", name: "Alice", connected: true }] });

    expect(useGameStore.getState()).toMatchObject({
      code: "ABCD",
      hostId: "Alice",
      lobbyPlayers: [{ id: "Alice", name: "Alice", connected: true }],
    });
  });

  it("view event replaces the player view", () => {
    const view = { you: 0, phase: "ACTION" };
    handlers.get("view")!(view);

    expect(useGameStore.getState().view).toBe(view);
  });
});
