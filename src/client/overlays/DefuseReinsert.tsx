// Defuse reinsertion: a slider to choose where the kitten goes back into the deck (ticket 11).
// Table.tsx only renders this for the defusing player's own view, so other seats never see it.

import { useState } from "react";

export interface DefuseReinsertProps {
  deckSize: number;
  onConfirm: (position: number) => void;
}

export function DefuseReinsert({ deckSize, onConfirm }: DefuseReinsertProps) {
  const [position, setPosition] = useState(0);

  const label = position === 0 ? "Top" : position === deckSize ? "Bottom" : `Position ${position}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80">
      <h2 className="text-xl font-semibold text-white">Slip the kitten back into the deck</h2>
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
    </div>
  );
}
