// RoomManager: in-memory room/lobby state and the server-side authority boundary on top of the
// pure engine (ticket 12). Each room owns exactly one GameState; every mutation goes through
// `applyAction`, which first checks the acting player is actually allowed to take that action —
// the engine itself only knows about seat indices, not who is allowed to act as which seat.

import { randomUUID } from "node:crypto";
import { applyAction as engineApplyAction, type Action } from "../engine/actions.js";
import { createGame, type SetupConfig } from "../engine/setup.js";
import { getPlayerView, type PlayerView } from "../engine/view.js";
import type { Card, GameState } from "../engine/types.js";

export interface RoomPlayer {
  /** Also the engine's `Player.id` once the game starts — must stay unique within the room. */
  id: string;
  name: string;
  connected: boolean;
  /** Proves a reconnecting socket is the same person, not just someone who knows this name —
   * never sent to any socket except the player's own, in the create/join ack. */
  token: string;
}

export interface Room {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  /** null until the host starts the game. */
  state: GameState | null;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — easy to confuse when read aloud
const CODE_LENGTH = 4;
const MAX_PLAYERS = 10;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("RoomManager: player name is required");
  }
  return trimmed;
}

/** Which seat `playerId` must occupy for `action` to be theirs to take. */
function requireAuthorizedActor(state: GameState, playerId: string, action: Action): void {
  const actorIndex = state.players.findIndex((p) => p.id === playerId);
  if (actorIndex === -1) {
    throw new Error(`RoomManager: ${playerId} is not a player in this game`);
  }

  switch (action.type) {
    case "PLAY_NOPE":
      if (action.player !== actorIndex) {
        throw new Error("RoomManager: cannot play Nope on another player's behalf");
      }
      return;
    case "RESOLVE_FAVOR":
      if (state.pendingAction?.type !== "FAVOR" || state.pendingAction.target !== actorIndex) {
        throw new Error("RoomManager: only the Favor target can resolve it");
      }
      return;
    case "PASS_NOPE_WINDOW":
      // Every connected client races its own countdown to close the window — any player may.
      return;
    default:
      if (actorIndex !== state.currentPlayer) {
        throw new Error("RoomManager: only the current player can take this action");
      }
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(hostName: string): { code: string; playerId: string; token: string } {
    const name = requireName(hostName);
    let code = randomCode();
    while (this.rooms.has(code)) {
      code = randomCode();
    }

    const token = randomUUID();
    this.rooms.set(code, {
      code,
      hostId: name,
      players: [{ id: name, name, connected: true, token }],
      state: null,
    });

    return { code, playerId: name, token };
  }

  /** `token` is required to reclaim a name already in the room (a dropped connection
   * reconnecting) — without a matching token, that name is simply taken. */
  joinRoom(rawCode: string, playerName: string, token?: string): { playerId: string; token: string } {
    const code = rawCode.trim().toUpperCase();
    const room = this.requireRoom(code);
    const name = requireName(playerName);

    const existing = room.players.find((p) => p.id === name);
    if (existing) {
      if (existing.token !== token) {
        throw new Error("RoomManager: that name is already taken in this room");
      }
      existing.connected = true;
      return { playerId: existing.id, token: existing.token };
    }

    if (room.state) {
      throw new Error("RoomManager: game already started");
    }
    if (room.players.length >= MAX_PLAYERS) {
      throw new Error("RoomManager: room is full");
    }

    const newToken = randomUUID();
    room.players.push({ id: name, name, connected: true, token: newToken });
    return { playerId: name, token: newToken };
  }

  startGame(code: string, requesterId: string, config?: SetupConfig): void {
    const room = this.requireRoom(code);
    if (requesterId !== room.hostId) {
      throw new Error("RoomManager: only the host can start the game");
    }
    if (room.state) {
      throw new Error("RoomManager: game already started");
    }
    if (room.players.length < 2) {
      throw new Error("RoomManager: need at least 2 players to start");
    }

    const names = room.players.map((p) => p.name);
    // The engine hands back phase SETUP; nothing in applyAction transitions it to ACTION
    // (matches the Phase-2 harness's own fix-up in the old gameStore.startGame).
    room.state = { ...createGame(names, config), phase: "ACTION" };
  }

  applyAction(code: string, playerId: string, action: Action): void {
    const room = this.requireRoom(code);
    if (!room.state) {
      throw new Error("RoomManager: game has not started");
    }
    requireAuthorizedActor(room.state, playerId, action);
    room.state = engineApplyAction(room.state, action);
  }

  /** The top of the deck, for the current player to choose an Alter the Future order before
   * submitting `PLAY_ALTER_FUTURE` (which requires the final order up front) — without ever
   * handing the client the full deck. Gated on actually holding an ATF card, same as any other
   * card play, so it can't be used as a free, unlimited See the Future. */
  peekTopOfDeck(code: string, playerId: string): Card[] {
    const room = this.requireRoom(code);
    if (!room.state) {
      throw new Error("RoomManager: game has not started");
    }
    const actorIndex = room.state.players.findIndex((p) => p.id === playerId);
    if (actorIndex !== room.state.currentPlayer) {
      throw new Error("RoomManager: only the current player can peek the deck");
    }
    const actor = room.state.players[actorIndex]!;
    if (!actor.hand.some((c) => c.id === "ATF")) {
      throw new Error("RoomManager: peeking the deck requires holding an Alter the Future card");
    }
    return room.state.deck.slice(0, Math.min(3, room.state.deck.length));
  }

  getView(code: string, playerId: string): PlayerView {
    const room = this.requireRoom(code);
    if (!room.state) {
      throw new Error("RoomManager: game has not started");
    }
    return getPlayerView(room.state, playerId);
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.trim().toUpperCase());
  }

  setConnected(code: string, playerId: string, connected: boolean): void {
    const player = this.rooms.get(code)?.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = connected;
    }
  }

  private requireRoom(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`RoomManager: no room with code ${code}`);
    }
    return room;
  }
}
