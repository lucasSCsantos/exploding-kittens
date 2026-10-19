import { describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  assignDesigns,
  cardLabel,
  getCardImage,
  getCardBackImage,
  preloadCardImages,
  CARD_TYPE_TO_FILES,
} from "./cards.js";
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
    explodedKittens: [],
    ...overrides,
  };
}

describe("CARD_TYPE_TO_FILES", () => {
  it("has an entry for every CardId", () => {
    for (const cardId of ALL_CARD_IDS) {
      expect(CARD_TYPE_TO_FILES[cardId]?.length).toBeGreaterThan(0);
    }
  });

  it("only lists files whose source .jpg and generated .webp both exist in explodding/", () => {
    for (const files of Object.values(CARD_TYPE_TO_FILES)) {
      for (const file of files) {
        expect(existsSync(`${explodingDir}${file}`), `${file} should exist in explodding/`).toBe(true);
        const webpFile = file.replace(/\.jpg$/, ".webp");
        expect(
          existsSync(`${explodingDir}${webpFile}`),
          `${webpFile} should exist in explodding/ (run \`npm run optimize-images\`)`,
        ).toBe(true);
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

  it("resolves to the optimized .webp asset, not the source .jpg", () => {
    expect(getCardBackImage()).toMatch(/\.webp($|\?)/);
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

describe("preloadCardImages", () => {
  it("resolves without throwing in an environment with no Image constructor (plain Node)", async () => {
    // Fresh module instance: preloadCardImages() caches its result, and another test in this
    // file already primed that cache via a stubbed `Image`.
    vi.resetModules();
    const fresh = await import("./cards.js");
    await expect(fresh.preloadCardImages()).resolves.toBeUndefined();
  });

  it("starts loading every resolvable card image via a real Image element", async () => {
    vi.resetModules();
    const created: { src: string; onload: (() => void) | null }[] = [];
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          created.push(this as unknown as { src: string; onload: (() => void) | null });
        }
      },
    );

    const fresh = await import("./cards.js");
    const pending = fresh.preloadCardImages();
    expect(created.length).toBeGreaterThan(0);
    created.forEach((img) => img.onload?.());
    await expect(pending).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });

  it("degrades to a no-op resolve if an image fails to load", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );

    const fresh = await import("./cards.js");
    await expect(fresh.preloadCardImages()).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });

  it("caches its result so a second call doesn't recreate Image elements", async () => {
    vi.resetModules();
    let createdCount = 0;
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          createdCount++;
          queueMicrotask(() => this.onload?.());
        }
      },
    );

    const fresh = await import("./cards.js");
    await fresh.preloadCardImages();
    const countAfterFirstCall = createdCount;
    await fresh.preloadCardImages();

    expect(createdCount).toBe(countAfterFirstCall);

    vi.unstubAllGlobals();
  });
});
