// The discard pile: a messy pile (random rotation/offset per card), tap to view its history
// (ticket 10).

import { forwardRef, useState } from "react";
import type { Card } from "../../engine/types.js";
import { CardFace } from "./CardFace.js";
import { messyOffset } from "./layout.js";

export interface DiscardPileProps {
  discard: Card[];
}

export const DiscardPile = forwardRef<HTMLButtonElement, DiscardPileProps>(function DiscardPile(
  { discard },
  ref,
) {
  const [showHistory, setShowHistory] = useState(false);
  const topCard = discard[discard.length - 1] ?? null;

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => discard.length > 0 && setShowHistory(true)}
        className="relative flex h-36 w-24 items-center justify-center rounded-lg border-2 border-dashed border-white/20"
        aria-label="Discard pile"
      >
        {topCard &&
          (() => {
            const offset = messyOffset(topCard.uid);
            return (
              <div
                style={{
                  transform: `rotate(${offset.rotateDeg}deg) translate(${offset.x}px, ${offset.y}px)`,
                }}
              >
                <CardFace card={topCard} />
              </div>
            );
          })()}
      </button>

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowHistory(false)}
        >
          <div className="max-h-[80vh] max-w-[90vw] overflow-auto rounded-xl bg-neutral-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Discard history</h2>
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
