// Flies a card between two seats for a Favor/Pair/Triple hand-off (ticket 27), using the shared
// flight-offset math (ticket 19) and spring tuning (ticket 17). Table.tsx owns clearing the
// triggering store state once the flight finishes.

import { motion } from "motion/react";
import type { Card } from "../../engine/types.js";
import { getCardBackImage } from "../cards.js";
import { CardFace } from "./CardFace.js";
import { flightOffset, type Rect } from "./layout.js";
import { CARD_SPRING } from "./motion.js";

export interface CardTransferFlightProps {
  fromRect: Rect;
  toRect: Rect;
  /** The transferred card, when the viewer is entitled to see its identity (they're the giver or
   * receiver) — null renders a face-down card instead, for bystanders the rules don't let know
   * what moved. */
  card: Card | null;
  onDone: () => void;
}

export function CardTransferFlight({ fromRect, toRect, card, onDone }: CardTransferFlightProps) {
  const { dx, dy } = flightOffset(fromRect, toRect);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-30"
      style={{ top: fromRect.top, left: fromRect.left, width: fromRect.width, height: fromRect.height }}
      initial={{ x: 0, y: 0 }}
      animate={{ x: dx, y: dy }}
      transition={CARD_SPRING}
      onAnimationComplete={onDone}
    >
      {card ? (
        <CardFace card={card} />
      ) : (
        <img
          src={getCardBackImage()}
          alt=""
          draggable={false}
          className="h-36 w-24 max-w-none select-none rounded-lg object-cover shadow-md"
        />
      )}
    </motion.div>
  );
}
