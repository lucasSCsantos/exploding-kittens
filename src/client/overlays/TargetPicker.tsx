// Generic "choose an opponent" step shared by Targeted Attack, Favor, Pair and Triple (ticket 11).

import { Opponent } from "../table/Opponent.js";
import type { PlayerView } from "../../engine/view.js";

export interface TargetPickerProps {
  title: string;
  view: PlayerView;
  onSelect: (target: number) => void;
  onCancel: () => void;
}

export function TargetPicker({ title, view, onSelect, onCancel }: TargetPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex flex-wrap justify-center gap-6">
        {view.players.map((player, index) =>
          index === view.you || !player.alive ? null : (
            <Opponent
              key={player.id}
              nickname={player.id}
              handSize={player.handSize}
              alive={player.alive}
              isActiveTurn={false}
              selectable
              onClick={() => onSelect(index)}
            />
          ),
        )}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full bg-neutral-100 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
      >
        Cancel
      </button>
    </div>
  );
}
