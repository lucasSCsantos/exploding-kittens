// Full-screen moment for the viewer's own elimination (ticket 25): shows the kitten that got
// them, then auto-dismisses back into spectating the rest of the game. Table.tsx owns the
// dismiss timer — this component is purely presentational.

import { motion } from "motion/react";
import { CardFace } from "../table/CardFace.js";
import type { Card } from "../../engine/types.js";

export interface EliminationOverlayProps {
  card: Card | null;
}

export function EliminationOverlay({ card }: EliminationOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/85">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.45, bounce: 0.3 }}
      >
        {card && <CardFace card={card} size="large" />}
      </motion.div>
      <p className="text-3xl font-bold text-red-400">Você foi eliminado!</p>
      <p className="text-sm text-neutral-300">Acompanhando o resto do jogo…</p>
    </div>
  );
}
