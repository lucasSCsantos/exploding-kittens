import { describe, expect, it } from "vitest";
import type { Card } from "../../engine/types.js";
import {
  discardPileStack,
  drawPileLayers,
  fanTransform,
  flightOffset,
  hashUid,
  lobbySeatPositions,
  messyOffset,
  opponentSeatPositions,
  stagingRowPosition,
} from "./layout.js";

describe("fanTransform", () => {
  it("centers a single card with no rotation or offset", () => {
    expect(fanTransform(0, 1)).toEqual({ rotateDeg: 0, translateX: 0, translateY: 0 });
  });

  it("mirrors cards symmetrically around the center", () => {
    const left = fanTransform(0, 3);
    const center = fanTransform(1, 3);
    const right = fanTransform(2, 3);

    expect(center).toEqual({ rotateDeg: 0, translateX: 0, translateY: 0 });
    expect(left.rotateDeg).toBe(-right.rotateDeg);
    expect(left.translateX).toBe(-right.translateX);
    expect(left.translateY).toBe(right.translateY);
  });

  it("caps the total spread for large hands", () => {
    const first = fanTransform(0, 20);
    const last = fanTransform(19, 20);
    expect(last.rotateDeg - first.rotateDeg).toBeLessThanOrEqual(54);
  });
});

describe("stagingRowPosition", () => {
  it("centers a single staged card directly above the hand with no rotation", () => {
    expect(stagingRowPosition(0, 1)).toEqual({ rotateDeg: 0, translateX: 0, translateY: -155 });
  });

  it("lays cards out left-to-right by selection order, evenly spaced and unrotated", () => {
    const first = stagingRowPosition(0, 3);
    const second = stagingRowPosition(1, 3);
    const third = stagingRowPosition(2, 3);

    expect(second).toEqual({ rotateDeg: 0, translateX: 0, translateY: -155 });
    expect(first.translateX).toBeLessThan(second.translateX);
    expect(second.translateX).toBeLessThan(third.translateX);
    expect(first.translateX).toBe(-third.translateX);
    expect(first.rotateDeg).toBe(0);
    expect(third.rotateDeg).toBe(0);
  });

  it("sits above the fanned hand regardless of count", () => {
    expect(stagingRowPosition(0, 5).translateY).toBeLessThan(0);
  });
});

describe("opponentSeatPositions", () => {
  it("returns no seats for a single player", () => {
    expect(opponentSeatPositions(1, 0)).toEqual([]);
  });

  it("lists every other seat, starting right after the active seat", () => {
    const seats = opponentSeatPositions(4, 1).map((s) => s.seat);
    expect(seats).toEqual([2, 3, 0]);
  });

  it("spreads seats symmetrically left to right", () => {
    const seats = opponentSeatPositions(3, 0);
    expect(seats[0]!.xPercent).toBeLessThan(50);
    expect(seats[1]!.xPercent).toBeGreaterThan(50);
  });
});

describe("lobbySeatPositions", () => {
  it("returns no seats for an empty table", () => {
    expect(lobbySeatPositions(0)).toEqual([]);
  });

  it("centers a lone seat", () => {
    expect(lobbySeatPositions(1)).toEqual([{ seat: 0, xPercent: 50, yPercent: 50 }]);
  });

  it("spreads every player evenly around the circle", () => {
    const seats = lobbySeatPositions(4);
    expect(seats.map((s) => s.seat)).toEqual([0, 1, 2, 3]);
    expect(seats[0]!.yPercent).toBeLessThan(50); // top
    expect(seats[2]!.yPercent).toBeGreaterThan(50); // bottom
    expect(seats[1]!.xPercent).toBeGreaterThan(50); // right
    expect(seats[3]!.xPercent).toBeLessThan(50); // left
  });
});

describe("hashUid / messyOffset", () => {
  it("is deterministic for the same uid", () => {
    expect(hashUid("card-1")).toBe(hashUid("card-1"));
    expect(messyOffset("card-1")).toEqual(messyOffset("card-1"));
  });

  it("keeps offsets within the expected visual range", () => {
    const offset = messyOffset("some-uid-42");
    expect(Math.abs(offset.rotateDeg)).toBeLessThanOrEqual(20);
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(10);
    expect(Math.abs(offset.y)).toBeLessThanOrEqual(10);
  });
});

describe("drawPileLayers", () => {
  it("has no layers for an empty deck", () => {
    expect(drawPileLayers(0)).toBe(0);
  });

  it("grows with deck size and caps out", () => {
    expect(drawPileLayers(1)).toBe(1);
    expect(drawPileLayers(12)).toBe(2);
    expect(drawPileLayers(1000)).toBe(6);
  });
});

describe("discardPileStack", () => {
  const card = (uid: string): Card => ({ id: "NOPE", uid });

  it("returns an entry with a messy offset for every card when under the cap", () => {
    const discard = [card("a"), card("b"), card("c")];
    const stack = discardPileStack(discard);

    expect(stack.map((entry) => entry.card)).toEqual(discard);
    expect(stack.map((entry) => entry.offset)).toEqual(discard.map((c) => messyOffset(c.uid)));
  });

  it("caps the stack at the last 15 cards, preserving order", () => {
    const discard = Array.from({ length: 20 }, (_, i) => card(`card-${i}`));
    const stack = discardPileStack(discard);

    expect(stack).toHaveLength(15);
    expect(stack.map((entry) => entry.card)).toEqual(discard.slice(5));
  });

  it("returns an empty stack for an empty discard pile", () => {
    expect(discardPileStack([])).toEqual([]);
  });
});

describe("flightOffset", () => {
  it("is zero when source and destination share a center", () => {
    const rect = { top: 10, left: 10, width: 40, height: 60 };
    expect(flightOffset(rect, rect)).toEqual({ dx: 0, dy: 0 });
  });

  it("computes the delta between rect centers, ignoring size differences", () => {
    const from = { top: 0, left: 0, width: 20, height: 20 };
    const to = { top: 100, left: 50, width: 100, height: 100 };
    // from center: (10, 10); to center: (100, 150)
    expect(flightOffset(from, to)).toEqual({ dx: 90, dy: 140 });
  });

  it("supports negative deltas when the destination is above/left of the source", () => {
    const from = { top: 100, left: 100, width: 20, height: 20 };
    const to = { top: 0, left: 0, width: 20, height: 20 };
    expect(flightOffset(from, to)).toEqual({ dx: -100, dy: -100 });
  });
});
