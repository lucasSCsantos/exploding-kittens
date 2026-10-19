// Turns a `PlayHistoryEntry` (engine's public play record, spec §3) into prose for the event log
// sidebar (ticket 16), e.g. "Ana played Skip" — so anyone who looked away can catch up.

import { cardLabel } from "../cards.js";
import type { PlayHistoryEntry } from "../../engine/types.js";

export interface EventLogPlayer {
  id: string;
}

function nameOf(players: EventLogPlayer[], index: number): string {
  return players[index]?.id ?? `Jogador ${index}`;
}

export function describeHistoryEntry(entry: PlayHistoryEntry, players: EventLogPlayer[]): string {
  const actor = nameOf(players, entry.player);
  const effect = entry.effect;

  let text: string;
  switch (effect.kind) {
    case "ATTACK":
      text = `${actor} jogou Ataque`;
      break;
    case "TARGETED_ATTACK":
      text = `${actor} jogou Ataque Direcionado em ${nameOf(players, effect.target)}`;
      break;
    case "SKIP":
      text = `${actor} jogou Pular`;
      break;
    case "FAVOR":
      text = `${actor} jogou Favor em ${nameOf(players, effect.target)}`;
      break;
    case "SHUFFLE":
      text = `${actor} jogou Embaralhar`;
      break;
    case "SEE_FUTURE":
      text = `${actor} jogou Ver o Futuro`;
      break;
    case "ALTER_FUTURE":
      text = `${actor} jogou Alterar o Futuro`;
      break;
    case "DRAW_FROM_BOTTOM":
      text = `${actor} comprou do fundo do baralho`;
      break;
    case "PAIR":
      text = `${actor} jogou um par, roubando uma carta de ${nameOf(players, effect.target)}`;
      break;
    case "TRIPLE":
      text = `${actor} jogou um trio, pedindo ${cardLabel(effect.namedCard)} para ${nameOf(players, effect.target)}`;
      break;
    case "FIVE_DIFFERENT":
      text = `${actor} jogou cinco cartas diferentes, pegando uma do descarte`;
      break;
  }

  return entry.noped ? `${text} — Cancelado!` : text;
}
