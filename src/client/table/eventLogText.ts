// Turns a `PlayHistoryEntry` (engine's public play record, spec §3) into prose for the event log
// sidebar (ticket 16), e.g. "Ana played Skip" — so anyone who looked away can catch up.

import { cardLabel } from "../cards.js";
import type { PlayHistoryEntry } from "../../engine/types.js";

export interface EventLogPlayer {
  id: string;
}

function nameOf(players: EventLogPlayer[], index: number): string {
  return players[index]?.id ?? `Player ${index}`;
}

export function describeHistoryEntry(entry: PlayHistoryEntry, players: EventLogPlayer[]): string {
  const actor = nameOf(players, entry.player);
  const effect = entry.effect;

  let text: string;
  switch (effect.kind) {
    case "ATTACK":
      text = `${actor} played Attack`;
      break;
    case "TARGETED_ATTACK":
      text = `${actor} played Targeted Attack on ${nameOf(players, effect.target)}`;
      break;
    case "SKIP":
      text = `${actor} played Skip`;
      break;
    case "FAVOR":
      text = `${actor} played Favor on ${nameOf(players, effect.target)}`;
      break;
    case "SHUFFLE":
      text = `${actor} played Shuffle`;
      break;
    case "SEE_FUTURE":
      text = `${actor} played See the Future`;
      break;
    case "ALTER_FUTURE":
      text = `${actor} played Alter the Future`;
      break;
    case "DRAW_FROM_BOTTOM":
      text = `${actor} drew from the bottom of the deck`;
      break;
    case "PAIR":
      text = `${actor} played a pair, stealing a card from ${nameOf(players, effect.target)}`;
      break;
    case "TRIPLE":
      text = `${actor} played a triple, asking ${nameOf(players, effect.target)} for ${cardLabel(effect.namedCard)}`;
      break;
    case "FIVE_DIFFERENT":
      text = `${actor} played five different cards, taking one from the discard`;
      break;
  }

  return entry.noped ? `${text} — Noped!` : text;
}
