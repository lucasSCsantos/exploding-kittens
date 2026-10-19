import { describe, expect, it, vi } from "vitest";
import { vibrate } from "./haptics.js";

describe("vibrate", () => {
  it("does not throw when navigator.vibrate is unavailable (plain Node/old browsers)", () => {
    expect(() => vibrate(100)).not.toThrow();
    expect(() => vibrate([80, 60, 200])).not.toThrow();
  });

  it("calls navigator.vibrate when present", () => {
    const calls: (number | number[])[] = [];
    vi.stubGlobal("navigator", { vibrate: (p: number | number[]) => calls.push(p) });

    vibrate([150]);

    expect(calls).toEqual([[150]]);
    vi.unstubAllGlobals();
  });

  it("degrades silently if navigator.vibrate throws", () => {
    vi.stubGlobal("navigator", {
      vibrate: () => {
        throw new Error("blocked");
      },
    });

    expect(() => vibrate(100)).not.toThrow();
    vi.unstubAllGlobals();
  });
});
