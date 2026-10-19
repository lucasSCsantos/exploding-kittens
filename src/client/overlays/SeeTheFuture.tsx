// See the Future: a private fan-out of the top 3 deck cards, dismissed by the viewer (ticket 11).

import { CardFace } from "../table/CardFace.js";
import type { Card } from "../../engine/types.js";

export interface SeeTheFutureProps {
  cards: Card[];
  onDismiss: () => void;
}

export function SeeTheFuture({ cards, onDismiss }: SeeTheFutureProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80"
      onClick={onDismiss}
    >
      <h2 className="text-xl font-semibold text-white">The next {cards.length} cards</h2>
      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
        {cards.map((card, index) => (
          <div key={card.uid} className="flex flex-col items-center gap-1">
            <CardFace card={card} />
            <span className="text-xs text-neutral-300">
              {index === 0 ? "Top" : `#${index + 1}`}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
      >
        Got it
      </button>
    </div>
  );
}
