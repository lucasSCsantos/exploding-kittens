// Favor: the target sees their own hand enlarged and chooses a card to give (ticket 11).

import { CardFace } from "../table/CardFace.js";
import type { Card } from "../../engine/types.js";

export interface FavorPromptProps {
  hand: Card[];
  onGive: (cardUid: string) => void;
}

export function FavorPrompt({ hand, onGive }: FavorPromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80 p-4">
      <h2 className="text-xl font-semibold text-white">Escolha uma carta para dar</h2>
      <div className="flex max-w-4xl flex-wrap justify-center gap-3">
        {hand.map((card) => (
          <button
            key={card.uid}
            type="button"
            onClick={() => onGive(card.uid)}
            className="transition hover:-translate-y-2"
          >
            <CardFace card={card} size="large" />
          </button>
        ))}
      </div>
    </div>
  );
}
