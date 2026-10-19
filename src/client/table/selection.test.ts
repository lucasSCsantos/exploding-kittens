import { describe, expect, it } from "vitest";
import { classifySelectionShape, classifySinglePlay } from "./selection.js";
import type { Card } from "../../engine/types.js";

function card(id: Card["id"], uid: string): Card {
  return { id, uid };
}

describe("classifySinglePlay", () => {
  it("maps plain action cards to an immediate dispatch", () => {
    for (const id of ["ATK", "SKIP", "SHUF", "STF", "DFB"] as const) {
      const play = classifySinglePlay(id);
      expect(play.kind).toBe("simple");
      if (play.kind === "simple") {
        expect(play.toAction("uid-1").type).toBe(
          { ATK: "PLAY_ATTACK", SKIP: "PLAY_SKIP", SHUF: "PLAY_SHUFFLE", STF: "PLAY_SEE_FUTURE", DFB: "PLAY_DRAW_FROM_BOTTOM" }[
            id
          ],
        );
      }
    }
  });

  it("maps targeted cards to a play requiring a target", () => {
    const tatk = classifySinglePlay("TATK");
    expect(tatk.kind).toBe("target");
    if (tatk.kind === "target") {
      expect(tatk.toAction("uid-1", 2)).toEqual({
        type: "PLAY_TARGETED_ATTACK",
        cardUid: "uid-1",
        target: 2,
      });
    }

    const fav = classifySinglePlay("FAV");
    expect(fav.kind).toBe("target");
    if (fav.kind === "target") {
      expect(fav.toAction("uid-1", 2)).toEqual({ type: "PLAY_FAVOR", cardUid: "uid-1", target: 2 });
    }
  });

  it("flags Alter the Future as needing its own overlay", () => {
    expect(classifySinglePlay("ATF")).toEqual({ kind: "alterFuture" });
  });

  it("flags cards with no standalone play as unplayable", () => {
    for (const id of ["EK", "DEF", "NOPE", "CAT_TACOCAT", "FERAL"] as const) {
      expect(classifySinglePlay(id)).toEqual({ kind: "unplayable" });
    }
  });
});

describe("classifySelectionShape", () => {
  it("buckets by selection size", () => {
    expect(classifySelectionShape([])).toEqual({ size: 0 });

    const one = [card("SKIP", "a")];
    expect(classifySelectionShape(one)).toEqual({ size: 1, cards: one });

    const two = [card("CAT_TACOCAT", "a"), card("CAT_TACOCAT", "b")];
    expect(classifySelectionShape(two)).toEqual({ size: 2, cards: two });

    const three = [card("CAT_TACOCAT", "a"), card("CAT_TACOCAT", "b"), card("CAT_TACOCAT", "c")];
    expect(classifySelectionShape(three)).toEqual({ size: 3, cards: three });

    const five = [
      card("SKIP", "a"),
      card("ATK", "b"),
      card("SHUF", "c"),
      card("STF", "d"),
      card("DFB", "e"),
    ];
    expect(classifySelectionShape(five)).toEqual({ size: 5, cards: five });

    const four = five.slice(0, 4);
    expect(classifySelectionShape(four)).toEqual({ size: "other", cards: four });
  });
});
