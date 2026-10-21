// Shared Motion transition tuning for card movement (ticket 17): every card animation uses a
// spring, never a linear tween, and settles within the 150-400ms "kept short" budget.

import type { Transition } from "motion/react";

/** Default spring for card movement (fan position, selection lift, reordering). */
export const CARD_SPRING: Transition = { type: "spring", duration: 0.3, bounce: 0.25 };

/** Spring for a card's cross-table flight (deck → hand on draw, hand → hand on Favor/Pair/
 * Triple). Slower than CARD_SPRING on purpose — unlike a fan reflow, a flight travels a long,
 * eye-catching distance and needs to actually be watchable rather than resolve in a blink. */
export const CARD_FLIGHT_SPRING: Transition = { type: "spring", duration: 0.6, bounce: 0.2 };

/** A snappier, less bouncy spring for the draw-pile flip, which shouldn't visibly overshoot. */
export function cardFlipSpring(durationSeconds: number): Transition {
  return { type: "spring", duration: durationSeconds, bounce: 0.15 };
}
