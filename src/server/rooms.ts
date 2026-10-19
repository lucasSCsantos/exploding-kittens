// RoomManager: in-memory room/lobby state and the server-side authority boundary on top of the
// pure engine (ticket 12). Each room owns exactly one GameState; every mutation goes through
// `applyAction`, which first checks the acting player is actually allowed to take that action —
// the engine itself only knows about seat indices, not who is allowed to act as which seat.

import { randomUUID } from "node:crypto";
import { applyAction as engineApplyAction, type Action } from "../engine/actions.js";
import {
  createGame,
  DEFAULT_LOBBY_CONFIG,
  type LobbyConfig,
  type SetupConfig,
} from "../engine/setup.js";
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
  /** The host's chosen rule variants, picked in the lobby before the game starts (ticket 14). */
  config: LobbyConfig;
  /** null until the host starts the game. */
  state: GameState | null;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — easy to confuse when read aloud
const CODE_LENGTH = 4;
const MAX_PLAYERS = 10;

const DEFAULT_TURN_TIMEOUT_MS = 45_000;
const DEFAULT_NOPE_WINDOW_MS = 4_000;
const DEFAULT_DISCONNECT_GRACE_MS = 60_000;

export interface RoomManagerOptions {
  /** §5 turn timer (ticket 13): auto-draws for the current player after this much inactivity. */
  turnTimeoutMs?: number;
  /** §7 Nope window (ticket 13): closes the window after this much time with no new Nope. */
  nopeWindowMs?: number;
  /** Ticket 13: drops a disconnected, not-yet-seated player after this long out of contact. */
  disconnectGraceMs?: number;
  /** Called after any server-driven (timer-fired) mutation, so the caller can re-broadcast. */
  onChange?: (code: string) => void;
}

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
  private readonly turnTimeoutMs: number;
  private readonly nopeWindowMs: number;
  private readonly disconnectGraceMs: number;
  private readonly onChange: (code: string) => void;

  /** Auto-draw for the current player, keyed by room code — restarted on every state change. */
  private turnTimers = new Map<string, NodeJS.Timeout>();
  /** Auto-close the Nope window, keyed by room code — restarted on every Nope played. */
  private nopeTimers = new Map<string, NodeJS.Timeout>();
  /** When the open Nope window (if any) will auto-close, for clients to render a shared countdown. */
  private nopeDeadlines = new Map<string, number>();
  /** Drops a still-disconnected player, keyed by `${code}:${playerId}`. */
  private disconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(options: RoomManagerOptions = {}) {
    this.turnTimeoutMs = options.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS;
    this.nopeWindowMs = options.nopeWindowMs ?? DEFAULT_NOPE_WINDOW_MS;
    this.disconnectGraceMs = options.disconnectGraceMs ?? DEFAULT_DISCONNECT_GRACE_MS;
    this.onChange = options.onChange ?? (() => {});
  }

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
      config: { ...DEFAULT_LOBBY_CONFIG },
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
      this.clearDisconnectTimer(code, existing.id);
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

  /** Host-only: merges `patch` into the room's lobby settings, picked up by the next `startGame`. */
  updateConfig(code: string, requesterId: string, patch: Partial<LobbyConfig>): void {
    const room = this.requireRoom(code);
    if (requesterId !== room.hostId) {
      throw new Error("RoomManager: only the host can change settings");
    }
    if (room.state) {
      throw new Error("RoomManager: game already started");
    }
    room.config = { ...room.config, ...patch };
  }

  startGame(code: string, requesterId: string, overrides?: SetupConfig): void {
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
    room.state = { ...createGame(names, { ...room.config, ...overrides }), phase: "ACTION" };
    this.rescheduleTimers(code);
  }

  applyAction(code: string, playerId: string, action: Action): void {
    const room = this.requireRoom(code);
    if (!room.state) {
      throw new Error("RoomManager: game has not started");
    }
    requireAuthorizedActor(room.state, playerId, action);
    room.state = engineApplyAction(room.state, action);
    this.rescheduleTimers(code);
  }

  /** The open Nope window's auto-close time (epoch ms), for every client to render the same
   * countdown — null outside a Nope window. */
  getNopeDeadline(code: string): number | null {
    return this.nopeDeadlines.get(code.trim().toUpperCase()) ?? null;
  }

  /** Applies `action` as the server itself, bypassing per-seat authorization — only for
   * server-driven timeouts (turn/Nope), never reachable from a client message. */
  private forceApplyAction(code: string, action: Action): void {
    const room = this.rooms.get(code);
    if (!room?.state) return;
    try {
      room.state = engineApplyAction(room.state, action);
    } catch (err) {
      console.error(`RoomManager: timer-driven ${action.type} failed for room ${code}`, err);
      return;
    }
    this.rescheduleTimers(code);
    this.onChange(code);
  }

  /** Clears and re-arms the turn/Nope timers to match the room's current phase — called after
   * every state mutation, including ones timers themselves caused. */
  private rescheduleTimers(code: string): void {
    const existingTurnTimer = this.turnTimers.get(code);
    if (existingTurnTimer) clearTimeout(existingTurnTimer);
    this.turnTimers.delete(code);

    const existingNopeTimer = this.nopeTimers.get(code);
    if (existingNopeTimer) clearTimeout(existingNopeTimer);
    this.nopeTimers.delete(code);
    this.nopeDeadlines.delete(code);

    const state = this.rooms.get(code)?.state;
    if (!state) return;

    if (state.phase === "NOPE_WINDOW") {
      this.nopeDeadlines.set(code, Date.now() + this.nopeWindowMs);
      this.nopeTimers.set(
        code,
        setTimeout(() => this.forceApplyAction(code, { type: "PASS_NOPE_WINDOW" }), this.nopeWindowMs),
      );
    } else if (state.phase === "ACTION") {
      this.turnTimers.set(
        code,
        setTimeout(() => this.forceApplyAction(code, { type: "DRAW" }), this.turnTimeoutMs),
      );
    }
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

  /** Marks a seat (dis)connected. A disconnect starts the grace-period drop timer; a reconnect
   * cancels it. Reconnecting is always possible via `joinRoom`'s token check regardless of this
   * flag — this only governs whether an abandoned *lobby* seat frees itself up. Once the game
   * has started the engine has no way to remove a seated player without corrupting its
   * N-1-kitten/defuse-count invariants, so a mid-game disconnect is tracked (`connected: false`)
   * but never dropped; the turn timer keeps the game moving in the meantime. */
  setConnected(code: string, playerId: string, connected: boolean): void {
    const player = this.rooms.get(code)?.players.find((p) => p.id === playerId);
    if (!player) return;
    player.connected = connected;
    this.clearDisconnectTimer(code, playerId);

    if (!connected) {
      this.disconnectTimers.set(
        `${code}:${playerId}`,
        setTimeout(() => this.dropIfStillDisconnected(code, playerId), this.disconnectGraceMs),
      );
    }
  }

  /** Cancels a pending grace-period drop — on any reconnect, whether through `setConnected` or
   * the token-based reclaim in `joinRoom`. */
  private clearDisconnectTimer(code: string, playerId: string): void {
    const timerKey = `${code}:${playerId}`;
    const existing = this.disconnectTimers.get(timerKey);
    if (existing) clearTimeout(existing);
    this.disconnectTimers.delete(timerKey);
  }

  private dropIfStillDisconnected(code: string, playerId: string): void {
    this.disconnectTimers.delete(`${code}:${playerId}`);
    const room = this.rooms.get(code);
    if (!room || room.state) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.connected) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    if (room.players.length === 0) {
      this.rooms.delete(code);
      return;
    }
    if (room.hostId === playerId) {
      room.hostId = room.players[0]!.id;
    }
    this.onChange(code);
  }

  private requireRoom(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`RoomManager: no room with code ${code}`);
    }
    return room;
  }
}
