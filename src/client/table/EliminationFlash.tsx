// A smaller, seat-local echo of an opponent's elimination (ticket 25): the exploded kitten
// briefly appears over their seat and fades, instead of a full-screen takeover. Rendered inside
// that seat's own absolutely-positioned wrapper, so it needs no position of its own beyond
// covering that wrapper. Table.tsx owns the fade-out timer.

import { motion } from "motion/react";
import { CardFace } from "./CardFace.js";
import type { Card } from "../../engine/types.js";

export interface EliminationFlashProps {
  card: Card | null;
}

export function EliminationFlash({ card }: EliminationFlashProps) {
  if (!card) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0.25 }}
    >
      <CardFace card={card} className="shadow-xl" />
    </motion.div>
  );
}
