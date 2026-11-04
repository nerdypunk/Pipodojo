// Finds an empty square along the right edge of a box, clear of everything in it (used to float
// the message cube over the lesson card without ever covering words). Pure: just rectangles.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Spot {
  x: number;
  y: number;
  size: number;
}

interface Options {
  /** Biggest and smallest square worth showing, in pixels. */
  max: number;
  min: number;
  /** Space kept from the box's edges and from every obstacle. */
  edge: number;
  gap: number;
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * The biggest square that fits against the right edge of a `width` x `height` box without
 * touching any obstacle (all in the box's own coordinates). Of the places it fits, it takes the
 * middle of the highest open stretch. Null if not even `min` fits.
 */
export function freeSpot(width: number, height: number, obstacles: readonly Rect[], { max, min, edge, gap }: Options): Spot | null {
  const blocked = obstacles.map((r) => ({ x: r.x - gap, y: r.y - gap, w: r.w + gap * 2, h: r.h + gap * 2 }));
  for (let size = Math.min(max, width - edge * 2, height - edge * 2); size >= min; size -= 8) {
    const x = width - edge - size;
    const open: number[] = [];
    for (let y = edge; y + size <= height - edge; y += 4) {
      const square = { x, y, w: size, h: size };
      if (blocked.some((r) => overlaps(r, square))) {
        if (open.length) break;
      } else open.push(y);
    }
    if (open.length) return { x, y: open[Math.floor(open.length / 2)]!, size };
  }
  return null;
}
