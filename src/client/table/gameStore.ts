// Client-side store, server-driven (ticket 12): the server is the sole authority on GameState —
// this store only ever holds what the server has told *this* socket (the lobby roster, or this
// player's own `PlayerView`). Every action is a socket round-trip, acknowledged with ok/error.

import { create } from "zustand";
import type { Action } from "../../engine/actions.js";
import { DEFAULT_LOBBY_CONFIG, type LobbyConfig, type SetupConfig } from "../../engine/setup.js";
import type { Card } from "../../engine/types.js";
import type { PlayerView } from "../../engine/view.js";
import { clearSession, loadSession, saveSession } from "../session.js";
import { socket } from "../socket.js";

export interface LobbyPlayer {
  id: string;
  name: string;
  connected: boolean;
}

/** The server's `view` payload: a `PlayerView` plus server-owned Nope-window timing (ticket 13),
 * so every client renders the same countdown instead of each racing its own local timer. */
export type ServerView = PlayerView & { nopeDeadline: number | null };

type Ack<T extends object = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

interface GameStoreState {
  /** This room's 4-letter code, once created or joined. */
  code: string | null;
  /** This socket's own player id within the room (== engine `Player.id` once started). */
  playerId: string | null;
  /** This player's display name — kept so a reconnecting socket can rejoin as itself. */
  name: string | null;
  /** Proves to the server a reconnecting socket is the same player, not a name-guesser. */
  token: string | null;
  hostId: string | null;
  /** The pre-start roster; superseded by `view` once the game starts. */
  lobbyPlayers: LobbyPlayer[];
  /** The host's chosen rule variants (ticket 14); visible to every player, editable by the host. */
  config: LobbyConfig;
  view: ServerView | null;
  lastError: string | null;
  /** The most recent elimination noticed by `gameFeedback.ts`'s view diffing (ticket 25) — drives
   * the full-screen/seat-local loss overlays. Not server-owned state: it's a transient UI moment,
   * cleared by the Table once its fixed display delay elapses. */
  lastElimination: { seat: number; card: Card | null } | null;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  updateConfig: (patch: Partial<LobbyConfig>) => void;
  startGame: (config?: SetupConfig) => void;
  playAgain: () => void;
  dispatch: (action: Action) => void;
  peekTopOfDeck: () => Promise<Card[]>;
  clearError: () => void;
}

const storedSession = loadSession();

export const useGameStore = create<GameStoreState>((set) => ({
  code: storedSession?.code ?? null,
  playerId: null,
  name: storedSession?.name ?? null,
  token: storedSession?.token ?? null,
  hostId: null,
  lobbyPlayers: [],
  config: DEFAULT_LOBBY_CONFIG,
  view: null,
  lastError: null,
  lastElimination: null,

  createRoom: (name) => {
    socket.emit(
      "createRoom",
      name,
      (res: Ack<{ code: string; playerId: string; token: string }>) => {
        if (res.ok) {
          set({ code: res.code, playerId: res.playerId, name, token: res.token, lastError: null });
          saveSession({ code: res.code, name, token: res.token });
        } else {
          set({ lastError: res.error });
        }
      },
    );
  },

  joinRoom: (code, name) => {
    socket.emit(
      "joinRoom",
      { code, name },
      (res: Ack<{ code: string; playerId: string; token: string }>) => {
        if (res.ok) {
          set({ code: res.code, playerId: res.playerId, name, token: res.token, lastError: null });
          saveSession({ code: res.code, name, token: res.token });
        } else {
          set({ lastError: res.error });
        }
      },
    );
  },

  updateConfig: (patch) => {
    socket.emit("updateConfig", patch, (res: Ack) => {
      if (!res.ok) set({ lastError: res.error });
    });
  },

  startGame: (config) => {
    socket.emit("startGame", config, (res: Ack) => {
      if (!res.ok) set({ lastError: res.error });
    });
  },

  playAgain: () => {
    socket.emit("playAgain", {}, (res: Ack) => {
      if (!res.ok) set({ lastError: res.error });
    });
  },

  dispatch: (action) => {
    socket.emit("action", action, (res: Ack) => {
      // Manually pressing "Pass" races the server's own auto-close timer (ticket 13) and may
      // lose that race — that's expected, not an error worth surfacing to the player.
      if (!res.ok && action.type !== "PASS_NOPE_WINDOW") {
        set({ lastError: res.error });
      }
    });
  },

  peekTopOfDeck: () =>
    new Promise<Card[]>((resolve, reject) => {
      socket.emit("peekTopOfDeck", {}, (res: Ack<{ cards: Card[] }>) => {
        if (res.ok) resolve(res.cards);
        else reject(new Error(res.error));
      });
    }),

  clearError: () => set({ lastError: null }),
}));

socket.on(
  "lobby",
  (payload: { code: string; hostId: string; players: LobbyPlayer[]; config: LobbyConfig }) => {
    useGameStore.setState({
      code: payload.code,
      hostId: payload.hostId,
      lobbyPlayers: payload.players,
      config: payload.config,
      // The server only ever sends "lobby" when there's no active game (including right after
      // "play again" resets the room) — drop any stale GAME_OVER view so the app renders Lobby.
      view: null,
      lastElimination: null,
    });
  },
);

socket.on("view", (view: ServerView) => {
  useGameStore.setState({ view });
});

// Socket.IO reconnects (same page, dropped connection — e.g. a phone backgrounding the tab)
// land on a new socket id, so the server no longer knows which seat this is. Reclaim it with
// the token the server handed out on the original join, rather than leaving the player stuck.
socket.on("connect", () => {
  const { code, name, token } = useGameStore.getState();
  if (!code || !name || !token) return;

  socket.emit(
    "joinRoom",
    { code, name, token },
    (res: Ack<{ code: string; playerId: string; token: string }>) => {
      if (res.ok) {
        useGameStore.setState({ playerId: res.playerId, token: res.token });
        saveSession({ code: res.code, name, token: res.token });
      } else {
        // The stored token no longer reclaims this seat (room gone, name taken by someone
        // else) — stop retrying it on every future reconnect.
        clearSession();
      }
    },
  );
});
