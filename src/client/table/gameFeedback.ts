// Derives sound/haptic feedback (ticket 15) from consecutive server `view` snapshots. The server
// never emits dedicated "a kitten exploded"/"you were attacked" events (ticket 12's view is just
// a state snapshot), so this diffs each new view against the previous one to notice the moments
// that deserve feedback, rather than adding new server events for it.

import { playSound } from "../sound.js";
import { vibrate } from "../haptics.js";
import type { ServerView } from "./gameStore.js";
import { useGameStore } from "./gameStore.js";

const KITTEN_PATTERN = [80, 60, 200];
const ATTACKED_PATTERN = [150];

export function diffViewForFeedback(prev: ServerView | null, next: ServerView): void {
  if (!prev) return;

  if (prev.winner === null && next.winner !== null) {
    playSound("win");
    return;
  }

  if (prev.phase !== "NOPE_WINDOW" && next.phase === "NOPE_WINDOW") {
    playSound("swish");
  }

  if (next.nopeStack.length > prev.nopeStack.length) {
    playSound("nopeStamp");
  }

  if (next.deckSize < prev.deckSize) {
    playSound("draw");
  }

  const defused = prev.phase !== "DEFUSE_REINSERT" && next.phase === "DEFUSE_REINSERT";
  if (defused && next.currentPlayer === next.you) {
    vibrate(KITTEN_PATTERN);
  }
  const eliminatedIndex = next.players.findIndex(
    (player, index) => prev.players[index]?.alive && !player.alive,
  );
  if (eliminatedIndex === next.you) {
    vibrate(KITTEN_PATTERN);
  }
  if (defused || eliminatedIndex !== -1) {
    playSound("explosion");
  }

  if (next.playHistory.length > prev.playHistory.length) {
    for (const entry of next.playHistory.slice(prev.playHistory.length)) {
      if (entry.noped) continue;
      if (entry.effect.kind === "TARGETED_ATTACK" && entry.effect.target === next.you) {
        vibrate(ATTACKED_PATTERN);
      } else if (entry.effect.kind === "ATTACK" && next.currentPlayer === next.you) {
        vibrate(ATTACKED_PATTERN);
      }
    }
  }
}

let previousView: ServerView | null = useGameStore.getState().view;
useGameStore.subscribe((state) => {
  if (state.view && state.view !== previousView) {
    diffViewForFeedback(previousView, state.view);
  }
  previousView = state.view;
});
