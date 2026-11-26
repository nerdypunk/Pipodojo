// Whether the town is the grown-ups' night city. Shared parts (roads, cars, name tags) read it to
// switch to their night colors; the night-only scenery lives in city.tsx.
import { createContext, useContext } from "react";

export const NightContext = createContext(false);
export const useNight = () => useContext(NightContext);

/**
 * The night city's palette: soft lavender-slate walls and moonlit grass, lit by magenta and cyan
 * neon. Kept light on purpose: the moonlight tints it blue, and too dark a town lost all its detail.
 */
export const NIGHT = {
  wall: "#7a7dc0",
  wallDark: "#6366ab",
  wallLight: "#8f93d2",
  trim: "#a3a7e0",
  roof: "#6a6db2",
  /** Grass, as on the kids' island, in moonlight. */
  ground: "#5fae6e",
  road: "#3a3868",
  pavement: "#9a9dcf",
  base: "#3d3a73",
  baseEdge: "#2c2a5c",
  magenta: "#ff4fd8",
  cyan: "#4ff3ff",
  warm: "#ffd9a8",
  /** A lit window: nearly white with a pink cast, as in the reference. */
  window: "#ffe8ff",
  windowOff: "#3a3c78",
} as const;
