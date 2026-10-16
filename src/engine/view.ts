// getPlayerView: the only function allowed to turn full GameState into what one player is
// allowed to see (spec §3).

import type { Card, GameState, KnownDeckEntry, NopePlay, PlayHistoryEntry, Phase } from "./types.js";

export interface PlayerViewPlayer {
  id: string;
  alive: boolean;
  handSize: number;
}

export interface PlayerView {
  /** Index of the requesting player within `players`. */
  you: number;
  players: PlayerViewPlayer[];
  currentPlayer: number;
  turnsRemaining: number;
  deckSize: number;
  discard: Card[];
  /** The requesting player's own hand contents. */
  hand: Card[];
  /** The requesting player's own legitimately-seen deck positions (STF/ATF/own reinsertion), still valid. */
  knownDeck: KnownDeckEntry[];
  pendingAction: GameState["pendingAction"];
  nopeStack: NopePlay[];
  playHistory: PlayHistoryEntry[];
  phase: Phase;
  winner: number | null;
}

export function getPlayerView(state: GameState, playerId: string): PlayerView {
  const you = state.players.findIndex((p) => p.id === playerId);
  if (you === -1) {
    throw new Error(`getPlayerView: no player with id ${playerId}`);
  }
  const viewer = state.players[you]!;

  return {
    you,
    players: state.players.map((p) => ({ id: p.id, alive: p.alive, handSize: p.hand.length })),
    currentPlayer: state.currentPlayer,
    turnsRemaining: state.turnsRemaining,
    deckSize: state.deck.length,
    discard: state.discard,
    hand: viewer.hand,
    knownDeck: viewer.knownDeck.filter((entry) => entry.position < state.deck.length),
    pendingAction: state.pendingAction,
    nopeStack: state.nopeStack,
    playHistory: state.playHistory,
    phase: state.phase,
    winner: state.winner,
  };
}
