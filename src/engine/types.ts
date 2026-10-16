// Card and game-state types per docs/exploding-kittens-party-pack-ai-spec.md §2, §3.

export type CatCardId =
  | "CAT_TACOCAT"
  | "CAT_HAIRYPOTATO"
  | "CAT_RAINBOW"
  | "CAT_BEARD"
  | "CAT_CATTERMELON";

export type ActionCardId =
  | "NOPE"
  | "ATK"
  | "TATK"
  | "SKIP"
  | "FAV"
  | "SHUF"
  | "STF"
  | "ATF"
  | "DFB";

export type CardId = "EK" | "DEF" | ActionCardId | CatCardId | "FERAL";

export interface Card {
  id: CardId;
  /** Unique per card instance, so duplicate titles (e.g. two NOPEs) can be told apart in state. */
  uid: string;
}

export type DeckTier = "paw-print" | "standard" | "combined";

/** §2.1: by-box per-type cat counts, pending real per-box confirmation (ticket 18). */
export type CatBreakdown = Record<DeckTier, Record<CatCardId, number>>;

/** Table-decision parameters called out as CONFIG in the spec (§14). */
export interface Config {
  /** default: stacking (modern rules) — see §8.1 */
  attackStacking: boolean;
  /** default: only cat cards (+ Feral) combo — see §9 */
  comboScope: "cats-only" | "any-matching";
  /** default: two Feral Cats alone do not form a pair — see §9 */
  feralPairRule: "requires-real-cat" | "allowed";
  /** default: insert all remaining DEF (total_DEF_in_tier - N) — see §4 step 8 */
  extraDefuses: number | "default";
  /** fully determined by player count (§2.1), not a free table choice */
  deckTier: DeckTier;
  catBreakdown: CatBreakdown;
}

/** Knowledge a single player has legitimately gained about deck positions (STF/ATF/own reinsertion). */
export interface KnownDeckEntry {
  position: number;
  card: Card;
}

export interface Player {
  id: string;
  hand: Card[];
  alive: boolean;
  knownDeck: KnownDeckEntry[];
}

export type Phase =
  | "SETUP"
  | "ACTION"
  | "NOPE_WINDOW"
  | "DRAW"
  | "DEFUSE_REINSERT"
  | "GAME_OVER";

/** Awaiting the defusing player's reinsertion position choice (spec §6). */
export interface PendingDefuseReinsert {
  type: "DEFUSE_REINSERT";
  kitten: Card;
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  turnsRemaining: number;
  deck: Card[];
  discard: Card[];
  /** No action-card Nope targets yet — ticket 06 will add those pending-action shapes. */
  pendingAction: PendingDefuseReinsert | null;
  nopeStack: unknown[];
  /** Exploding Kittens that eliminated a player: face up, out of play, never reshuffled (§6). */
  explodedKittens: Card[];
  phase: Phase;
  /** Set only once phase is GAME_OVER (§10). */
  winner: number | null;
  config: Config;
}
