import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assignDesigns, cardLabel, getCardImage, getCardBackImage, CARD_TYPE_TO_FILES } from "./cards.js";
import type { CardId } from "../engine/types.js";
import type { PlayerView } from "../engine/view.js";

const ALL_CARD_IDS = Object.keys(CARD_TYPE_TO_FILES) as CardId[];

const explodingDir = fileURLToPath(new URL("../../explodding/", import.meta.url));

function emptyView(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    you: 0,
    players: [],
    currentPlayer: 0,
    turnsRemaining: 1,
    deckSize: 0,
    discard: [],
    hand: [],
    knownDeck: [],
    pendingAction: null,
    nopeStack: [],
    playHistory: [],
    phase: "ACTION",
    winner: null,
    ...overrides,
  };
}

describe("CARD_TYPE_TO_FILES", () => {
  it("has an entry for every CardId", () => {
    for (const cardId of ALL_CARD_IDS) {
      expect(CARD_TYPE_TO_FILES[cardId]?.length).toBeGreaterThan(0);
    }
  });

  it("only lists files that actually exist in explodding/", () => {
    for (const files of Object.values(CARD_TYPE_TO_FILES)) {
      for (const file of files) {
        expect(existsSync(`${explodingDir}${file}`), `${file} should exist in explodding/`).toBe(true);
      }
    }
  });
});

describe("getCardImage", () => {
  it("resolves the same instance to the same image across repeated calls within a game", () => {
    const view = emptyView({
      hand: [
        { id: "ATK", uid: "atk-1" },
        { id: "CAT_TACOCAT", uid: "cat-1" },
      ],
    });

    assignDesigns(view);

    const first = getCardImage("ATK", "atk-1");
    const second = getCardImage("ATK", "atk-1");
    const third = getCardImage("ATK", "atk-1");

    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("resolves every CardId to a non-empty image URL", () => {
    for (const cardId of ALL_CARD_IDS) {
      const uid = `${cardId}-instance`;
      assignDesigns(emptyView({ hand: [{ id: cardId, uid }] }));
      expect(getCardImage(cardId, uid)).toMatch(/\S/);
    }
  });
});

describe("cardLabel", () => {
  it("gives every CardId a non-empty, human-readable label", () => {
    for (const cardId of ALL_CARD_IDS) {
      expect(cardLabel(cardId)).toMatch(/\S/);
    }
  });
});

describe("getCardBackImage", () => {
  it("resolves to a non-empty image URL", () => {
    expect(getCardBackImage()).toMatch(/\S/);
  });
});
