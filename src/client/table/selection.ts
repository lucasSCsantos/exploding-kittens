// Pure rules for turning a hand selection into "what should the UI do next" (ticket 11).
// The engine is still the authority on whether a play is actually legal — these just decide
// which overlay (if any) to open, so the dispatch call can gather the missing parameters.

import type { Action } from "../../engine/actions.js";
import type { Card, CardId } from "../../engine/types.js";

export type SinglePlay =
  | { kind: "simple"; toAction: (cardUid: string) => Action }
  | { kind: "target"; toAction: (cardUid: string, target: number) => Action }
  | { kind: "alterFuture" }
  | { kind: "unplayable" };

const SIMPLE_PLAYS: Partial<Record<CardId, (cardUid: string) => Action>> = {
  ATK: (cardUid) => ({ type: "PLAY_ATTACK", cardUid }),
  SKIP: (cardUid) => ({ type: "PLAY_SKIP", cardUid }),
  SHUF: (cardUid) => ({ type: "PLAY_SHUFFLE", cardUid }),
  STF: (cardUid) => ({ type: "PLAY_SEE_FUTURE", cardUid }),
  DFB: (cardUid) => ({ type: "PLAY_DRAW_FROM_BOTTOM", cardUid }),
};

const TARGETED_PLAYS: Partial<Record<CardId, (cardUid: string, target: number) => Action>> = {
  TATK: (cardUid, target) => ({ type: "PLAY_TARGETED_ATTACK", cardUid, target }),
  FAV: (cardUid, target) => ({ type: "PLAY_FAVOR", cardUid, target }),
};

/** What playing a single selected card should do: dispatch right away, or gather more input first. */
export function classifySinglePlay(cardId: CardId): SinglePlay {
  const simple = SIMPLE_PLAYS[cardId];
  if (simple) return { kind: "simple", toAction: simple };

  const targeted = TARGETED_PLAYS[cardId];
  if (targeted) return { kind: "target", toAction: targeted };

  if (cardId === "ATF") return { kind: "alterFuture" };

  return { kind: "unplayable" };
}

export type SelectionShape =
  | { size: 0 }
  | { size: 1; cards: [Card] }
  | { size: 2; cards: [Card, Card] }
  | { size: 3; cards: [Card, Card, Card] }
  | { size: 5; cards: [Card, Card, Card, Card, Card] }
  /** No rule plays 4, 6, 7, or 8+ cards at once — "other" sizes are never playable. */
  | { size: "other"; cards: Card[] };

/** Buckets a hand selection by size — pair/triple/five-different combos are shaped by count alone;
 * the engine decides whether the actual titles make them legal. */
export function classifySelectionShape(cards: Card[]): SelectionShape {
  switch (cards.length) {
    case 0:
      return { size: 0 };
    case 1:
      return { size: 1, cards: [cards[0]!] };
    case 2:
      return { size: 2, cards: [cards[0]!, cards[1]!] };
    case 3:
      return { size: 3, cards: [cards[0]!, cards[1]!, cards[2]!] };
    case 5:
      return { size: 5, cards: [cards[0]!, cards[1]!, cards[2]!, cards[3]!, cards[4]!] };
    default:
      return { size: "other", cards };
  }
}
