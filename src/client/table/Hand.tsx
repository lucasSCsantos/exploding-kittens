// The active seat's hand: fanned arc, hover/touch lift, drag-to-play onto discard,
// tap-to-select + Play button fallback, sideways reorder (ticket 10), combo multi-select —
// tapping several cards lifts them together, then Play routes by selection size (ticket 11) —
// a "Your turn" label while it's this player's turn (ticket 21), and selected
// cards staging into their own row above the hand, in selection order, while the rest of the
// hand re-fans to fill the gap (ticket 24).

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, type PanInfo } from "motion/react";
import type { Card, CardId } from "../../engine/types.js";
import { CardFace } from "./CardFace.js";
import { fanTransform, stagingRowPosition } from "./layout.js";
import { CARD_SPRING } from "./motion.js";
import { classifySelectionShape, classifySinglePlay } from "./selection.js";

export interface HandProps {
  hand: Card[];
  canPlay: boolean;
  /** Whether a single card can be dragged straight onto the discard pile for an instant play. */
  isSimplePlayable: (cardId: CardId) => boolean;
  onSimplePlay: (card: Card) => void;
  /** Tap-select + Play button path — any selection size; Table decides what to do with it. */
  onPlaySelection: (cards: Card[]) => void;
  getDiscardRect: () => DOMRect | null;
}

/** How far upward a drag must travel to count as "toward the discard pile" rather than a reorder. */
const PLAY_DRAG_THRESHOLD = -70;

export function Hand({
  hand,
  canPlay,
  isSimplePlayable,
  onSimplePlay,
  onPlaySelection,
  getDiscardRect,
}: HandProps) {
  const [order, setOrder] = useState<string[]>(() => hand.map((c) => c.uid));
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    setOrder((prev) => {
      const ids = hand.map((c) => c.uid);
      const idSet = new Set(ids);
      const kept = prev.filter((uid) => idSet.has(uid));
      const added = ids.filter((uid) => !kept.includes(uid));
      return [...kept, ...added];
    });
    setSelectedUids((prev) => prev.filter((uid) => hand.some((c) => c.uid === uid)));
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

    if ((draggedUpEnough || overDiscard) && canPlay && isSimplePlayable(card.id)) {
      onSimplePlay(card);
      return;
    }

    if (Math.abs(info.offset.x) > 40) {
      reorder(card.uid, info.point.x);
    }
  }

  function handleTap(card: Card) {
    setSelectedUids((current) =>
      current.includes(card.uid) ? current.filter((uid) => uid !== card.uid) : [...current, card.uid],
    );
  }

  const unselectedHand = orderedHand.filter((c) => !selectedUids.includes(c.uid));
  const unselectedIndex = new Map(unselectedHand.map((c, i) => [c.uid, i]));

  const selectedCards = orderedHand.filter((c) => selectedUids.includes(c.uid));
  const selectionShape = classifySelectionShape(selectedCards);
  const canPlaySelection =
    selectionShape.size === 1
      ? classifySinglePlay(selectionShape.cards[0].id).kind !== "unplayable"
      : selectionShape.size === 2 || selectionShape.size === 3 || selectionShape.size === 5;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl p-2">
      {canPlay && <span className="text-sm font-semibold text-amber-300">Your turn</span>}
      <div className="relative flex h-44 items-end justify-center" style={{ perspective: 800 }}>
        {orderedHand.map((card) => {
          const isSelected = selectedUids.includes(card.uid);
          const selectionIndex = selectedUids.indexOf(card.uid);
          const handIndex = unselectedIndex.get(card.uid)!;
          const { rotateDeg, translateX, translateY } = isSelected
            ? stagingRowPosition(selectionIndex, selectedUids.length)
            : fanTransform(handIndex, unselectedHand.length);
          const zIndex = isSelected ? 20 + selectionIndex : handIndex;

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
              whileHover={isSelected ? undefined : { y: -22, zIndex: 20 }}
              whileTap={{ scale: 1.05 }}
              animate={{
                rotate: rotateDeg,
                x: translateX,
                y: translateY,
                zIndex,
              }}
              transition={CARD_SPRING}
              className="absolute cursor-grab touch-none active:cursor-grabbing"
              style={{ transformOrigin: "bottom center" }}
            >
              <CardFace card={card} className={isSelected ? "ring-4 ring-amber-400" : ""} />
            </motion.div>
          );
        })}
      </div>

      {selectedCards.length > 0 && (
        <button
          type="button"
          disabled={!canPlay || !canPlaySelection}
          onClick={() => {
            onPlaySelection(selectedCards);
            setSelectedUids([]);
          }}
          className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 shadow-lg disabled:cursor-not-allowed disabled:bg-neutral-600 disabled:text-neutral-400"
        >
          {selectedCards.length === 1 ? "Play" : `Play ${selectedCards.length} cards`}
        </button>
      )}
    </div>
  );
}
