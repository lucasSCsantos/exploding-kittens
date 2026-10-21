// Alter the Future: a private fan-out of the top cards the player can drag to reorder before
// committing (ticket 11). `cards` comes from the server's `peekTopOfDeck` query (ticket 12),
// answered only for the current player — never the full deck.

import { useState } from "react";
import { Reorder } from "motion/react";
import { CardFace } from "../table/CardFace.js";
import { CARD_SPRING } from "../table/motion.js";
import type { Card } from "../../engine/types.js";

export interface AlterTheFutureProps {
  cards: Card[];
  onConfirm: (order: string[]) => void;
  onCancel: () => void;
}

export function AlterTheFuture({ cards, onConfirm, onCancel }: AlterTheFutureProps) {
  const [order, setOrder] = useState(cards);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80">
      <h2 className="text-xl font-semibold text-white">Arraste para reordenar as próximas {cards.length} cartas</h2>
      <Reorder.Group
        axis="x"
        values={order}
        onReorder={setOrder}
        className="flex list-none gap-3"
      >
        {order.map((card) => (
          <Reorder.Item
            key={card.uid}
            value={card}
            transition={CARD_SPRING}
            className="cursor-grab active:cursor-grabbing"
          >
            <CardFace card={card} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(order.map((c) => c.uid))}
          className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
        >
          Confirmar ordem
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full bg-neutral-100 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
