// The Nope window: a countdown ring and a big Nope button, restarting the countdown every time
// someone Nopes (ticket 11). There's no server yet (that's ticket 13), so the countdown lives
// here and auto-passes the window when it runs out.

import { useEffect, useState } from "react";
import type { Card } from "../../engine/types.js";

export interface NopeWindowProps {
  /** How many Nope plays are already stacked — the countdown restarts whenever this grows. */
  nopeStackSize: number;
  /** The active seat's own hand, to offer their Nope card if they hold one. */
  hand: Card[];
  onPlayNope: (cardUid: string) => void;
  onWindowClosed: () => void;
}

const COUNTDOWN_SECONDS = 4;
const TICK_MS = 100;

export function NopeWindow({ nopeStackSize, hand, onPlayNope, onWindowClosed }: NopeWindowProps) {
  const [remainingMs, setRemainingMs] = useState(COUNTDOWN_SECONDS * 1000);

  useEffect(() => {
    setRemainingMs(COUNTDOWN_SECONDS * 1000);
  }, [nopeStackSize]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingMs((ms) => Math.max(0, ms - TICK_MS));
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [nopeStackSize]);

  useEffect(() => {
    if (remainingMs === 0) onWindowClosed();
  }, [remainingMs, onWindowClosed]);

  const progress = remainingMs / (COUNTDOWN_SECONDS * 1000);
  const circumference = 2 * Math.PI * 36;
  const nopeCard = hand.find((card) => card.id === "NOPE") ?? null;

  return (
    <div className="absolute inset-x-0 bottom-32 flex flex-col items-center gap-3">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r="36" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
        <circle
          cx="44"
          cy="44"
          r="36"
          stroke="#fbbf24"
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: "stroke-dashoffset 100ms linear" }}
        />
      </svg>
      <div className="flex gap-2">
        {nopeCard && (
          <button
            type="button"
            onClick={() => onPlayNope(nopeCard.uid)}
            className="rounded-full bg-red-500 px-8 py-3 text-lg font-bold text-white shadow-lg"
          >
            NOPE!
          </button>
        )}
        <button
          type="button"
          onClick={onWindowClosed}
          className="rounded-full bg-neutral-100 px-6 py-2 font-semibold text-neutral-900 shadow-lg"
        >
          Pass
        </button>
      </div>
    </div>
  );
}
