import { describe, expect, it } from "vitest";
import { confettiBurst } from "./confetti.js";

describe("confettiBurst", () => {
  it("produces the requested number of particles", () => {
    expect(confettiBurst(24)).toHaveLength(24);
  });

  it("is deterministic for the same count", () => {
    expect(confettiBurst(24)).toEqual(confettiBurst(24));
  });

  it("spreads particles across the full circle instead of clumping", () => {
    const particles = confettiBurst(24);
    const angles = particles.map((p) => p.angleDeg);
    expect(Math.min(...angles)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...angles)).toBeLessThan(360);
    // No two particles should land on the exact same angle.
    expect(new Set(angles).size).toBe(angles.length);
  });

  it("varies distance, color, and delay so the burst doesn't look uniform", () => {
    const particles = confettiBurst(24);
    expect(new Set(particles.map((p) => p.distance)).size).toBeGreaterThan(1);
    expect(new Set(particles.map((p) => p.color)).size).toBeGreaterThan(1);
    expect(new Set(particles.map((p) => p.delaySec)).size).toBeGreaterThan(1);
  });

  it("keeps every distance and delay within a sane animated range", () => {
    for (const p of confettiBurst(24)) {
      expect(p.distance).toBeGreaterThan(0);
      expect(p.distance).toBeLessThanOrEqual(220);
      expect(p.delaySec).toBeGreaterThanOrEqual(0);
      expect(p.delaySec).toBeLessThan(0.4);
    }
  });
});
