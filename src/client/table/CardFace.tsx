// Renders one physical card: either its printed face or its back, per ticket 09's image mapping.

import { getCardBackImage, getCardImage } from "../cards.js";
import type { Card } from "../../engine/types.js";

export interface CardFaceProps {
  card: Card;
  faceDown?: boolean;
  className?: string;
}

export function CardFace({ card, faceDown = false, className = "" }: CardFaceProps) {
  const src = faceDown ? getCardBackImage() : getCardImage(card.id, card.uid);
  const alt = faceDown ? "Face-down card" : card.id;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`h-36 w-24 max-w-none select-none rounded-lg object-cover shadow-md ${className}`}
    />
  );
}
