// applyAction: turn loop (spec §5), Exploding Kitten resolution (spec §6),
// Nope reaction stack (spec §7), and non-combo action card effects (spec §8).

import { CAT_CARD_IDS } from "./decks.js";
import { createRng, shuffle } from "./rng.js";
import type {
  Card,
  CardId,
  Config,
  GameState,
  NopeableEffect,
  PendingNopeableAction,
  Player,
} from "./types.js";

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
  | { type: "PLAY_CAT"; cardUid: string }
  | { type: "PLAY_PAIR"; cardUids: [string, string]; target: number }
  | { type: "PLAY_TRIPLE"; cardUids: [string, string, string]; target: number; namedCard: CardId }
  | {
      type: "PLAY_FIVE_DIFFERENT";
      cardUids: [string, string, string, string, string];
      discardUid: string;
    }
  | { type: "PLAY_NOPE"; player: number; cardUid: string }
  | { type: "PASS_NOPE_WINDOW" };

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
    case "PLAY_PAIR":
      return handlePlayPair(state, action.cardUids, action.target);
    case "PLAY_TRIPLE":
      return handlePlayTriple(state, action.cardUids, action.target, action.namedCard);
    case "PLAY_FIVE_DIFFERENT":
      return handlePlayFiveDifferent(state, action.cardUids, action.discardUid);
    case "PLAY_NOPE":
      return handlePlayNope(state, action.player, action.cardUid);
    case "PASS_NOPE_WINDOW":
      return handlePassNopeWindow(state);
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

/** Moves `players[from].hand[cardIndex]` into `players[to]`'s hand. */
function transferCard(players: Player[], from: number, cardIndex: number, to: number): Player[] {
  const fromPlayer = players[from]!;
  const card = fromPlayer.hand[cardIndex]!;
  let updated = replacePlayer(players, from, {
    ...fromPlayer,
    hand: fromPlayer.hand.filter((_, i) => i !== cardIndex),
  });
  const toPlayer = updated[to]!;
  updated = replacePlayer(updated, to, { ...toPlayer, hand: [...toPlayer.hand, card] });
  return updated;
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

/** §7: moves the played card to discard and opens a Nope window instead of resolving immediately. */
function openNopeWindow(state: GameState, effect: NopeableEffect): GameState {
  return {
    ...state,
    pendingAction: { type: "NOPEABLE", player: state.currentPlayer, effect },
    nopeStack: [],
    phase: "NOPE_WINDOW",
  };
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
  return openNopeWindow(afterPlay, { kind: "ATTACK" });
}

function handlePlayTargetedAttack(state: GameState, cardUid: string, target: number): GameState {
  requireAliveOpponent(state, target);
  const { state: afterPlay } = playCardFromHand(state, "TATK", cardUid);
  return openNopeWindow(afterPlay, { kind: "TARGETED_ATTACK", target });
}

/** §8.3: decrementing turns_remaining and re-granting/advancing is exactly endTurn's job. */
function handlePlaySkip(state: GameState, cardUid: string): GameState {
  const { state: afterPlay } = playCardFromHand(state, "SKIP", cardUid);
  return openNopeWindow(afterPlay, { kind: "SKIP" });
}

function handlePlayFavor(state: GameState, cardUid: string, target: number): GameState {
  requireAliveOpponent(state, target);
  const { state: afterPlay } = playCardFromHand(state, "FAV", cardUid);
  return openNopeWindow(afterPlay, { kind: "FAVOR", target });
}

/** The Favor effect itself (§8.4), applied once the Nope window on it closes without cancellation. */
function resolveFavorEffect(state: GameState, from: number, target: number): GameState {
  const targetPlayer = state.players[target]!;
  if (targetPlayer.hand.length === 0) {
    return { ...state, phase: "ACTION" };
  }

  return {
    ...state,
    pendingAction: { type: "FAVOR", from, target },
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
  const players = transferCard(state.players, target, index, from);

  return { ...state, players, pendingAction: null, phase: "ACTION" };
}

/** §8.5: reshuffles the deck and invalidates every player's known_deck. */
function handlePlayShuffle(state: GameState, cardUid: string): GameState {
  const { state: afterPlay } = playCardFromHand(state, "SHUF", cardUid);
  return openNopeWindow(afterPlay, { kind: "SHUFFLE" });
}

function resolveShuffleEffect(state: GameState): GameState {
  const rng = createRng(state.rngState);
  const deck = shuffle(state.deck, rng);
  const players = state.players.map((p) => ({ ...p, knownDeck: [] }));

  return { ...state, deck, players, rngState: rng.getState(), phase: "ACTION" };
}

/** §8.6: views deck[0..2] without changing order; only the acting player learns it. */
function handlePlaySeeFuture(state: GameState, cardUid: string): GameState {
  const { state: afterPlay } = playCardFromHand(state, "STF", cardUid);
  return openNopeWindow(afterPlay, { kind: "SEE_FUTURE" });
}

function resolveSeeFutureEffect(state: GameState, player: number): GameState {
  return { ...state, players: withKnownTop(state.players, player, state.deck), phase: "ACTION" };
}

/** §8.7: views and arbitrarily reorders deck[0..2]; deck size is unchanged. */
function handlePlayAlterFuture(state: GameState, cardUid: string, order: string[]): GameState {
  const { state: afterPlay } = playCardFromHand(state, "ATF", cardUid);

  const viewCount = Math.min(3, afterPlay.deck.length);
  const viewedUids = new Set(afterPlay.deck.slice(0, viewCount).map((c) => c.uid));
  if (order.length !== viewCount || !order.every((uid) => viewedUids.has(uid))) {
    throw new Error("applyAction: ALTER_FUTURE order must be a permutation of the viewed cards");
  }

  return openNopeWindow(afterPlay, { kind: "ALTER_FUTURE", order });
}

function resolveAlterFutureEffect(state: GameState, player: number, order: string[]): GameState {
  const viewCount = order.length;
  const viewed = state.deck.slice(0, viewCount);
  const reordered = order.map((uid) => viewed.find((c) => c.uid === uid)!);
  const deck = [...reordered, ...state.deck.slice(viewCount)];

  return {
    ...state,
    deck,
    players: withKnownTop(state.players, player, deck),
    phase: "ACTION",
  };
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
  return openNopeWindow(afterPlay, { kind: "DRAW_FROM_BOTTOM" });
}

/** §8.9: cat cards (incl. Feral Cat) have no standalone effect — only as part of a combo (§9). */
function handlePlayCat(): never {
  throw new Error("applyAction: cat cards cannot be played standalone, only as part of a combo");
}

function isCatFamily(id: CardId): boolean {
  return id === "FERAL" || CAT_CARD_IDS.includes(id as (typeof CAT_CARD_IDS)[number]);
}

/** Reads `cardUids`' ids from the current player's hand without removing them, for pre-validation. */
function requireHandCardIds(state: GameState, cardUids: readonly string[]): CardId[] {
  if (state.phase !== "ACTION") {
    throw new Error(`applyAction: cannot play a combo from phase ${state.phase}`);
  }
  if (new Set(cardUids).size !== cardUids.length) {
    throw new Error("applyAction: a combo cannot reuse the same card twice");
  }
  const player = state.players[state.currentPlayer]!;
  return cardUids.map((uid) => {
    const found = player.hand.find((c) => c.uid === uid);
    if (!found) throw new Error(`applyAction: card ${uid} is not in the current player's hand`);
    return found.id;
  });
}

/**
 * §9: pair/triple require matching titles, with Feral Cat standing in for any cat card.
 * `comboScope=cats-only` (default) further requires the matched title to be a cat card.
 */
function requireComboTitle(config: Config, ids: CardId[], comboName: string): void {
  const nonFeral = ids.filter((id) => id !== "FERAL");
  const sameTitle = nonFeral.length === 0 || nonFeral.every((id) => id === nonFeral[0]);
  if (!sameTitle) {
    throw new Error(`applyAction: ${comboName} combo requires cards with a matching title`);
  }
  if (config.comboScope === "cats-only") {
    const isCatCombo = nonFeral.length === 0 || isCatFamily(nonFeral[0]!);
    if (!isCatCombo) {
      throw new Error(
        `applyAction: ${comboName} combo requires cat cards under comboScope=cats-only`,
      );
    }
  }
}

/** §9: Feral Cats alone (no real cat among them) form a valid pair/triple only when `feralPairRule=allowed`. */
function requireFeralComboRule(config: Config, ids: CardId[], comboName: string): void {
  if (ids.every((id) => id === "FERAL") && config.feralPairRule === "requires-real-cat") {
    throw new Error(`applyAction: Feral Cats alone do not form a valid ${comboName}`);
  }
}

/** Removes `cardUids` (already validated) from the current player's hand and discards them. */
function takeCardsFromHand(state: GameState, cardUids: readonly string[]): GameState {
  const player = state.players[state.currentPlayer]!;
  const uidSet = new Set(cardUids);
  const takenCards = player.hand.filter((c) => uidSet.has(c.uid));
  const updatedPlayer: Player = { ...player, hand: player.hand.filter((c) => !uidSet.has(c.uid)) };
  const players = replacePlayer(state.players, state.currentPlayer, updatedPlayer);
  return { ...state, players, discard: [...state.discard, ...takenCards] };
}

/** §9 Pair: 2 same-title cards → take a random card from an alive opponent's hand. */
function handlePlayPair(state: GameState, cardUids: [string, string], target: number): GameState {
  requireAliveOpponent(state, target);
  const ids = requireHandCardIds(state, cardUids);
  requireComboTitle(state.config, ids, "pair");
  requireFeralComboRule(state.config, ids, "pair");

  const afterPlay = takeCardsFromHand(state, cardUids);
  return openNopeWindow(afterPlay, { kind: "PAIR", target });
}

/** The Pair effect itself (§9): a blind, seeded-RNG draw from the target's hand. */
function resolvePairEffect(state: GameState, player: number, target: number): GameState {
  const targetPlayer = state.players[target]!;
  if (targetPlayer.hand.length === 0) {
    return { ...state, phase: "ACTION" };
  }

  const rng = createRng(state.rngState);
  const index = Math.floor(rng.next() * targetPlayer.hand.length);
  const players = transferCard(state.players, target, index, player);

  return { ...state, players, rngState: rng.getState(), phase: "ACTION" };
}

/** §9 Triple: 3 same-title cards → name a card type the target must give up, if they have it. */
function handlePlayTriple(
  state: GameState,
  cardUids: [string, string, string],
  target: number,
  namedCard: CardId,
): GameState {
  requireAliveOpponent(state, target);
  const ids = requireHandCardIds(state, cardUids);
  requireComboTitle(state.config, ids, "triple");
  requireFeralComboRule(state.config, ids, "triple");

  const afterPlay = takeCardsFromHand(state, cardUids);
  return openNopeWindow(afterPlay, { kind: "TRIPLE", target, namedCard });
}

/** The Triple effect itself (§9): give up the named type if held, otherwise no-op. */
function resolveTripleEffect(
  state: GameState,
  player: number,
  target: number,
  namedCard: CardId,
): GameState {
  const targetPlayer = state.players[target]!;
  const index = targetPlayer.hand.findIndex((c) => c.id === namedCard);
  if (index === -1) {
    return { ...state, phase: "ACTION" };
  }
  const players = transferCard(state.players, target, index, player);

  return { ...state, players, phase: "ACTION" };
}

/** §9 Five different: 5 differently-titled cards → take any chosen card from the discard pile. */
function handlePlayFiveDifferent(
  state: GameState,
  cardUids: [string, string, string, string, string],
  discardUid: string,
): GameState {
  const ids = requireHandCardIds(state, cardUids);
  if (new Set(ids).size !== 5) {
    throw new Error("applyAction: five-different combo requires 5 differently-titled cards");
  }
  if (!state.discard.some((c) => c.uid === discardUid)) {
    throw new Error(`applyAction: card ${discardUid} is not in the discard pile`);
  }

  const afterPlay = takeCardsFromHand(state, cardUids);
  return openNopeWindow(afterPlay, { kind: "FIVE_DIFFERENT", discardUid });
}

/** The Five different effect itself (§9): pulls the chosen card out of the discard pile. */
function resolveFiveDifferentEffect(state: GameState, player: number, discardUid: string): GameState {
  const index = state.discard.findIndex((c) => c.uid === discardUid);
  if (index === -1) {
    throw new Error(`applyAction: card ${discardUid} is no longer in the discard pile`);
  }
  const card = state.discard[index]!;
  const discard = state.discard.filter((_, i) => i !== index);

  const taker = state.players[player]!;
  const players = replacePlayer(state.players, player, { ...taker, hand: [...taker.hand, card] });

  return { ...state, players, discard, phase: "ACTION" };
}

/** Applies a previously-opened Nope window's effect once it resolves without being cancelled (§7). */
function resolveNopeableEffect(state: GameState, player: number, effect: NopeableEffect): GameState {
  switch (effect.kind) {
    case "ATTACK":
      return resolveAttack(state, nextAlivePlayerIndex(state.players, player));
    case "TARGETED_ATTACK":
      return resolveAttack(state, effect.target);
    case "SKIP":
      return endTurn(state);
    case "FAVOR":
      return resolveFavorEffect(state, player, effect.target);
    case "SHUFFLE":
      return resolveShuffleEffect(state);
    case "SEE_FUTURE":
      return resolveSeeFutureEffect(state, player);
    case "ALTER_FUTURE":
      return resolveAlterFutureEffect(state, player, effect.order);
    case "DRAW_FROM_BOTTOM":
      return resolveDraw(state, state.deck.length - 1);
    case "PAIR":
      return resolvePairEffect(state, player, effect.target);
    case "TRIPLE":
      return resolveTripleEffect(state, player, effect.target, effect.namedCard);
    case "FIVE_DIFFERENT":
      return resolveFiveDifferentEffect(state, player, effect.discardUid);
  }
}

/** Narrows to the open Nope window's pending action, throwing if none is open. */
function requireNopeWindow(state: GameState): PendingNopeableAction {
  if (state.phase !== "NOPE_WINDOW" || state.pendingAction?.type !== "NOPEABLE") {
    throw new Error("applyAction: no Nope window is open");
  }
  return state.pendingAction;
}

/** §7: any alive player, including the one who played the pending card, may play NOPE while the window is open. */
function handlePlayNope(state: GameState, playerIndex: number, cardUid: string): GameState {
  requireNopeWindow(state);

  const player = state.players[playerIndex];
  if (!player || !player.alive) {
    throw new Error(`applyAction: player ${playerIndex} cannot play Nope`);
  }

  const index = player.hand.findIndex((c) => c.uid === cardUid);
  if (index === -1) {
    throw new Error(`applyAction: card ${cardUid} is not in player ${playerIndex}'s hand`);
  }
  const card = player.hand[index]!;
  if (card.id !== "NOPE") {
    throw new Error(`applyAction: card ${cardUid} is ${card.id}, expected NOPE`);
  }

  const updatedPlayer: Player = { ...player, hand: player.hand.filter((_, i) => i !== index) };
  const players = replacePlayer(state.players, playerIndex, updatedPlayer);

  return {
    ...state,
    players,
    discard: [...state.discard, card],
    nopeStack: [...state.nopeStack, { player: playerIndex }],
  };
}

/** §7: closes the Nope window — odd nopeStack cancels the pending action, even lets it resolve. */
function handlePassNopeWindow(state: GameState): GameState {
  const { player, effect } = requireNopeWindow(state);
  const cancelled = state.nopeStack.length % 2 === 1;
  const cleared = {
    ...state,
    pendingAction: null,
    nopeStack: [],
    playHistory: [...state.playHistory, { player, effect, noped: cancelled }],
  };

  if (cancelled) {
    return { ...cleared, phase: "ACTION" };
  }
  return resolveNopeableEffect(cleared, player, effect);
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
