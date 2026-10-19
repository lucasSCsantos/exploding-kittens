import { describe, expect, it } from "vitest";
import { RoomManager } from "./rooms.js";

describe("createRoom", () => {
  it("generates a 4-letter code and makes the creator the host", () => {
    const rooms = new RoomManager();
    const { code, playerId, token } = rooms.createRoom("Alice");

    expect(code).toMatch(/^[A-Z]{4}$/);
    expect(playerId).toBe("Alice");
    expect(token).toEqual(expect.any(String));
    expect(rooms.getRoom(code)?.hostId).toBe("Alice");
    expect(rooms.getRoom(code)?.players).toEqual([
      { id: "Alice", name: "Alice", connected: true, token },
    ]);
  });

  it("rejects a blank name", () => {
    const rooms = new RoomManager();
    expect(() => rooms.createRoom("  ")).toThrow(/name is required/);
  });
});

describe("joinRoom", () => {
  it("adds a new player to the room", () => {
    const rooms = new RoomManager();
    const { code } = rooms.createRoom("Alice");
    const { playerId } = rooms.joinRoom(code, "Bob");

    expect(playerId).toBe("Bob");
    expect(rooms.getRoom(code)?.players.map((p) => p.id)).toEqual(["Alice", "Bob"]);
  });

  it("is case-insensitive on the room code", () => {
    const rooms = new RoomManager();
    const { code } = rooms.createRoom("Alice");
    expect(() => rooms.joinRoom(code.toLowerCase(), "Bob")).not.toThrow();
  });

  it("throws for an unknown code", () => {
    const rooms = new RoomManager();
    expect(() => rooms.joinRoom("ZZZZ", "Bob")).toThrow(/no room with code/);
  });

  it("rejects once the room reaches 10 players", () => {
    const rooms = new RoomManager();
    const { code } = rooms.createRoom("p0");
    for (let i = 1; i < 10; i++) rooms.joinRoom(code, `p${i}`);
    expect(() => rooms.joinRoom(code, "p10")).toThrow(/room is full/);
  });

  it("rejects joining after the game has started", () => {
    const rooms = new RoomManager();
    const { code, playerId } = rooms.createRoom("Alice");
    rooms.joinRoom(code, "Bob");
    rooms.startGame(code, playerId);

    expect(() => rooms.joinRoom(code, "Charlie")).toThrow(/already started/);
  });

  it("lets an existing name rejoin (reconnect) given the right token, even after the game started", () => {
    const rooms = new RoomManager();
    const { code, playerId } = rooms.createRoom("Alice");
    const { token: bobToken } = rooms.joinRoom(code, "Bob");
    rooms.startGame(code, playerId);
    rooms.setConnected(code, "Bob", false);

    const { playerId: rejoinedId } = rooms.joinRoom(code, "Bob", bobToken);
    expect(rejoinedId).toBe("Bob");
    expect(rooms.getRoom(code)?.players.find((p) => p.id === "Bob")?.connected).toBe(true);
  });

  it("rejects reclaiming a name with no token or the wrong one", () => {
    const rooms = new RoomManager();
    const { code } = rooms.createRoom("Alice");
    rooms.joinRoom(code, "Bob");

    expect(() => rooms.joinRoom(code, "Bob")).toThrow(/already taken/);
    expect(() => rooms.joinRoom(code, "Bob", "not-the-right-token")).toThrow(/already taken/);
  });
});

describe("startGame", () => {
  it("only the host can start", () => {
    const rooms = new RoomManager();
    const { code } = rooms.createRoom("Alice");
    rooms.joinRoom(code, "Bob");
    expect(() => rooms.startGame(code, "Bob")).toThrow(/only the host/);
  });

  it("requires at least 2 players", () => {
    const rooms = new RoomManager();
    const { code, playerId } = rooms.createRoom("Alice");
    expect(() => rooms.startGame(code, playerId)).toThrow(/at least 2 players/);
  });

  it("creates a GameState in the ACTION phase", () => {
    const rooms = new RoomManager();
    const { code, playerId } = rooms.createRoom("Alice");
    rooms.joinRoom(code, "Bob");
    rooms.startGame(code, playerId, { seed: 1 });

    const view = rooms.getView(code, "Alice");
    expect(view.phase).toBe("ACTION");
    expect(view.players).toHaveLength(2);
  });

  it("cannot be started twice", () => {
    const rooms = new RoomManager();
    const { code, playerId } = rooms.createRoom("Alice");
    rooms.joinRoom(code, "Bob");
    rooms.startGame(code, playerId, { seed: 1 });
    expect(() => rooms.startGame(code, playerId)).toThrow(/already started/);
  });
});

describe("applyAction", () => {
  function startedRoom(seed = 1) {
    const rooms = new RoomManager();
    const { code, playerId: host } = rooms.createRoom("Alice");
    rooms.joinRoom(code, "Bob");
    rooms.startGame(code, host, { seed });
    const current = rooms.getView(code, host).currentPlayer === 0 ? "Alice" : "Bob";
    const other = current === "Alice" ? "Bob" : "Alice";
    return { rooms, code, current, other };
  }

  it("rejects an action from a player who is not the current player", () => {
    const { rooms, code, other } = startedRoom();
    expect(() => rooms.applyAction(code, other, { type: "DRAW" })).toThrow(
      /only the current player/,
    );
  });

  it("applies a valid action from the current player", () => {
    const { rooms, code, current } = startedRoom();
    expect(() => rooms.applyAction(code, current, { type: "DRAW" })).not.toThrow();
  });

  it("rejects playing Nope on another player's behalf", () => {
    const { rooms, code, current, other } = startedRoom();
    const currentIndex = rooms.getView(code, current).you;
    // Open a Nope window via an Attack play requires holding one; simplest is to assert the
    // authorization check itself, independent of whether a window is actually open.
    expect(() =>
      rooms.applyAction(code, other, { type: "PLAY_NOPE", player: currentIndex, cardUid: "x" }),
    ).toThrow(/cannot play Nope on another player's behalf/);
  });

  it("rejects an action from someone not in the game", () => {
    const { rooms, code } = startedRoom();
    expect(() => rooms.applyAction(code, "Mallory", { type: "DRAW" })).toThrow(
      /not a player in this game/,
    );
  });

  it("rejects actions before the game has started", () => {
    const rooms = new RoomManager();
    const { code, playerId } = rooms.createRoom("Alice");
    expect(() => rooms.applyAction(code, playerId, { type: "DRAW" })).toThrow(/has not started/);
  });
});

describe("peekTopOfDeck", () => {
  /** Finds a seed where the dealt current player actually holds an ATF card, since
   * `peekTopOfDeck` is gated on that (deals are otherwise random per seed). 2-3 player games use
   * the paw-print tier, which has no ATF cards at all (§2.1) — 4 players gets the standard tier. */
  function roomWithCurrentPlayerHoldingAtf() {
    const names = ["Alice", "Bob", "Carol", "Dave"];
    for (let seed = 1; seed < 500; seed++) {
      const rooms = new RoomManager();
      const { code, playerId: host } = rooms.createRoom(names[0]!);
      for (const name of names.slice(1)) rooms.joinRoom(code, name);
      rooms.startGame(code, host, { seed });

      const view = rooms.getView(code, host);
      const current = names[view.currentPlayer]!;
      const other = names.find((n) => n !== current)!;
      if (rooms.getView(code, current).hand.some((c) => c.id === "ATF")) {
        return { rooms, code, current, other };
      }
    }
    throw new Error("no seed found where the current player holds an ATF card");
  }

  it("returns cards to the current player holding an Alter the Future card", () => {
    const { rooms, code, current, other } = roomWithCurrentPlayerHoldingAtf();

    expect(rooms.peekTopOfDeck(code, current).length).toBeGreaterThan(0);
    expect(() => rooms.peekTopOfDeck(code, other)).toThrow(/only the current player can peek/);
  });

  it("rejects a current player who isn't holding an Alter the Future card", () => {
    const rooms = new RoomManager();
    const { code, playerId: host } = rooms.createRoom("Alice");
    rooms.joinRoom(code, "Bob");
    rooms.startGame(code, host, { seed: 1 });
    const current = rooms.getView(code, host).currentPlayer === 0 ? "Alice" : "Bob";

    if (rooms.getView(code, current).hand.some((c) => c.id === "ATF")) {
      // Seed 1 happens to deal ATF to the current player; this test needs the opposite.
      throw new Error("test seed deals ATF to the current player — pick a different seed");
    }
    expect(() => rooms.peekTopOfDeck(code, current)).toThrow(
      /requires holding an Alter the Future card/,
    );
  });
});

describe("getView", () => {
  it("never exposes another player's hand", () => {
    const rooms = new RoomManager();
    const { code, playerId: host } = rooms.createRoom("Alice");
    rooms.joinRoom(code, "Bob");
    rooms.startGame(code, host, { seed: 1 });

    const aliceView = rooms.getView(code, "Alice");
    expect(aliceView.hand.length).toBeGreaterThan(0);
    // The view's opponent entries only ever carry a hand size, never card contents.
    expect(aliceView.players.every((p) => !("hand" in p))).toBe(true);
  });
});
