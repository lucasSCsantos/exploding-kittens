// Shared Motion transition tuning for card movement (ticket 17): every card animation uses a
// spring, never a linear tween, and settles within the 150-400ms "kept short" budget.

import type { Transition } from "motion/react";

/** Default spring for card movement (fan position, selection lift, reordering). */
export const CARD_SPRING: Transition = { type: "spring", duration: 0.3, bounce: 0.25 };

/** A snappier, less bouncy spring for the draw-pile flip, which shouldn't visibly overshoot. */
export function cardFlipSpring(durationSeconds: number): Transition {
  return { type: "spring", duration: durationSeconds, bounce: 0.15 };
}
