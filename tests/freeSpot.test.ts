import { describe, expect, it } from "vitest";
import { freeSpot, type Rect } from "../src/lib/freeSpot.ts";

const opts = { max: 200, min: 120, edge: 10, gap: 8 };
const hits = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("freeSpot", () => {
  it("takes the biggest square in an empty box, on the right", () => {
    expect(freeSpot(500, 400, [], opts)).toMatchObject({ size: 200, x: 290 });
  });

  it("never touches an obstacle", () => {
    // A heading across the top, rows of pieces down the left, a wide piece lower down.
    const obstacles: Rect[] = [
      { x: 20, y: 20, w: 200, h: 30 },
      { x: 20, y: 70, w: 260, h: 44 },
      { x: 20, y: 130, w: 220, h: 44 },
      { x: 20, y: 260, w: 460, h: 44 },
    ];
    const spot = freeSpot(500, 500, obstacles, opts)!;
    expect(spot).not.toBeNull();
    const square = { x: spot.x, y: spot.y, w: spot.size, h: spot.size };
    for (const r of obstacles) expect(hits(square, { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 })).toBe(false);
    // It sits in the open stretch above the wide piece.
    expect(spot.y + spot.size).toBeLessThanOrEqual(252);
  });

  it("gives up when there's no room", () => {
    expect(freeSpot(500, 400, [{ x: 0, y: 0, w: 480, h: 400 }], opts)).toBeNull();
  });
});
