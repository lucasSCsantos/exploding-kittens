// A shared toast for `lastError` (both server-rejected actions and client-side failures), shown
// bottom-right everywhere it can fire — the table, the lobby, the new-game form — instead of each
// screen rendering its own inline red text in a different spot.

import { AnimatePresence, motion } from "motion/react";
import { useGameStore } from "./gameStore.js";

export function ErrorToast() {
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {lastError && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-red-400/40 bg-red-950/95 p-4 text-red-100 shadow-xl backdrop-blur"
            role="alert"
          >
            <span aria-hidden className="mt-0.5 text-lg leading-none text-red-300">
              ⚠
            </span>
            <p className="flex-1 text-sm leading-snug">{lastError}</p>
            <button
              type="button"
              onClick={clearError}
              aria-label="Dispensar aviso"
              className="-m-1 rounded p-1 text-red-300 transition hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
