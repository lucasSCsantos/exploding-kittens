import { describe, expect, it } from "vitest";
import { playSound } from "./sound.js";

describe("playSound", () => {
  it("does not throw in an environment without real audio playback (plain Node/jsdom)", () => {
    expect(() => playSound("swish")).not.toThrow();
    expect(() => playSound("draw")).not.toThrow();
    expect(() => playSound("nopeStamp")).not.toThrow();
    expect(() => playSound("explosion")).not.toThrow();
    expect(() => playSound("win")).not.toThrow();
  });
});
