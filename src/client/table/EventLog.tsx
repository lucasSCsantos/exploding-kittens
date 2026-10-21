// Event log sidebar (ticket 16): lets anyone who looked away catch up on what happened, e.g.
// "Ana played Skip". Collapsed by default so it doesn't eat into the felt table's limited space.

import { useState } from "react";
import type { PlayHistoryEntry } from "../../engine/types.js";
import { describeHistoryEntry, type EventLogPlayer } from "./eventLogText.js";

export interface EventLogProps {
  players: EventLogPlayer[];
  playHistory: PlayHistoryEntry[];
}

export function EventLog({ players, playHistory }: EventLogProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute left-2 top-2 z-30 flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-black/50 px-3 py-1 text-xs text-white"
      >
        {open ? "Ocultar histórico" : `Histórico (${playHistory.length})`}
      </button>

      {open && (
        <ul className="max-h-64 w-56 overflow-y-auto rounded-lg bg-black/60 p-2 text-xs text-white">
          {playHistory.length === 0 && <li className="text-white/50">Nenhuma jogada ainda</li>}
          {[...playHistory].reverse().map((entry, i) => (
            <li
              key={playHistory.length - 1 - i}
              className="border-b border-white/10 py-1 last:border-0"
            >
              {describeHistoryEntry(entry, players)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
