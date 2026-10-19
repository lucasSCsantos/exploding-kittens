import { describe, expect, it } from "vitest";
import {
  drawPileLayers,
  fanTransform,
  hashUid,
  lobbySeatPositions,
  messyOffset,
  opponentSeatPositions,
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
