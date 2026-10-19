// The Nope window: a countdown ring and a big Nope button. The server (ticket 13) owns the
// actual close timer and restarts it on every Nope played — this just renders the shared
// `nopeDeadline` it broadcasts, so every client's ring agrees. "Pass" lets any client race to
// close the window early without waiting out the full countdown.

import { useEffect, useState } from "react";
import type { Card } from "../../engine/types.js";

export interface NopeWindowProps {
  /** Epoch ms when the server will auto-close this window; purely cosmetic countdown input. */
  nopeDeadline: number | null;
  /** The active seat's own hand, to offer their Nope card if they hold one. */
  hand: Card[];
  onPlayNope: (cardUid: string) => void;
  onWindowClosed: () => void;
}

// Only used before the first server deadline ever arrives (e.g. a stray render) — once a real
// `nopeDeadline` shows up, the ring's 100% mark is derived from it instead, so it stays accurate
// whatever the server's actual configured window turns out to be.
const FALLBACK_WINDOW_MS = 4000;
const TICK_MS = 100;

function remainingMs(deadline: number | null): number {
  if (deadline === null) return FALLBACK_WINDOW_MS;
  return Math.max(0, deadline - Date.now());
}

export function NopeWindow({ nopeDeadline, hand, onPlayNope, onWindowClosed }: NopeWindowProps) {
  const [remaining, setRemaining] = useState(() => remainingMs(nopeDeadline));
  // The window's total length, captured the moment each new deadline is observed — the ring's
  // 100% reference point, since the server's actual nopeWindowMs isn't sent to the client.
  const [totalMs, setTotalMs] = useState(() => remainingMs(nopeDeadline));

  useEffect(() => {
    setRemaining(remainingMs(nopeDeadline));
    setTotalMs(remainingMs(nopeDeadline));
    const interval = window.setInterval(() => {
      setRemaining(remainingMs(nopeDeadline));
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [nopeDeadline]);

  const progress = Math.min(1, remaining / Math.max(1, totalMs));
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
