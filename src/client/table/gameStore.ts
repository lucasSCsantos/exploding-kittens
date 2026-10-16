// Client-side "fake multiplayer" harness (ticket 10): the whole GameState lives in this
// Zustand store, and each seat's view is derived from it via the engine directly. This is
// temporary — real multiplayer (ticket 12+) replaces it with server-driven state.

import { create } from "zustand";
import type { Action } from "../../engine/actions.js";
import { applyAction } from "../../engine/actions.js";
import { createGame, type SetupConfig } from "../../engine/setup.js";
import { getPlayerView, type PlayerView } from "../../engine/view.js";
import type { GameState } from "../../engine/types.js";

interface GameStoreState {
  game: GameState | null;
  /** Which seat's hand/view the device is currently showing — switched by the dev control. */
  activeSeat: number;
  lastError: string | null;
  startGame: (playerNames: string[], config?: SetupConfig) => void;
  dispatch: (action: Action) => void;
  setActiveSeat: (seat: number) => void;
  clearError: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  game: null,
  activeSeat: 0,
  lastError: null,

  startGame: (playerNames, config) => {
    // The engine hands back phase SETUP; nothing in applyAction transitions it to ACTION
    // (that's a server concern once ticket 12 exists). This harness starts play itself.
    const game: GameState = { ...createGame(playerNames, config), phase: "ACTION" };
    set({ game, activeSeat: 0, lastError: null });
  },

  dispatch: (action) => {
    const { game } = get();
    if (!game) return;
    try {
      const next = applyAction(game, action);
      set({ game: next, lastError: null });
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  setActiveSeat: (seat) => set({ activeSeat: seat }),

  clearError: () => set({ lastError: null }),
}));

/** The active seat's player view, derived fresh from `game` on every read. */
export function useActivePlayerView(): PlayerView | null {
  const game = useGameStore((s) => s.game);
  const activeSeat = useGameStore((s) => s.activeSeat);
  if (!game) return null;
  const playerId = game.players[activeSeat]?.id;
  if (playerId === undefined) return null;
  return getPlayerView(game, playerId);
}
