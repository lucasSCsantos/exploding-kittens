// The active seat's hand: fanned arc, hover/touch lift, drag-to-play onto discard,
// tap-to-select + Play button fallback, and sideways reorder (ticket 10).

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type PanInfo } from "motion/react";
import type { Card, CardId } from "../../engine/types.js";
import { CardFace } from "./CardFace.js";
import { fanTransform } from "./layout.js";

export interface HandProps {
  hand: Card[];
  canPlay: boolean;
  isPlayable: (cardId: CardId) => boolean;
  onPlay: (card: Card) => void;
  getDiscardRect: () => DOMRect | null;
}

/** How far upward a drag must travel to count as "toward the discard pile" rather than a reorder. */
const PLAY_DRAG_THRESHOLD = -70;

export function Hand({ hand, canPlay, isPlayable, onPlay, getDiscardRect }: HandProps) {
  const [order, setOrder] = useState<string[]>(() => hand.map((c) => c.uid));
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    setOrder((prev) => {
      const ids = hand.map((c) => c.uid);
      const idSet = new Set(ids);
      const kept = prev.filter((uid) => idSet.has(uid));
      const added = ids.filter((uid) => !kept.includes(uid));
      return [...kept, ...added];
    });
  }, [hand]);

  const byUid = useMemo(() => new Map(hand.map((c) => [c.uid, c])), [hand]);
  const orderedHand = order.map((uid) => byUid.get(uid)).filter((c): c is Card => c !== undefined);

  function reorder(uid: string, dropX: number) {
    const others = orderedHand.filter((c) => c.uid !== uid);
    let newIndex = others.length;
    for (let i = 0; i < others.length; i++) {
      const el = itemRefs.current.get(others[i]!.uid);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (dropX < rect.left + rect.width / 2) {
        newIndex = i;
        break;
      }
    }
    const next = others.map((c) => c.uid);
    next.splice(newIndex, 0, uid);
    setOrder(next);
  }

  function handleDragEnd(card: Card, info: PanInfo) {
    const draggedUpEnough = info.offset.y < PLAY_DRAG_THRESHOLD;
    const discardRect = getDiscardRect();
    const overDiscard =
      discardRect !== null &&
      info.point.x >= discardRect.left &&
      info.point.x <= discardRect.right &&
      info.point.y >= discardRect.top &&
      info.point.y <= discardRect.bottom;

    if ((draggedUpEnough || overDiscard) && canPlay && isPlayable(card.id)) {
      onPlay(card);
      return;
    }

    if (Math.abs(info.offset.x) > 40) {
      reorder(card.uid, info.point.x);
    }
  }

  function handleTap(card: Card) {
    setSelectedUid((current) => (current === card.uid ? null : card.uid));
  }

  const selectedCard = orderedHand.find((c) => c.uid === selectedUid) ?? null;
  const canPlaySelected = selectedCard !== null && canPlay && isPlayable(selectedCard.id);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-44 items-end justify-center" style={{ perspective: 800 }}>
        {orderedHand.map((card, index) => {
          const { rotateDeg, translateX, translateY } = fanTransform(index, orderedHand.length);
          const isSelected = card.uid === selectedUid;

          return (
            <motion.div
              key={card.uid}
              ref={(el) => {
                if (el) itemRefs.current.set(card.uid, el);
                else itemRefs.current.delete(card.uid);
              }}
              layout
              drag
              dragSnapToOrigin
              dragElastic={0.3}
              dragMomentum={false}
              onDragEnd={(_e, info) => handleDragEnd(card, info)}
              onTap={() => handleTap(card)}
              whileHover={{ y: -22, zIndex: 20 }}
              whileTap={{ scale: 1.05 }}
              animate={{
                rotate: rotateDeg,
                x: translateX,
                y: isSelected ? translateY - 22 : translateY,
                zIndex: isSelected ? 20 : index,
              }}
              className="absolute cursor-grab touch-none active:cursor-grabbing"
              style={{ transformOrigin: "bottom center" }}
            >
              <CardFace
                card={card}
                className={isSelected ? "ring-4 ring-amber-400" : ""}
              />
            </motion.div>
          );
        })}
      </div>

      {selectedCard && (
        <button
          type="button"
          disabled={!canPlaySelected}
          onClick={() => {
            onPlay(selectedCard);
            setSelectedUid(null);
          }}
          className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 shadow-lg disabled:cursor-not-allowed disabled:bg-neutral-600 disabled:text-neutral-400"
        >
          Play
        </button>
      )}
    </div>
  );
}
