// Pure geometry helpers for the table layout (ticket 10). No DOM, no React — easy to unit test.

import type { Card } from "../../engine/types.js";

export interface FanTransform {
  rotateDeg: number;
  translateX: number;
  translateY: number;
}

/** Position of card `index` of `count` in a fanned arc, centered under the hand. */
export function fanTransform(index: number, count: number): FanTransform {
  if (count <= 1) {
    return { rotateDeg: 0, translateX: 0, translateY: 0 };
  }

  const maxSpreadDeg = Math.min(54, 7 * (count - 1));
  const step = maxSpreadDeg / (count - 1);
  const mid = (count - 1) / 2;
  const offset = index - mid;

  return {
    rotateDeg: offset * step,
    translateX: offset * 34,
    translateY: Math.abs(offset) * 11,
  };
}

/** Horizontal gap (px) between staged cards in the row above the hand. */
const STAGING_CARD_GAP = 94;

/** How far above the fanned hand the staging row sits (px; negative moves it up). */
const STAGING_ROW_OFFSET_Y = -194;

/**
 * Position of staged card `index` of `count` in the row above the hand, ordered by selection
 * order (the order the player tapped the cards), not hand order. Returns the same `FanTransform`
 * shape as `fanTransform` so both can feed the same `animate` props — but lays cards out flat in
 * a row, evenly spaced, instead of a fan.
 */
export function stagingRowPosition(index: number, count: number): FanTransform {
  const mid = (count - 1) / 2;
  return {
    rotateDeg: 0,
    translateX: (index - mid) * STAGING_CARD_GAP,
    translateY: STAGING_ROW_OFFSET_Y,
  };
}

export interface SeatPosition {
  seat: number;
  xPercent: number;
  yPercent: number;
}

/**
 * Lays the non-active seats out along an arc across the top of the table, in turn
 * order starting right after the active seat.
 */
export function opponentSeatPositions(playerCount: number, activeSeat: number): SeatPosition[] {
  if (playerCount <= 1) return [];

  const others: number[] = [];
  for (let offset = 1; offset < playerCount; offset++) {
    others.push((activeSeat + offset) % playerCount);
  }

  const n = others.length;
  return others.map((seat, i) => {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
    const angleDeg = t * 55;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      seat,
      xPercent: 50 + Math.sin(angleRad) * 42,
      yPercent: 18 - Math.cos(angleRad) * 6,
    };
  });
}

/** Lays every joined player out evenly around a full circle, seen from overhead — the lobby has
 * no "active seat"/first-person view yet, unlike `opponentSeatPositions` (ticket 14). */
export function lobbySeatPositions(playerCount: number): SeatPosition[] {
  if (playerCount <= 0) return [];
  if (playerCount === 1) return [{ seat: 0, xPercent: 50, yPercent: 50 }];

  return Array.from({ length: playerCount }, (_, seat) => {
    const angleRad = (seat / playerCount) * 2 * Math.PI - Math.PI / 2;
    return {
      seat,
      xPercent: 50 + Math.cos(angleRad) * 38,
      yPercent: 50 + Math.sin(angleRad) * 38,
    };
  });
}

/** Deterministic hash of a card uid, used so pile jitter is stable across re-renders. */
export function hashUid(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  }
  return h;
}

export interface MessyOffset {
  rotateDeg: number;
  x: number;
  y: number;
}

/** A stable-but-random-looking rotation/offset for one discard-pile card, keyed by its uid. */
export function messyOffset(uid: string): MessyOffset {
  const h = hashUid(uid);
  return {
    rotateDeg: (h % 41) - 20,
    x: ((h >> 8) % 21) - 10,
    y: ((h >> 16) % 21) - 10,
  };
}

export interface DiscardStackEntry {
  card: Card;
  offset: MessyOffset;
}

const DISCARD_STACK_CAP = 15;

/**
 * The last (up to) 15 discarded cards, each paired with its messy offset, so the discard pile
 * renders as a pile with visual bulk instead of a single floating top card. The full `discard`
 * array (for the tap-to-view-history modal) is unaffected — this only caps what's rendered as
 * the physical stack.
 */
export function discardPileStack(discard: Card[]): DiscardStackEntry[] {
  return discard.slice(-DISCARD_STACK_CAP).map((card) => ({ card, offset: messyOffset(card.uid) }));
}

/** Number of stacked layers to render for the draw pile, thicker with more cards remaining. */
export function drawPileLayers(deckSize: number): number {
  if (deckSize <= 0) return 0;
  return Math.min(6, Math.max(1, Math.ceil(deckSize / 6)));
}

/** A rect in page coordinates, structurally compatible with `DOMRect`. */
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface FlightOffset {
  dx: number;
  dy: number;
}

/**
 * The relative transform (center-to-center) needed to translate an element sitting at `fromRect`
 * so it lands on `toRect` — e.g. a drawn card flying from the deck to a hand, or a traded card
 * flying between two seats.
 */
export function flightOffset(fromRect: Rect, toRect: Rect): FlightOffset {
  const fromCenterX = fromRect.left + fromRect.width / 2;
  const fromCenterY = fromRect.top + fromRect.height / 2;
  const toCenterX = toRect.left + toRect.width / 2;
  const toCenterY = toRect.top + toRect.height / 2;

  return { dx: toCenterX - fromCenterX, dy: toCenterY - fromCenterY };
}
