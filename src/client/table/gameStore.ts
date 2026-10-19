// Client-side store, server-driven (ticket 12): the server is the sole authority on GameState —
// this store only ever holds what the server has told *this* socket (the lobby roster, or this
// player's own `PlayerView`). Every action is a socket round-trip, acknowledged with ok/error.

import { create } from "zustand";
import type { Action } from "../../engine/actions.js";
import type { SetupConfig } from "../../engine/setup.js";
import type { Card } from "../../engine/types.js";
import type { PlayerView } from "../../engine/view.js";
import { socket } from "../socket.js";

export interface LobbyPlayer {
  id: string;
  name: string;
  connected: boolean;
}

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
  view: PlayerView | null;
  lastError: string | null;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  startGame: (config?: SetupConfig) => void;
  dispatch: (action: Action) => void;
  peekTopOfDeck: () => Promise<Card[]>;
  clearError: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  code: null,
  playerId: null,
  name: null,
  token: null,
  hostId: null,
  lobbyPlayers: [],
  view: null,
  lastError: null,

  createRoom: (name) => {
    socket.emit(
      "createRoom",
      name,
      (res: Ack<{ code: string; playerId: string; token: string }>) => {
        if (res.ok) {
          set({ code: res.code, playerId: res.playerId, name, token: res.token, lastError: null });
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
        } else {
          set({ lastError: res.error });
        }
      },
    );
  },

  startGame: (config) => {
    socket.emit("startGame", config, (res: Ack) => {
      if (!res.ok) set({ lastError: res.error });
    });
  },

  dispatch: (action) => {
    socket.emit("action", action, (res: Ack) => {
      // Every connected client races its own Nope-window countdown and may lose that race —
      // that's expected, not an error worth surfacing to the player.
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

socket.on("lobby", (payload: { code: string; hostId: string; players: LobbyPlayer[] }) => {
  useGameStore.setState({
    code: payload.code,
    hostId: payload.hostId,
    lobbyPlayers: payload.players,
  });
});

socket.on("view", (view: PlayerView) => {
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
      if (res.ok) useGameStore.setState({ playerId: res.playerId, token: res.token });
    },
  );
});
