// Deck-tier composition tables, as pure data — see spec §2.1.

import type { Card, CardId, CatBreakdown, CatCardId, DeckTier } from "./types.js";

type NonCatCardId = Exclude<CardId, CatCardId | "EK">;

export const CAT_CARD_IDS: CatCardId[] = [
  "CAT_TACOCAT",
  "CAT_HAIRYPOTATO",
  "CAT_RAINBOW",
  "CAT_BEARD",
  "CAT_CATTERMELON",
];

/** Per-tier counts of every non-cat, non-EK card type (§2.1 table). */
export const DECK_COMPOSITION: Record<DeckTier, Record<NonCatCardId, number>> = {
  "paw-print": {
    DEF: 3,
    NOPE: 5,
    ATK: 4,
    TATK: 0,
    SKIP: 4,
    FAV: 2,
    SHUF: 2,
    STF: 4,
    ATF: 0,
    DFB: 4,
    FERAL: 2,
  },
  standard: {
    DEF: 7,
    NOPE: 5,
    ATK: 4,
    TATK: 3,
    SKIP: 6,
    FAV: 4,
    SHUF: 4,
    STF: 4,
    ATF: 6,
    DFB: 4,
    FERAL: 4,
  },
  combined: {
    DEF: 10,
    NOPE: 10,
    ATK: 8,
    TATK: 3,
    SKIP: 10,
    FAV: 6,
    SHUF: 6,
    STF: 8,
    ATF: 6,
    DFB: 8,
    FERAL: 6,
  },
};

/**
 * §2.1 CONFIG cat_breakdown: real per-box counts are unconfirmed, so cats are
 * split as evenly as possible with the remainder assigned in listed order.
 * Overridable once the physical counts are known (ticket 18) — setup reads
 * this table rather than hard-coding counts.
 */
export const CAT_BREAKDOWN: CatBreakdown = {
  "paw-print": {
    CAT_TACOCAT: 3,
    CAT_HAIRYPOTATO: 3,
    CAT_RAINBOW: 3,
    CAT_BEARD: 3,
    CAT_CATTERMELON: 2,
  },
  standard: {
    CAT_TACOCAT: 4,
    CAT_HAIRYPOTATO: 4,
    CAT_RAINBOW: 4,
    CAT_BEARD: 4,
    CAT_CATTERMELON: 4,
  },
  combined: {
    CAT_TACOCAT: 7,
    CAT_HAIRYPOTATO: 7,
    CAT_RAINBOW: 7,
    CAT_BEARD: 7,
    CAT_CATTERMELON: 6,
  },
};

export function deckTierForPlayerCount(n: number): DeckTier {
  if (n < 2 || n > 10) {
    throw new Error(`deckTierForPlayerCount: player count must be 2-10, got ${n}`);
  }
  if (n <= 3) return "paw-print";
  if (n <= 7) return "standard";
  return "combined";
}

export function totalDefuseCount(tier: DeckTier): number {
  return DECK_COMPOSITION[tier].DEF;
}

export function makeCard(id: CardId): Card {
  return { id, uid: crypto.randomUUID() };
}

/**
 * Builds the tier's base deck per §2.1: every non-cat card type plus the cat
 * breakdown. Excludes EK (inserted separately per §4 step 7) but includes DEF
 * (removed from the deck by setup's step 3, then redealt/reinserted).
 */
export function buildBaseDeck(tier: DeckTier): Card[] {
  const cards: Card[] = [];

  for (const [id, count] of Object.entries(DECK_COMPOSITION[tier]) as [NonCatCardId, number][]) {
    for (let i = 0; i < count; i++) {
      cards.push(makeCard(id));
    }
  }

  for (const catId of CAT_CARD_IDS) {
    const count = CAT_BREAKDOWN[tier][catId];
    for (let i = 0; i < count; i++) {
      cards.push(makeCard(catId));
    }
  }

  return cards;
}
