// Where everything sits in Pipodojo Town (world units, y up, z toward the camera).
// Pure data and maths, so the scatter of trees can be tested without a browser.
import type { Persona } from "../engine/types.ts";

export type Vec2 = readonly [x: number, z: number];

export const ISLAND_RADIUS = 13;
/** The square ring road around the dojo plaza: half its size, and the road's width. */
export const RING = { half: 4.4, width: 1.1 };
/** Straight roads from the ring out to the edge of the island. */
export const SPOKE_END = 11.6;

export type PlaceId = Persona | "garage";

export interface Place {
  id: PlaceId;
  at: Vec2;
  /** Turn around y, in radians, so the front faces a road and the camera. */
  turn: number;
  /** Keep trees this far from the centre. */
  clear: number;
  /** Height of the floating name tag. */
  tag: number;
}

export const PLACES: readonly Place[] = [
  { id: "parent", at: [-7.9, 4.3], turn: 0.35, clear: 3.0, tag: 3.9 },
  { id: "business", at: [7.4, 4.6], turn: 0, clear: 3.2, tag: 4.1 },
  { id: "student", at: [7.2, -6.6], turn: 0, clear: 3.6, tag: 4.6 },
  { id: "kid", at: [-7.2, -6.6], turn: Math.PI / 4, clear: 3.2, tag: 4.1 },
  { id: "garage", at: [-2.9, 8.6], turn: 0, clear: 1.9, tag: 2.6 },
];

export const placeOf = (id: PlaceId) => PLACES.find((p) => p.id === id)!;

/** A pond near the front edge; its stream spills over the edge as a waterfall. */
export const POND = { at: [4.3, 9.7] as Vec2, radius: 1.35 };

/** Dojo plaza in the middle (inside the ring road). */
export const PLAZA_CLEAR = RING.half + RING.width;

/** A point on the ring road loop, t from 0 to 1. `heading` is the y turn that faces along the road. */
export function ringPoint(t: number): { x: number; z: number; heading: number } {
  const h = RING.half;
  const side = ((t % 1) + 1) % 1 * 4;
  const i = Math.floor(side);
  const f = side - i;
  // Corners: front-left, front-right, back-right, back-left.
  if (i === 0) return { x: -h + 2 * h * f, z: h, heading: 0 };
  if (i === 1) return { x: h, z: h - 2 * h * f, heading: Math.PI / 2 };
  if (i === 2) return { x: h - 2 * h * f, z: -h, heading: Math.PI };
  return { x: -h, z: -h + 2 * h * f, heading: -Math.PI / 2 };
}

/** Small deterministic random numbers, so the town looks the same on every visit. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function onRoad(x: number, z: number, margin: number): boolean {
  const w = RING.width / 2 + margin;
  const ring = Math.max(Math.abs(x), Math.abs(z));
  if (Math.abs(ring - RING.half) < w) return true;
  // Spokes along both axes, out from the ring.
  return (Math.abs(x) < w && Math.abs(z) > RING.half) || (Math.abs(z) < w && Math.abs(x) > RING.half);
}

function blocked(x: number, z: number, roadMargin: number): boolean {
  if (Math.max(Math.abs(x), Math.abs(z)) < PLAZA_CLEAR + 0.4) return true;
  if (onRoad(x, z, roadMargin)) return true;
  if (Math.hypot(x - POND.at[0], z - POND.at[1]) < POND.radius + 0.9) return true;
  // The stream from the pond out to the edge.
  if (x > POND.at[0] - 0.6 && x < POND.at[0] + 1.6 && z > POND.at[1]) return true;
  return PLACES.some((p) => Math.hypot(x - p.at[0], z - p.at[1]) < p.clear);
}

export interface TreeSpot {
  x: number;
  z: number;
  scale: number;
  kind: "round" | "pine" | "blossom";
}

/** Trees everywhere that isn't a road, a place, the plaza or the island's edge. */
export function scatterTrees(count: number, seed = 7): TreeSpot[] {
  const rand = seeded(seed);
  const trees: TreeSpot[] = [];
  for (let tries = 0; trees.length < count && tries < count * 60; tries++) {
    const angle = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (ISLAND_RADIUS - 0.9);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (blocked(x, z, 0.45)) continue;
    if (trees.some((t) => Math.hypot(x - t.x, z - t.z) < 1.4)) continue;
    const roll = rand();
    trees.push({ x, z, scale: 0.75 + rand() * 0.5, kind: roll < 0.3 ? "pine" : roll < 0.45 ? "blossom" : "round" });
  }
  return trees;
}

export interface FlowerSpot {
  x: number;
  z: number;
  /** Index into the flower colours. */
  color: number;
}

/** Little flowers in small clumps on the grass, clear of roads and buildings. */
export function scatterFlowers(clumps: number, seed = 11): FlowerSpot[] {
  const rand = seeded(seed);
  const flowers: FlowerSpot[] = [];
  for (let tries = 0, made = 0; made < clumps && tries < clumps * 40; tries++) {
    const angle = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (ISLAND_RADIUS - 0.6);
    const cx = Math.cos(angle) * r;
    const cz = Math.sin(angle) * r;
    if (blocked(cx, cz, 0.3)) continue;
    made++;
    const color = Math.floor(rand() * 4);
    for (let i = 0; i < 5; i++) {
      const x = cx + (rand() - 0.5) * 0.7;
      const z = cz + (rand() - 0.5) * 0.7;
      if (!blocked(x, z, 0.25)) flowers.push({ x, z, color });
    }
  }
  return flowers;
}
