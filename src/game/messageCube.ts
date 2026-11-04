// The message cube (desktop only): a little 2x2x2 puzzle cube that floats beside a lesson. Every
// good piece of the lesson owns a chunk of the cube; weak pieces own none, so after Check they
// bounce off, and neutral pieces end up as a small sprinkle on top. Pure: no React, no three.js.
import type { Mission, Piece } from "../engine/types.ts";

/** A cubie's place in the cube: x, y, z are each 0 or 1 (y is up, z faces the player). */
export type Cell = readonly [number, number, number];

/**
 * The cube's eight cells in an order where each one touches the next, so any run of them is one
 * connected chunk. The first good piece (usually "what you want") gets the bottom, like a base.
 */
const PATH: readonly Cell[] = [
  [0, 0, 1],
  [1, 0, 1],
  [1, 0, 0],
  [0, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [1, 1, 1],
  [0, 1, 1],
];

export const CELLS = PATH;

export interface CubePiece {
  id: string;
  quality: Piece["quality"];
  /** Good pieces: the cells this piece fills. Others: the shape it shows while floating. */
  cells: Cell[];
  /** Index into the cube's soft colour list. */
  color: number;
}

/** Splits n into `parts` sizes as even as possible, biggest first (8 in 3 → 3, 3, 2). */
function sizes(n: number, parts: number): number[] {
  return Array.from({ length: parts }, (_, i) => Math.floor(n / parts) + (i < n % parts ? 1 : 0));
}

/** Every piece of the lesson, with its chunk of the cube (or its floating shape). */
export function cubePieces(mission: Mission): CubePiece[] {
  const all = mission.slots.flatMap((slot) => slot.pieces);
  const good = all.filter((p) => p.quality === "good").slice(0, PATH.length);
  const chunks = sizes(PATH.length, Math.max(1, good.length));
  let at = 0;
  const homes = new Map<string, Cell[]>();
  good.forEach((piece, i) => {
    homes.set(piece.id, PATH.slice(at, at + chunks[i]!));
    at += chunks[i]!;
  });
  return all.map((piece, i) => ({
    id: piece.id,
    quality: piece.quality,
    // Before Check every piece looks alike: a weak one is a little two-cube block, a neutral one a single cube.
    cells: homes.get(piece.id) ?? (piece.quality === "weak" ? [[0, 0, 0], [1, 0, 0]] : [[0, 0, 0]]),
    color: i,
  }));
}

/** How the cube came out after Check, for its caption. */
export type CubeVerdict = "fits" | "gaps" | "bumps";

export function cubeVerdict(pieces: readonly CubePiece[], picks: readonly string[]): CubeVerdict {
  if (pieces.some((p) => p.quality === "weak" && picks.includes(p.id))) return "bumps";
  if (pieces.some((p) => p.quality === "good" && !picks.includes(p.id))) return "gaps";
  return "fits";
}
