import { describe, expect, it } from "vitest";
import { ISLAND_RADIUS, PLACES, PLAZA_CLEAR, POND, RING, ringPoint, scatterFlowers, scatterTrees } from "../src/game/townLayout.ts";

describe("town layout", () => {
  it("scatters the same trees every time, clear of places, plaza and the edge", () => {
    const trees = scatterTrees(60);
    expect(trees.length).toBeGreaterThan(40);
    expect(scatterTrees(60)).toEqual(trees);
    for (const t of trees) {
      expect(Math.hypot(t.x, t.z)).toBeLessThan(ISLAND_RADIUS);
      expect(Math.max(Math.abs(t.x), Math.abs(t.z))).toBeGreaterThan(PLAZA_CLEAR);
      for (const p of PLACES) expect(Math.hypot(t.x - p.at[0], t.z - p.at[1])).toBeGreaterThanOrEqual(p.clear);
    }
  });

  it("drives cars round the ring road and back to the start", () => {
    for (const t of [0, 0.13, 0.4, 0.77]) {
      const p = ringPoint(t);
      expect(Math.max(Math.abs(p.x), Math.abs(p.z))).toBeCloseTo(RING.half);
    }
    expect(ringPoint(1)).toEqual(ringPoint(0));
  });
});

describe("flowers and the pond", () => {
  it("keeps trees and flowers out of the pond", () => {
    for (const p of [...scatterTrees(60), ...scatterFlowers(40)]) {
      expect(Math.hypot(p.x - POND.at[0], p.z - POND.at[1])).toBeGreaterThan(POND.radius);
    }
    expect(scatterFlowers(40).length).toBeGreaterThan(100);
  });
});
