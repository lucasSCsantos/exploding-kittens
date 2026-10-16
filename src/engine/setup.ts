// createGame: pure setup procedure per spec §4.

import { buildBaseDeck, CAT_BREAKDOWN, deckTierForPlayerCount, makeCard, totalDefuseCount } from "./decks.js";
import { createRng, shuffle } from "./rng.js";
import type { Card, Config, GameState, Player } from "./types.js";

export type SetupConfig = Partial<Omit<Config, "deckTier" | "catBreakdown">> & {
  /** Seeds the shuffle RNG; omit for a fresh random game. */
  seed?: number;
};

export function createGame(playerNames: string[], configInput: SetupConfig = {}): GameState {
  const n = playerNames.length;
  if (n < 2 || n > 10) {
    throw new Error(`createGame: player count must be 2-10, got ${n}`);
  }

  const tier = deckTierForPlayerCount(n);
  const rng = createRng(configInput.seed ?? Date.now());

  const config: Config = {
    attackStacking: configInput.attackStacking ?? true,
    comboScope: configInput.comboScope ?? "cats-only",
    feralPairRule: configInput.feralPairRule ?? "requires-real-cat",
    extraDefuses: configInput.extraDefuses ?? "default",
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
