// The game-over overlay: emphasizes the winner with a large avatar/name and a brief confetti
// burst (ticket 23), rather than a plain text line. Host/non-host "Play again" behavior is
// unchanged from before this ticket.

import { motion } from "motion/react";
import { confettiBurst } from "./confetti.js";

const CONFETTI_COUNT = 28;
const CONFETTI_SPRING = { type: "spring", duration: 0.9, bounce: 0.35 } as const;
const AVATAR_SPRING = { type: "spring", duration: 0.5, bounce: 0.45 } as const;

export interface WinScreenProps {
  winnerName: string;
  isHost: boolean;
  playAgainDisabled: boolean;
  onPlayAgain: () => void;
}

export function WinScreen({ winnerName, isHost, playAgainDisabled, onPlayAgain }: WinScreenProps) {
  const particles = confettiBurst(CONFETTI_COUNT);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black/70">
      <div className="relative flex h-40 w-40 items-center justify-center">
        {particles.map((particle, i) => {
          const angleRad = (particle.angleDeg * Math.PI) / 180;
          const dx = Math.cos(angleRad) * particle.distance;
          const dy = Math.sin(angleRad) * particle.distance;
          return (
            <motion.span
              key={i}
              aria-hidden
              className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: particle.color }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: dx, y: dy, opacity: 0, rotate: particle.rotateDeg }}
              transition={{ ...CONFETTI_SPRING, delay: particle.delaySec }}
            />
          );
        })}

        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={AVATAR_SPRING}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-amber-500 text-4xl font-bold text-neutral-900 shadow-[0_0_30px_8px_rgba(251,191,36,0.5)]"
        >
          {winnerName.slice(0, 2).toUpperCase()}
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="text-4xl font-bold text-amber-300"
      >
        {winnerName} wins!
      </motion.p>

      {isHost ? (
        <button
          type="button"
          disabled={playAgainDisabled}
          onClick={onPlayAgain}
          className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 disabled:opacity-50"
        >
          Play again
        </button>
      ) : (
        <p className="text-sm text-neutral-300">Waiting for the host to start a new round…</p>
      )}
    </div>
  );
}
