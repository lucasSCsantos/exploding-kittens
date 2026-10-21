// The discard pile: a messy pile (random rotation/offset per card), tap to view its history
// (ticket 10).

import { forwardRef, useState } from "react";
import type { Card } from "../../engine/types.js";
import { CardFace, NORMAL_CARD_SIZE_CLASS } from "./CardFace.js";
import { discardPileStack } from "./layout.js";

export interface DiscardPileProps {
  discard: Card[];
}

export const DiscardPile = forwardRef<HTMLButtonElement, DiscardPileProps>(function DiscardPile(
  { discard },
  ref,
) {
  const [showHistory, setShowHistory] = useState(false);
  const stack = discardPileStack(discard);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => discard.length > 0 && setShowHistory(true)}
        className={`relative flex ${NORMAL_CARD_SIZE_CLASS} items-center justify-center rounded-lg border-2 border-dashed border-white/20`}
        aria-label="Monte de descarte"
      >
        {stack.map(({ card, offset }) => (
          <div
            key={card.uid}
            className="absolute"
            style={{
              // Translate first, rotate last: CSS composes functions right-to-left, so listing
              // translate first keeps the jitter in the page's fixed coordinate frame and rotates
              // each card in place around its own (now-jittered) center afterward. The previous
              // "rotate then translate" order instead applied the jitter inside each card's own
              // rotated local frame, so the translate direction got silently re-rotated by that
              // card's own random tilt — every card's center ended up displaced along a different
              // axis instead of sharing one consistent anchor point.
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotateDeg}deg)`,
            }}
          >
            <CardFace card={card} />
          </div>
        ))}
      </button>

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowHistory(false)}
        >
          <div className="max-h-[80vh] max-w-[90vw] overflow-auto rounded-xl bg-neutral-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Histórico de descarte</h2>
            <div className="flex flex-wrap gap-2">
              {discard.map((card) => (
                <CardFace key={card.uid} card={card} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
});
