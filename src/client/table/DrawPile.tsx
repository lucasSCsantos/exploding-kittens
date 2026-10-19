// The face-down draw pile: thicker with more cards remaining, tap/drag to draw, flip animation
// on the draw (ticket 10). Exposes a ref to the pile itself so `Table` can compute a flight-offset
// (ticket 26) from here to wherever the drawn card is traveling.

import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getCardBackImage } from "../cards.js";
import { drawPileLayers } from "./layout.js";
import { cardFlipSpring } from "./motion.js";

export interface DrawPileProps {
  deckSize: number;
  canDraw: boolean;
  onDraw: () => void;
}

const FLIP_DURATION_MS = 260;

export const DrawPile = forwardRef<HTMLDivElement, DrawPileProps>(function DrawPile(
  { deckSize, canDraw, onDraw },
  ref,
) {
  const [flipping, setFlipping] = useState(false);
  const layers = drawPileLayers(deckSize);
  const backImage = getCardBackImage();

  function handleDraw() {
    if (!canDraw || flipping || deckSize === 0) return;
    setFlipping(true);
    window.setTimeout(() => {
      setFlipping(false);
      onDraw();
    }, FLIP_DURATION_MS);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className="relative h-36 w-24" style={{ perspective: 800 }}>
        {Array.from({ length: layers }, (_, i) => (
          <img
            key={i}
            src={backImage}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute h-36 w-24 max-w-none select-none rounded-lg object-cover shadow-md"
            style={{ top: -i * 1.5, left: -i * 1.5 }}
          />
        ))}

        {deckSize > 0 && (
          <motion.button
            type="button"
            aria-label="Draw a card"
            disabled={!canDraw}
            onClick={handleDraw}
            drag
            dragSnapToOrigin
            dragElastic={0.2}
            dragMomentum={false}
            onDragEnd={handleDraw}
            className="absolute inset-0 cursor-grab rounded-lg disabled:cursor-not-allowed"
            style={{ top: -(layers - 1) * 1.5, left: -(layers - 1) * 1.5 }}
          >
            <AnimatePresence>
              {flipping && (
                <motion.img
                  src={backImage}
                  alt=""
                  aria-hidden
                  draggable={false}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 180 }}
                  exit={{ opacity: 0 }}
                  transition={cardFlipSpring(FLIP_DURATION_MS / 1000)}
                  className="absolute inset-0 h-36 w-24 max-w-none select-none rounded-lg object-cover shadow-xl"
                />
              )}
            </AnimatePresence>
            {!flipping && (
              <img
                src={backImage}
                alt="Draw pile"
                draggable={false}
                className="h-36 w-24 max-w-none select-none rounded-lg object-cover shadow-xl"
              />
            )}
          </motion.button>
        )}
      </div>
      <span className="text-sm text-neutral-300">{deckSize} left</span>
    </div>
  );
});
