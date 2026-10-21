// Five-different combo's step: pick any card out of the discard pile (ticket 11).

import { CardFace } from "../table/CardFace.js";
import type { Card } from "../../engine/types.js";

export interface DiscardPickerProps {
  discard: Card[];
  onSelect: (discardUid: string) => void;
  onCancel: () => void;
}

export function DiscardPicker({ discard, onSelect, onCancel }: DiscardPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 p-4">
      <h2 className="text-xl font-semibold text-white">Pegue uma carta do monte de descarte</h2>
      <div className="flex max-h-[60vh] max-w-4xl flex-wrap justify-center gap-2 overflow-auto">
        {discard.map((card) => (
          <button key={card.uid} type="button" onClick={() => onSelect(card.uid)}>
            <CardFace card={card} />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full bg-neutral-100 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
      >
        Cancelar
      </button>
    </div>
  );
}
