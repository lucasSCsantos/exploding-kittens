// The single place the client maps a card ID + card instance to an image (ticket 09).
// The engine itself never references images.

import type { Card, CardId } from "../engine/types.js";
import type { PlayerView } from "../engine/view.js";

export const CARD_TYPE_TO_FILES: Record<CardId, string[]> = {
  EK: ["exploding_kitten.jpg", "exploding_kitten2.jpg", "exploding_kitten3.jpg"],
  DEF: ["defuse.jpg", "defuse2.jpg", "defuse3.jpg", "defuse4.jpg", "defuse5.jpg", "defuse6.jpg"],
  NOPE: ["nope.jpg"],
  ATK: ["attack.jpg", "attack2.jpg", "attack3.jpg", "attack4.jpg"],
  TATK: ["targeted_attack.jpg", "targeted_attack2.jpg", "targeted_attack3.jpg"],
  SKIP: ["skip.jpg", "skip2.jpg", "skip3.jpg"],
  FAV: ["favor.jpg", "favor2.jpg", "favor3.jpg", "favor4.jpg"],
  SHUF: ["shuffle.jpg", "shuffle2.jpg", "shuffle3.jpg", "shuffle4.jpg"],
  STF: ["see_the_future.jpg", "see_the_future2.jpg", "see_the_future3.jpg"],
  ATF: ["alter_the_future.jpg", "alter_the_future2.jpg", "alter_the_future3.jpg", "alter_the_future4.jpg"],
  DFB: ["draw_from_the_bottom.jpg", "draw_from_the_bottom2.jpg"],
  CAT_TACOCAT: ["taco_cat.jpg"],
  CAT_HAIRYPOTATO: ["hairy_potato_cat.jpg"],
  CAT_RAINBOW: ["rainbow_cat.jpg"],
  CAT_BEARD: ["beard_cat.jpg"],
  CAT_CATTERMELON: ["cattermelon.jpg"],
  FERAL: ["feral_cat.jpg"],
};

/** Human-readable names for the event log (ticket 16) and anywhere else a card needs prose. */
export const CARD_LABELS: Record<CardId, string> = {
  EK: "Exploding Kitten",
  DEF: "Defuse",
  NOPE: "Nope",
  ATK: "Attack",
  TATK: "Targeted Attack",
  SKIP: "Skip",
  FAV: "Favor",
  SHUF: "Shuffle",
  STF: "See the Future",
  ATF: "Alter the Future",
  DFB: "Draw from the Bottom",
  CAT_TACOCAT: "Tacocat",
  CAT_HAIRYPOTATO: "Hairy Potato Cat",
  CAT_RAINBOW: "Rainbow Ralphing Cat",
  CAT_BEARD: "Beard Cat",
  CAT_CATTERMELON: "Cattermelon",
  FERAL: "Feral Cat",
};

export function cardLabel(cardId: CardId): string {
  return CARD_LABELS[cardId];
}

const CARD_BACK_FILE = "back.jpg";

const images = import.meta.glob("../../explodding/*.jpg", { eager: true }) as Record<
  string,
  { default: string }
>;

const imagesByFilename = new Map<string, string>(
  Object.entries(images).map(([path, mod]) => [path.split("/").pop()!, mod.default]),
);

function resolveImage(filename: string): string {
  const url = imagesByFilename.get(filename);
  if (!url) {
    throw new Error(`cards.ts: no image file found for "${filename}"`);
  }
  return url;
}

/** uid -> stable index into that card's CARD_TYPE_TO_FILES list, for the lifetime of the module. */
const designAssignments = new Map<string, number>();

function visibleCards(view: PlayerView): Card[] {
  const cards = [...view.hand, ...view.discard, ...view.knownDeck.map((entry) => entry.card)];
  if (view.pendingAction?.type === "DEFUSE_REINSERT") {
    cards.push(view.pendingAction.kitten);
  }
  return cards;
}

/** Assigns a stable design to every card instance visible in `view` that hasn't been assigned one yet. */
export function assignDesigns(view: PlayerView): void {
  for (const card of visibleCards(view)) {
    if (!designAssignments.has(card.uid)) {
      const files = CARD_TYPE_TO_FILES[card.id];
      designAssignments.set(card.uid, Math.floor(Math.random() * files.length));
    }
  }
}

export function getCardImage(cardId: CardId, instanceId: string): string {
  const files = CARD_TYPE_TO_FILES[cardId];
  const index = designAssignments.get(instanceId) ?? 0;
  return resolveImage(files[index % files.length]!);
}

export function getCardBackImage(): string {
  return resolveImage(CARD_BACK_FILE);
}
