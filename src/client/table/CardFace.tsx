// Renders one physical card: either its printed face or its back, per ticket 09's image mapping.
// A face-up card also carries a hover tooltip with its name + rules text in Portuguese — never
// shown face-down, since that would leak a hidden card's identity to the hovering player.

import { cardDescription, cardLabel, getCardBackImage, getCardImage } from "../cards.js";
import type { Card } from "../../engine/types.js";

export interface CardFaceProps {
  card: Card;
  faceDown?: boolean;
  /** "large" for moments that enlarge the card (e.g. the Favor prompt), "normal" everywhere else. */
  size?: "normal" | "large";
  className?: string;
}

const SIZE_CLASSES: Record<"normal" | "large", string> = {
  normal: "h-60 w-40",
  large: "h-80 w-56",
};

/** The "normal" card footprint as bare Tailwind classes, for the handful of places (deck/discard
 * piles, the cross-table flight) that need to match CardFace's size without actually rendering a
 * CardFace — keeps every card-sized element in the game at one shared size. */
export const NORMAL_CARD_SIZE_CLASS = SIZE_CLASSES.normal;

export function CardFace({ card, faceDown = false, size = "normal", className = "" }: CardFaceProps) {
  const src = faceDown ? getCardBackImage() : getCardImage(card.id, card.uid);
  const alt = faceDown ? "Carta virada para baixo" : cardLabel(card.id);

  return (
    <span className="group relative inline-block">
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={`${SIZE_CLASSES[size]} max-w-none select-none rounded-lg object-cover shadow-md ${className}`}
      />
      {!faceDown && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-48 max-w-[85vw] -translate-x-1/2 scale-95 rounded-lg bg-neutral-900/95 p-2 text-center opacity-0 shadow-xl ring-1 ring-white/10 transition duration-150 group-hover:scale-100 group-hover:opacity-100"
        >
          <span className="block text-xs font-semibold text-amber-300">{cardLabel(card.id)}</span>
          <span className="mt-1 block text-xs leading-snug text-neutral-200">
            {cardDescription(card.id)}
          </span>
        </span>
      )}
    </span>
  );
}
