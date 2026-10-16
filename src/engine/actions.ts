// applyAction: turn loop (spec §5) and Exploding Kitten resolution (spec §6).

import type { Card, CardId, GameState, Player } from "./types.js";

export type Action = { type: "DRAW" } | { type: "DEFUSE_REINSERT"; position: number };

/** EK and DEF can never be Noped (§6). */
export function canBeNoped(cardId: CardId): boolean {
  return cardId !== "EK" && cardId !== "DEF";
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.phase === "GAME_OVER") {
    throw new Error("applyAction: game is already over");
  }

  switch (action.type) {
    case "DRAW":
      return handleDraw(state);
    case "DEFUSE_REINSERT":
      return handleDefuseReinsert(state, action.position);
  }
}

function handleDraw(state: GameState): GameState {
  if (state.phase !== "ACTION") {
    throw new Error(`applyAction: cannot DRAW from phase ${state.phase}`);
  }
  if (state.deck.length === 0) {
    throw new Error("applyAction: deck is empty — N-1 kitten invariant broken");
  }

  const drawnCard = state.deck[0]!;
  const restDeck = state.deck.slice(1);
  const player = state.players[state.currentPlayer]!;

  if (drawnCard.id === "EK") {
    return resolveExplodingKitten({ ...state, deck: restDeck }, drawnCard, player);
  }

  const players = replacePlayer(state.players, state.currentPlayer, {
    ...player,
    hand: [...player.hand, drawnCard],
  });

  return endTurn({ ...state, players, deck: restDeck });
}

function resolveExplodingKitten(state: GameState, kitten: Card, player: Player): GameState {
  const defuseIndex = player.hand.findIndex((c) => c.id === "DEF");

  if (defuseIndex === -1) {
    return eliminatePlayer(state, kitten, player);
  }

  const defuse = player.hand[defuseIndex]!;
  const updatedPlayer: Player = {
    ...player,
    hand: player.hand.filter((_, i) => i !== defuseIndex),
  };
  const players = replacePlayer(state.players, state.currentPlayer, updatedPlayer);

  return {
    ...state,
    players,
    discard: [...state.discard, defuse],
    pendingAction: { type: "DEFUSE_REINSERT", kitten },
    phase: "DEFUSE_REINSERT",
  };
}

function eliminatePlayer(state: GameState, kitten: Card, player: Player): GameState {
  const eliminated: Player = { ...player, alive: false, hand: [] };
  const players = replacePlayer(state.players, state.currentPlayer, eliminated);
  const discard = [...state.discard, ...player.hand];
  const explodedKittens = [...state.explodedKittens, kitten];

  const aliveCount = players.filter((p) => p.alive).length;
  if (aliveCount === 1) {
    const winner = players.findIndex((p) => p.alive);
    return { ...state, players, discard, explodedKittens, phase: "GAME_OVER", winner };
  }
  if (aliveCount === 0) {
    throw new Error("applyAction: all players eliminated, no winner — invalid game state");
  }

  const nextIndex = nextAlivePlayerIndex(players, state.currentPlayer);
  return {
    ...state,
    players,
    discard,
    explodedKittens,
    currentPlayer: nextIndex,
    turnsRemaining: 1,
    phase: "ACTION",
  };
}

function handleDefuseReinsert(state: GameState, position: number): GameState {
  if (state.phase !== "DEFUSE_REINSERT" || !state.pendingAction) {
    throw new Error("applyAction: no pending defuse reinsertion");
  }
  if (position < 0 || position > state.deck.length) {
    throw new Error(
      `applyAction: reinsertion position ${position} out of range [0, ${state.deck.length}]`,
    );
  }

  const { kitten } = state.pendingAction;
  const deck = [...state.deck.slice(0, position), kitten, ...state.deck.slice(position)];

  return endTurn({ ...state, deck, pendingAction: null });
}

/** §5 END_TURN: decrement turns_remaining; re-grant or advance to the next alive player. */
function endTurn(state: GameState): GameState {
  const turnsRemaining = state.turnsRemaining - 1;

  if (turnsRemaining > 0) {
    return { ...state, turnsRemaining, phase: "ACTION" };
  }

  const nextIndex = nextAlivePlayerIndex(state.players, state.currentPlayer);
  return { ...state, currentPlayer: nextIndex, turnsRemaining: 1, phase: "ACTION" };
}

function nextAlivePlayerIndex(players: Player[], from: number): number {
  for (let offset = 1; offset <= players.length; offset++) {
    const index = (from + offset) % players.length;
    if (players[index]!.alive) return index;
  }
  throw new Error("nextAlivePlayerIndex: no alive players remain");
}

function replacePlayer(players: Player[], index: number, player: Player): Player[] {
  return players.map((p, i) => (i === index ? player : p));
}
