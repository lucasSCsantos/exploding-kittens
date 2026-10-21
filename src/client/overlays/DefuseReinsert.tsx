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

  const label =
    position === 0 ? "Topo" : position === deckSize ? "Fundo" : `Posição ${position}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80">
      <h2 className="text-xl font-semibold text-white">Deslize o gatinho de volta para o baralho</h2>
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
            <span>Topo</span>
            <span>Fundo</span>
          </div>
          <button
            type="button"
            onClick={() => onConfirm(position)}
            className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
          >
            Confirmar
          </button>
        </>
      ) : (
        <p className="text-amber-300">Aguardando a escolha de onde ele volta…</p>
      )}
    </div>
  );
}
