import { describe, expect, it } from "vitest";
import {
  BLOSSOM_SCALE,
  ISLAND_RADIUS,
  PIPO_ORBIT,
  PLACES,
  PLAZA_CLEAR,
  POND,
  RING,
  ringPoint,
  SAKURA_SIZE,
  sakuraBlossoms,
  sakuraToTown,
  scatterFlowers,
  scatterTrees,
} from "../src/game/townLayout.ts";

describe("town layout", () => {
  it("keeps the sakura's blossom clear of Pipo's loop round the shrine", () => {
    // Pipo is about 0.45 across from its middle and bobs 0.2 up and down.
    const pipo = 0.45;
    const low = PIPO_ORBIT.height - 0.2 - pipo;
    const high = PIPO_ORBIT.height + 0.2 + pipo;
    for (const [mx, my, mz, mr] of sakuraBlossoms()) {
      const [x, y, z] = sakuraToTown([mx, my, mz]);
      const r = mr * SAKURA_SIZE;
      const reach = Math.hypot(x, z) + r * BLOSSOM_SCALE[0];
      const bottom = y - r * BLOSSOM_SCALE[1];
      const top = y + r * BLOSSOM_SCALE[1];
      const sameHeight = bottom < high && top > low;
      if (sameHeight) expect(reach).toBeLessThan(PIPO_ORBIT.radius - pipo);
    }
  });

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
