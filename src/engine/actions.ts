// applyAction: turn loop (spec §5), Exploding Kitten resolution (spec §6),
// and non-combo, non-Nope action card effects (spec §8).

import { createRng, shuffle } from "./rng.js";
import type { Card, CardId, GameState, Player } from "./types.js";

export type Action =
  | { type: "DRAW" }
  | { type: "DEFUSE_REINSERT"; position: number }
  | { type: "PLAY_ATTACK"; cardUid: string }
  | { type: "PLAY_TARGETED_ATTACK"; cardUid: string; target: number }
  | { type: "PLAY_SKIP"; cardUid: string }
  | { type: "PLAY_FAVOR"; cardUid: string; target: number }
  | { type: "RESOLVE_FAVOR"; cardUid: string }
  | { type: "PLAY_SHUFFLE"; cardUid: string }
  | { type: "PLAY_SEE_FUTURE"; cardUid: string }
  | { type: "PLAY_ALTER_FUTURE"; cardUid: string; order: string[] }
  | { type: "PLAY_DRAW_FROM_BOTTOM"; cardUid: string }
  | { type: "PLAY_CAT"; cardUid: string };

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
    case "PLAY_ATTACK":
      return handlePlayAttack(state, action.cardUid);
    case "PLAY_TARGETED_ATTACK":
      return handlePlayTargetedAttack(state, action.cardUid, action.target);
    case "PLAY_SKIP":
      return handlePlaySkip(state, action.cardUid);
    case "PLAY_FAVOR":
      return handlePlayFavor(state, action.cardUid, action.target);
    case "RESOLVE_FAVOR":
      return handleResolveFavor(state, action.cardUid);
    case "PLAY_SHUFFLE":
      return handlePlayShuffle(state, action.cardUid);
    case "PLAY_SEE_FUTURE":
      return handlePlaySeeFuture(state, action.cardUid);
    case "PLAY_ALTER_FUTURE":
      return handlePlayAlterFuture(state, action.cardUid, action.order);
    case "PLAY_DRAW_FROM_BOTTOM":
      return handlePlayDrawFromBottom(state, action.cardUid);
    case "PLAY_CAT":
      return handlePlayCat();
  }
}

function handleDraw(state: GameState): GameState {
  if (state.phase !== "ACTION") {
    throw new Error(`applyAction: cannot DRAW from phase ${state.phase}`);
  }
  return resolveDraw(state, 0);
}

/** Draws deck[position] (0 = top, per §5; len-1 = bottom, per §8.8) and resolves it. */
function resolveDraw(state: GameState, position: number): GameState {
  if (state.deck.length === 0) {
    throw new Error("applyAction: deck is empty — N-1 kitten invariant broken");
  }

  const drawnCard = state.deck[position]!;
  const restDeck = state.deck.filter((_, i) => i !== position);
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

/**
 * Removes `cardUid` (which must be a `cardId` card) from the current player's
 * hand and moves it to the discard pile. Shared by every action-card play.
 */
function playCardFromHand(
  state: GameState,
  cardId: CardId,
  cardUid: string,
): { state: GameState; card: Card } {
  if (state.phase !== "ACTION") {
    throw new Error(`applyAction: cannot play a card from phase ${state.phase}`);
  }

  const player = state.players[state.currentPlayer]!;
  const index = player.hand.findIndex((c) => c.uid === cardUid);
  if (index === -1) {
    throw new Error(`applyAction: card ${cardUid} is not in the current player's hand`);
  }

  const card = player.hand[index]!;
  if (card.id !== cardId) {
    throw new Error(`applyAction: card ${cardUid} is ${card.id}, expected ${cardId}`);
  }

  const updatedPlayer: Player = { ...player, hand: player.hand.filter((_, i) => i !== index) };
  const players = replacePlayer(state.players, state.currentPlayer, updatedPlayer);

  return { state: { ...state, players, discard: [...state.discard, card] }, card };
}

function requireAliveOpponent(state: GameState, target: number): void {
  if (target === state.currentPlayer) {
    throw new Error("applyAction: cannot target yourself");
  }
  const targetPlayer = state.players[target];
  if (!targetPlayer || !targetPlayer.alive) {
    throw new Error(`applyAction: target ${target} is not an alive player`);
  }
}

/** §8.1/§8.2: ends the turn immediately (no draw) and hands turns to `nextIndex`. */
function resolveAttack(state: GameState, nextIndex: number): GameState {
  const wasUnderAttack = state.turnsRemaining > 1;
  const turnsForNext =
    state.config.attackStacking && wasUnderAttack ? state.turnsRemaining - 1 + 2 : 2;

  return { ...state, currentPlayer: nextIndex, turnsRemaining: turnsForNext, phase: "ACTION" };
}

function handlePlayAttack(state: GameState, cardUid: string): GameState {
  const { state: afterPlay } = playCardFromHand(state, "ATK", cardUid);
  const nextIndex = nextAlivePlayerIndex(afterPlay.players, afterPlay.currentPlayer);
  return resolveAttack(afterPlay, nextIndex);
}

function handlePlayTargetedAttack(state: GameState, cardUid: string, target: number): GameState {
  requireAliveOpponent(state, target);
  const { state: afterPlay } = playCardFromHand(state, "TATK", cardUid);
  return resolveAttack(afterPlay, target);
}

/** §8.3: decrementing turns_remaining and re-granting/advancing is exactly endTurn's job. */
function handlePlaySkip(state: GameState, cardUid: string): GameState {
  const { state: afterPlay } = playCardFromHand(state, "SKIP", cardUid);
  return endTurn(afterPlay);
}

function handlePlayFavor(state: GameState, cardUid: string, target: number): GameState {
  requireAliveOpponent(state, target);
  const { state: afterPlay } = playCardFromHand(state, "FAV", cardUid);

  const targetPlayer = afterPlay.players[target]!;
  if (targetPlayer.hand.length === 0) {
    return afterPlay;
  }

  return {
    ...afterPlay,
    pendingAction: { type: "FAVOR", from: afterPlay.currentPlayer, target },
    phase: "FAVOR_RESOLVE",
  };
}

/** The Favor target gives the card of their own choosing (§8.4). */
function handleResolveFavor(state: GameState, cardUid: string): GameState {
  if (state.phase !== "FAVOR_RESOLVE" || state.pendingAction?.type !== "FAVOR") {
    throw new Error("applyAction: no pending Favor to resolve");
  }
  const { from, target } = state.pendingAction;

  const targetPlayer = state.players[target]!;
  const index = targetPlayer.hand.findIndex((c) => c.uid === cardUid);
  if (index === -1) {
    throw new Error(`applyAction: card ${cardUid} is not in the Favor target's hand`);
  }
  const card = targetPlayer.hand[index]!;

  let players = replacePlayer(state.players, target, {
    ...targetPlayer,
    hand: targetPlayer.hand.filter((_, i) => i !== index),
  });
  const fromPlayer = players[from]!;
  players = replacePlayer(players, from, { ...fromPlayer, hand: [...fromPlayer.hand, card] });

  return { ...state, players, pendingAction: null, phase: "ACTION" };
}

/** §8.5: reshuffles the deck and invalidates every player's known_deck. */
function handlePlayShuffle(state: GameState, cardUid: string): GameState {
  const { state: afterPlay } = playCardFromHand(state, "SHUF", cardUid);

  const rng = createRng(afterPlay.rngState);
  const deck = shuffle(afterPlay.deck, rng);
  const players = afterPlay.players.map((p) => ({ ...p, knownDeck: [] }));

  return { ...afterPlay, deck, players, rngState: rng.getState() };
}

/** §8.6: views deck[0..2] without changing order; only the acting player learns it. */
function handlePlaySeeFuture(state: GameState, cardUid: string): GameState {
  const { state: afterPlay } = playCardFromHand(state, "STF", cardUid);
  return { ...afterPlay, players: withKnownTop(afterPlay.players, afterPlay.currentPlayer, afterPlay.deck) };
}

/** §8.7: views and arbitrarily reorders deck[0..2]; deck size is unchanged. */
function handlePlayAlterFuture(state: GameState, cardUid: string, order: string[]): GameState {
  const { state: afterPlay } = playCardFromHand(state, "ATF", cardUid);

  const viewCount = Math.min(3, afterPlay.deck.length);
  const viewed = afterPlay.deck.slice(0, viewCount);
  const viewedUids = new Set(viewed.map((c) => c.uid));

  if (order.length !== viewCount || !order.every((uid) => viewedUids.has(uid))) {
    throw new Error("applyAction: ALTER_FUTURE order must be a permutation of the viewed cards");
  }

  const reordered = order.map((uid) => viewed.find((c) => c.uid === uid)!);
  const deck = [...reordered, ...afterPlay.deck.slice(viewCount)];

  return { ...afterPlay, deck, players: withKnownTop(afterPlay.players, afterPlay.currentPlayer, deck) };
}

/** Refreshes knowledge of deck[0..viewCount) while keeping other known positions (e.g. a tracked reinsertion) intact. */
function withKnownTop(players: Player[], playerIndex: number, deck: Card[]): Player[] {
  const viewCount = Math.min(3, deck.length);
  const topEntries = deck.slice(0, viewCount).map((card, position) => ({ position, card }));
  const player = players[playerIndex]!;
  const otherEntries = player.knownDeck.filter((e) => e.position >= viewCount);
  return replacePlayer(players, playerIndex, { ...player, knownDeck: [...topEntries, ...otherEntries] });
}

/** §8.8: ends the turn by drawing deck[len-1] instead of the top card. */
function handlePlayDrawFromBottom(state: GameState, cardUid: string): GameState {
  const { state: afterPlay } = playCardFromHand(state, "DFB", cardUid);
  return resolveDraw(afterPlay, afterPlay.deck.length - 1);
}

/** §8.9: cat cards (incl. Feral Cat) have no standalone effect — combos land in ticket 07. */
function handlePlayCat(): never {
  throw new Error("applyAction: cat cards cannot be played standalone, only as part of a combo");
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
  if (state.phase !== "DEFUSE_REINSERT" || state.pendingAction?.type !== "DEFUSE_REINSERT") {
    throw new Error("applyAction: no pending defuse reinsertion");
  }
  if (position < 0 || position > state.deck.length) {
    throw new Error(
      `applyAction: reinsertion position ${position} out of range [0, ${state.deck.length}]`,
    );
  }

  const { kitten } = state.pendingAction;
  const deck = [...state.deck.slice(0, position), kitten, ...state.deck.slice(position)];

  // §12: the defuser privately tracks where they reinserted the kitten.
  const defuser = state.players[state.currentPlayer]!;
  const players = replacePlayer(state.players, state.currentPlayer, {
    ...defuser,
    knownDeck: [...defuser.knownDeck, { position, card: kitten }],
  });

  return endTurn({ ...state, deck, players, pendingAction: null });
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
