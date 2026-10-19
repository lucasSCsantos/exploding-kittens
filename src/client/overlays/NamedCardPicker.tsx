// Triple combo's third step: name a card type the target must give up if they hold it (ticket 11).

import { CARD_TYPE_TO_FILES, cardLabel, getCardImage } from "../cards.js";
import type { CardId } from "../../engine/types.js";

export interface NamedCardPickerProps {
  onSelect: (cardId: CardId) => void;
  onCancel: () => void;
}

const ALL_CARD_IDS = Object.keys(CARD_TYPE_TO_FILES) as CardId[];

export function NamedCardPicker({ onSelect, onCancel }: NamedCardPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 p-4">
      <h2 className="text-xl font-semibold text-white">Escolha o tipo de carta</h2>
      <div className="flex max-w-3xl flex-wrap justify-center gap-3">
        {ALL_CARD_IDS.map((cardId) => (
          <button
            key={cardId}
            type="button"
            onClick={() => onSelect(cardId)}
            className="flex flex-col items-center gap-1"
          >
            <img
              src={getCardImage(cardId, `preview-${cardId}`)}
              alt={cardLabel(cardId)}
              draggable={false}
              className="h-28 w-20 max-w-none select-none rounded object-cover shadow"
            />
            <span className="text-xs text-white">{cardLabel(cardId)}</span>
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
