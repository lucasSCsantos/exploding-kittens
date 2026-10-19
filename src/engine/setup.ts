// createGame: pure setup procedure per spec §4.

import { buildBaseDeck, CAT_BREAKDOWN, deckTierForPlayerCount, makeCard, totalDefuseCount } from "./decks.js";
import { createRng, shuffle } from "./rng.js";
import type { Card, Config, GameState, Player } from "./types.js";

export type SetupConfig = Partial<Omit<Config, "deckTier" | "catBreakdown">> & {
  /** Seeds the shuffle RNG; omit for a fresh random game. */
  seed?: number;
};

/** The host-controllable subset of CONFIG (ticket 14, spec §14) — everything else (deckTier,
 * catBreakdown) is derived from player count, never a lobby choice. Shared between the server
 * (which owns the lobby's pending settings) and the client (which renders/edits them). */
export type LobbyConfig = Pick<
  Config,
  "attackStacking" | "comboScope" | "feralPairRule" | "extraDefuses"
>;

/** `createGame`'s own defaults (see below), duplicated here as data so the server (room's
 * initial lobby settings) and client (initial store state, before any `lobby` event arrives)
 * can both start from the same values without hand-copying them. */
export const DEFAULT_LOBBY_CONFIG: LobbyConfig = {
  attackStacking: true,
  comboScope: "cats-only",
  feralPairRule: "requires-real-cat",
  extraDefuses: "default",
};

export function createGame(playerNames: string[], configInput: SetupConfig = {}): GameState {
  const n = playerNames.length;
  if (n < 2 || n > 10) {
    throw new Error(`createGame: player count must be 2-10, got ${n}`);
  }

  const tier = deckTierForPlayerCount(n);
  const rng = createRng(configInput.seed ?? Date.now());

  const config: Config = {
    attackStacking: configInput.attackStacking ?? DEFAULT_LOBBY_CONFIG.attackStacking,
    comboScope: configInput.comboScope ?? DEFAULT_LOBBY_CONFIG.comboScope,
    feralPairRule: configInput.feralPairRule ?? DEFAULT_LOBBY_CONFIG.feralPairRule,
    extraDefuses: configInput.extraDefuses ?? DEFAULT_LOBBY_CONFIG.extraDefuses,
    deckTier: tier,
    catBreakdown: CAT_BREAKDOWN,
  };

  // Step 2-3: select base deck, remove all DEF.
  const baseDeck = buildBaseDeck(tier);
  const defuses = baseDeck.filter((card) => card.id === "DEF");
  let drawPile = baseDeck.filter((card) => card.id !== "DEF");

  // Step 4: shuffle the remaining cards.
  drawPile = shuffle(drawPile, rng);

  // Step 5-6: deal 7 cards + 1 DEF to each player.
  const players: Player[] = [];
  let dealt = 0;
  for (const name of playerNames) {
    const hand: Card[] = drawPile.slice(dealt, dealt + 7);
    dealt += 7;
    const defuse = defuses.pop();
    if (!defuse) {
      throw new Error(
        `createGame: ${tier} tier has only ${totalDefuseCount(tier)} DEF for ${n} players`,
      );
    }
    hand.push(defuse);
    players.push({ id: name, hand, alive: true, knownDeck: [] });
  }
  drawPile = drawPile.slice(dealt);

  // Step 7: insert N-1 EK.
  const kittens = Array.from({ length: n - 1 }, () => makeCard("EK"));

  // Step 8: insert extra DEF (default: all remaining DEF).
  const extraDefuseCount =
    config.extraDefuses === "default"
      ? defuses.length
      : Math.min(config.extraDefuses, defuses.length);
  const extraDefuses = defuses.slice(0, extraDefuseCount);

  // Step 9: shuffle the deck.
  const deck = shuffle([...drawPile, ...kittens, ...extraDefuses], rng);

  // Step 10: choose a starting player.
  const currentPlayer = Math.floor(rng.next() * n);

  return {
    players,
    currentPlayer,
    turnsRemaining: 1,
    deck,
    discard: [],
    pendingAction: null,
    nopeStack: [],
    explodedKittens: [],
    phase: "SETUP",
    winner: null,
    config,
    rngState: rng.getState(),
    playHistory: [],
  };
}
