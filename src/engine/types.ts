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
  | "FAVOR_RESOLVE"
  | "GAME_OVER";

/** Awaiting the defusing player's reinsertion position choice (spec §6). */
export interface PendingDefuseReinsert {
  type: "DEFUSE_REINSERT";
  kitten: Card;
}

/** Awaiting the Favor target's choice of which card to give (spec §8.4). */
export interface PendingFavor {
  type: "FAVOR";
  from: number;
  target: number;
}

/** A noppable action card's effect, captured at play time so it can be applied or cancelled once the Nope window closes (spec §7). */
export type NopeableEffect =
  | { kind: "ATTACK" }
  | { kind: "TARGETED_ATTACK"; target: number }
  | { kind: "SKIP" }
  | { kind: "FAVOR"; target: number }
  | { kind: "SHUFFLE" }
  | { kind: "SEE_FUTURE" }
  | { kind: "ALTER_FUTURE"; order: string[] }
  | { kind: "DRAW_FROM_BOTTOM" }
  | { kind: "PAIR"; target: number }
  | { kind: "TRIPLE"; target: number; namedCard: CardId }
  | { kind: "FIVE_DIFFERENT"; discardUid: string };

/** Awaiting the Nope window to close on a played action card/combo (spec §7). */
export interface PendingNopeableAction {
  type: "NOPEABLE";
  /** The player whose action phase this play belongs to — unaffected by who Nopes it. */
  player: number;
  effect: NopeableEffect;
}

/** One NOPE play recorded on the stack, in order played (spec §3, §7). */
export interface NopePlay {
  player: number;
}

/** A resolved action-card/combo play, recorded for the public play history (spec §3: "every card played and its target"). */
export interface PlayHistoryEntry {
  player: number;
  effect: NopeableEffect;
  /** Whether the Nope stack cancelled this play instead of letting it resolve. */
  noped: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  turnsRemaining: number;
  deck: Card[];
  discard: Card[];
  pendingAction: PendingDefuseReinsert | PendingFavor | PendingNopeableAction | null;
  nopeStack: NopePlay[];
  /** Exploding Kittens that eliminated a player: face up, out of play, never reshuffled (§6). */
  explodedKittens: Card[];
  phase: Phase;
  /** Set only once phase is GAME_OVER (§10). */
  winner: number | null;
  config: Config;
  /** Rng.getState() after the last engine-driven shuffle, so SHUF can resume the sequence deterministically. */
  rngState: number;
  /** Every resolved action-card/combo play, in order (spec §3 public info). */
  playHistory: PlayHistoryEntry[];
}
