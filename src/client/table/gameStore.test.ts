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

const savedSessions: unknown[] = [];
let clearSessionCalls = 0;

vi.mock("../session.js", () => ({
  loadSession: () => null,
  saveSession: (session: unknown) => {
    savedSessions.push(session);
  },
  clearSession: () => {
    clearSessionCalls++;
  },
}));

const { useGameStore } = await import("./gameStore.js");

function lastSavedSession() {
  return savedSessions[savedSessions.length - 1];
}

function lastEmit() {
  return emitted[emitted.length - 1]!;
}

beforeEach(() => {
  emitted.length = 0;
  savedSessions.length = 0;
  clearSessionCalls = 0;
  useGameStore.setState({
    code: null,
    playerId: null,
    name: null,
    token: null,
    hostId: null,
    lobbyPlayers: [],
    config: {
      attackStacking: true,
      comboScope: "cats-only",
      feralPairRule: "requires-real-cat",
      extraDefuses: "default",
    },
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
    expect(lastSavedSession()).toEqual({ code: "ABCD", name: "Alice", token: "secret" });
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
    expect(lastSavedSession()).toEqual({ code: "ABCD", name: "Bob", token: "secret" });
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

  it("clears the stored session when the server rejects the stored token", () => {
    useGameStore.setState({ code: "ABCD", name: "Alice", token: "stale-token" });
    handlers.get("connect")!();

    lastEmit().ack!({ ok: false, error: "that name is already taken in this room" });

    expect(clearSessionCalls).toBe(1);
  });
});

describe("updateConfig", () => {
  it("emits the patch and records an error on failure", () => {
    useGameStore.getState().updateConfig({ attackStacking: false });
    expect(lastEmit()).toMatchObject({ event: "updateConfig", payload: { attackStacking: false } });

    lastEmit().ack!({ ok: false, error: "only the host can change settings" });
    expect(useGameStore.getState().lastError).toBe("only the host can change settings");
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
  it("lobby event replaces the roster and settings", () => {
    handlers.get("lobby")!({
      code: "ABCD",
      hostId: "Alice",
      players: [{ id: "Alice", name: "Alice", connected: true }],
      config: {
        attackStacking: false,
        comboScope: "any-matching",
        feralPairRule: "allowed",
        extraDefuses: 2,
      },
    });

    expect(useGameStore.getState()).toMatchObject({
      code: "ABCD",
      hostId: "Alice",
      lobbyPlayers: [{ id: "Alice", name: "Alice", connected: true }],
      config: {
        attackStacking: false,
        comboScope: "any-matching",
        feralPairRule: "allowed",
        extraDefuses: 2,
      },
    });
  });

  it("view event replaces the player view", () => {
    const view = { you: 0, phase: "ACTION" };
    handlers.get("view")!(view);

    expect(useGameStore.getState().view).toBe(view);
  });

  it("lobby event clears a stale view, e.g. after play again resets the room", () => {
    const view = { you: 0, phase: "GAME_OVER" };
    handlers.get("view")!(view);

    handlers.get("lobby")!({
      code: "ABCD",
      hostId: "Alice",
      players: [{ id: "Alice", name: "Alice", connected: true }],
      config: {
        attackStacking: true,
        comboScope: "cats-only",
        feralPairRule: "requires-real-cat",
        extraDefuses: "default",
      },
    });

    expect(useGameStore.getState().view).toBeNull();
  });
});

describe("playAgain", () => {
  it("emits playAgain and surfaces an error ack", () => {
    useGameStore.getState().playAgain();

    expect(lastEmit().event).toBe("playAgain");
    lastEmit().ack!({ ok: false, error: "only the host can start a new round" });

    expect(useGameStore.getState().lastError).toBe("only the host can start a new round");
  });
});
