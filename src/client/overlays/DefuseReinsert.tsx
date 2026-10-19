// Defuse reinsertion: a slider to choose where the kitten goes back into the deck (ticket 11).
// Table.tsx renders this for every seat during DEFUSE_REINSERT (ticket 22); only the defusing
// player gets `onConfirm`, which gates the interactive slider/button vs. a read-only view.

import { useState } from "react";
import type { Card } from "../../engine/types.js";
import { CardFace } from "../table/CardFace.js";

export interface DefuseReinsertProps {
  kitten: Card;
  deckSize: number;
  onConfirm?: (position: number) => void;
}

export function DefuseReinsert({ kitten, deckSize, onConfirm }: DefuseReinsertProps) {
  const [position, setPosition] = useState(0);

  const label = position === 0 ? "Top" : position === deckSize ? "Bottom" : `Position ${position}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80">
      <h2 className="text-xl font-semibold text-white">Slip the kitten back into the deck</h2>
      <CardFace card={kitten} size="large" />
      {onConfirm ? (
        <>
          <p className="text-amber-300">{label}</p>
          <input
            type="range"
            min={0}
            max={deckSize}
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            className="w-64"
          />
          <div className="flex w-64 justify-between text-xs text-neutral-300">
            <span>Top</span>
            <span>Bottom</span>
          </div>
          <button
            type="button"
            onClick={() => onConfirm(position)}
            className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
          >
            Confirm
          </button>
        </>
      ) : (
        <p className="text-amber-300">Waiting for them to choose where it goes back in…</p>
      )}
    </div>
  );
}
