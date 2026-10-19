// Pure particle layout for the win-screen confetti burst (ticket 23). No DOM, no React, no
// Math.random — deterministic so the burst is easy to unit test and never flashes a dud layout.

import { hashUid } from "./layout.js";

export interface ConfettiParticle {
  angleDeg: number;
  distance: number;
  color: string;
  rotateDeg: number;
  delaySec: number;
}

const COLORS = ["#fbbf24", "#f472b6", "#60a5fa", "#4ade80", "#f87171", "#a78bfa"];

/** `count` particles spread evenly around the circle, each jittered by a stable hash of its
 * index so the burst reads as organic confetti rather than a uniform ring. */
export function confettiBurst(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const h = hashUid(`confetti-${i}`);
    const jitterDeg = (h % 20) - 10;
    const baseAngle = (360 / count) * i;

    return {
      angleDeg: (baseAngle + jitterDeg + 360) % 360,
      distance: 80 + ((h >> 8) % 141),
      color: COLORS[h % COLORS.length]!,
      rotateDeg: (h >> 16) % 360,
      delaySec: ((h >> 4) % 40) / 100,
    };
  });
}
