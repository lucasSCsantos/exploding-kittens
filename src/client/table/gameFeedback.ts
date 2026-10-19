// Derives sound/haptic feedback (ticket 15) from consecutive server `view` snapshots. The server
// never emits dedicated "a kitten exploded"/"you were attacked" events (ticket 12's view is just
// a state snapshot), so this diffs each new view against the previous one to notice the moments
// that deserve feedback, rather than adding new server events for it.

import { playSound } from "../sound.js";
import { vibrate } from "../haptics.js";
import type { Card, NopeableEffect, PlayHistoryEntry } from "../../engine/types.js";
import type { ServerView } from "./gameStore.js";
import { useGameStore } from "./gameStore.js";

const KITTEN_PATTERN = [80, 60, 200];
const ATTACKED_PATTERN = [150];

/** A kitten moment worth reacting to: a defuse reinsertion just started, or a player was just
 * eliminated outright. `card` is the kitten involved, when the view has it available. */
export interface KittenEvent {
  kind: "defused" | "eliminated";
  seat: number;
  card: Card | null;
}

/** Detects a kitten event in this diff (shared by sound/haptic feedback and loss-overlay UI
 * state), so the defused/eliminated branching only lives in one place. */
export function detectKittenEvent(prev: ServerView, next: ServerView): KittenEvent | null {
  const justDefused = prev.phase !== "DEFUSE_REINSERT" && next.phase === "DEFUSE_REINSERT";
  if (justDefused) {
    const card = next.pendingAction?.type === "DEFUSE_REINSERT" ? next.pendingAction.kitten : null;
    return { kind: "defused", seat: next.currentPlayer, card };
  }

  const eliminatedSeat = next.players.findIndex(
    (player, index) => prev.players[index]?.alive && !player.alive,
  );
  if (eliminatedSeat !== -1) {
    const card = next.explodedKittens[next.explodedKittens.length - 1] ?? null;
    return { kind: "eliminated", seat: eliminatedSeat, card };
  }

  return null;
}

export interface CardTransfer {
  fromSeat: number;
  toSeat: number;
}

type HandOffEntry = PlayHistoryEntry & { effect: Extract<NopeableEffect, { kind: "PAIR" | "TRIPLE" }> };

function isHandOffEntry(entry: PlayHistoryEntry): entry is HandOffEntry {
  return !entry.noped && (entry.effect.kind === "PAIR" || entry.effect.kind === "TRIPLE");
}

/** Detects a Favor/Pair/Triple hand-to-hand transfer in this diff. Pair/Triple log their transfer
 * as a playHistory entry at the moment the card actually moves, but Favor's playHistory entry logs
 * the request opening (before the giver even chooses a card) — the real hand-off only happens when
 * FAVOR_RESOLVE closes back to ACTION, so that transition is checked instead. */
export function detectCardTransfer(prev: ServerView, next: ServerView): CardTransfer | null {
  if (next.playHistory.length > prev.playHistory.length) {
    const newEntries = next.playHistory.slice(prev.playHistory.length);
    const transfer = newEntries.find(isHandOffEntry);
    if (transfer) {
      const fromSeat = transfer.effect.target;
      // A Pair/Triple whose target had nothing to give still logs a non-noped playHistory entry
      // (it's pushed before the engine checks whether a card was actually available), so confirm
      // the giver's hand really shrank before reporting a transfer.
      const giverHandShrank = next.players[fromSeat]!.handSize < prev.players[fromSeat]!.handSize;
      if (giverHandShrank) {
        return { fromSeat, toSeat: transfer.player };
      }
    }
  }

  if (prev.phase === "FAVOR_RESOLVE" && next.phase === "ACTION" && prev.pendingAction?.type === "FAVOR") {
    return { fromSeat: prev.pendingAction.target, toSeat: prev.pendingAction.from };
  }

  return null;
}

/** The transferred card's identity, for the viewer only when they're a party to the exchange —
 * the rules don't let a bystander know which card moved. Pair/Triple/Favor never log the card
 * itself (the engine only logs who/what), so this is resolved from the viewer's own hand diff. */
export function resolveTransferCard(prev: ServerView, next: ServerView, transfer: CardTransfer): Card | null {
  if (transfer.fromSeat === next.you) {
    return prev.hand.find((card) => !next.hand.some((c) => c.uid === card.uid)) ?? null;
  }
  if (transfer.toSeat === next.you) {
    return next.hand.find((card) => !prev.hand.some((c) => c.uid === card.uid)) ?? null;
  }
  return null;
}

/** A draw worth animating: `kind` distinguishes "it's my own draw, and I know the card" from
 * "an opponent drew, and I only get to see a face-down card travel" — `card` is non-null only for
 * the former. */
export interface DrawEvent {
  kind: "own" | "opponent";
  seat: number;
  card: Card | null;
}

/** Detects a draw in this diff (shared by the draw-travel animation in `Table.tsx`). Only the
 * deck shrinking signals a draw (a reinsertion grows it back), and the drawer is whoever's turn
 * it was *before* the draw — a stacked Attack can mean several draws in a row without the turn
 * moving, but a successful draw never changes who it was mid-sequence. A kitten moment isn't worth
 * animating as a plain draw too — whether it eliminates the drawer outright or sends them into
 * `DEFUSE_REINSERT`, `detectKittenEvent` already covers showing that card. */
export function detectDraw(prev: ServerView, next: ServerView): DrawEvent | null {
  if (next.deckSize >= prev.deckSize) return null;
  if (next.phase === "DEFUSE_REINSERT") return null;

  const seat = prev.currentPlayer;
  if (!next.players[seat]?.alive) return null;

  if (seat === next.you) {
    const prevUids = new Set(prev.hand.map((card) => card.uid));
    const card = next.hand.find((card) => !prevUids.has(card.uid)) ?? null;
    return { kind: "own", seat, card };
  }

  return { kind: "opponent", seat, card: null };
}

export function diffViewForFeedback(prev: ServerView | null, next: ServerView): void {
  if (!prev) return;

  if (prev.winner === null && next.winner !== null) {
    playSound("win");
    return;
  }

  if (prev.phase !== "NOPE_WINDOW" && next.phase === "NOPE_WINDOW") {
    playSound("swish");
  }

  if (next.nopeStack.length > prev.nopeStack.length) {
    playSound("nopeStamp");
  }

  if (next.deckSize < prev.deckSize) {
    playSound("draw");
  }

  const drawEvent = detectDraw(prev, next);
  if (drawEvent) {
    useGameStore.setState({ lastDraw: drawEvent });
  }

  const kittenEvent = detectKittenEvent(prev, next);
  if (kittenEvent) {
    if (kittenEvent.seat === next.you) {
      vibrate(KITTEN_PATTERN);
    }
    playSound("explosion");

    if (kittenEvent.kind === "eliminated") {
      useGameStore.setState({ lastElimination: { seat: kittenEvent.seat, card: kittenEvent.card } });
    }
  }

  const transfer = detectCardTransfer(prev, next);
  if (transfer) {
    useGameStore.setState({
      lastTransfer: { ...transfer, card: resolveTransferCard(prev, next, transfer) },
    });
  }

  if (next.playHistory.length > prev.playHistory.length) {
    const newEntries = next.playHistory.slice(prev.playHistory.length);
    // Only the most recent un-noped attack can be the one that put `next.currentPlayer`
    // where it is now — earlier entries in the same batch are stale by the time this runs.
    const lastAttack = [...newEntries]
      .reverse()
      .find((entry) => !entry.noped && (entry.effect.kind === "ATTACK" || entry.effect.kind === "TARGETED_ATTACK"));
    if (lastAttack) {
      const wasTargeted =
        lastAttack.effect.kind === "TARGETED_ATTACK" && lastAttack.effect.target === next.you;
      const wasPlain = lastAttack.effect.kind === "ATTACK" && next.currentPlayer === next.you;
      if (wasTargeted || wasPlain) {
        vibrate(ATTACKED_PATTERN);
      }
    }
  }
}

let previousView: ServerView | null = useGameStore.getState().view;
useGameStore.subscribe((state) => {
  if (state.view && state.view !== previousView) {
    diffViewForFeedback(previousView, state.view);
  }
  previousView = state.view;
});
