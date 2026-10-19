// Renders one physical card: either its printed face or its back, per ticket 09's image mapping.

import { getCardBackImage, getCardImage } from "../cards.js";
import type { Card } from "../../engine/types.js";

export interface CardFaceProps {
  card: Card;
  faceDown?: boolean;
  /** "large" for moments that enlarge the card (e.g. the Favor prompt), "normal" everywhere else. */
  size?: "normal" | "large";
  className?: string;
}

const SIZE_CLASSES: Record<"normal" | "large", string> = {
  normal: "h-36 w-24",
  large: "h-48 w-32",
};

export function CardFace({ card, faceDown = false, size = "normal", className = "" }: CardFaceProps) {
  const src = faceDown ? getCardBackImage() : getCardImage(card.id, card.uid);
  const alt = faceDown ? "Face-down card" : card.id;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`${SIZE_CLASSES[size]} max-w-none select-none rounded-lg object-cover shadow-md ${className}`}
    />
  );
}
