// Pure geometry helpers for the table layout (ticket 10). No DOM, no React — easy to unit test.

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
    translateX: offset * 20,
    translateY: Math.abs(offset) * 7,
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

/** Number of stacked layers to render for the draw pile, thicker with more cards remaining. */
export function drawPileLayers(deckSize: number): number {
  if (deckSize <= 0) return 0;
  return Math.min(6, Math.max(1, Math.ceil(deckSize / 6)));
}
