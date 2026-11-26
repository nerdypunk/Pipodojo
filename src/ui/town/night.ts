// Whether the town is the grown-ups' night city. Shared parts (roads, cars, name tags) read it to
// switch to their night colors; the night-only scenery lives in city.tsx.
import { createContext, useContext } from "react";

export const NightContext = createContext(false);
export const useNight = () => useContext(NightContext);

/** The night city's palette: dark slate walls lit by magenta and cyan neon, like a city after dark. */
export const NIGHT = {
  wall: "#3b3d6e",
  wallDark: "#2c2d58",
  wallLight: "#4a4c80",
  trim: "#55588f",
  roof: "#30315e",
  ground: "#262650",
  road: "#1d1c3d",
  pavement: "#3c3d6c",
  base: "#191838",
  baseEdge: "#121130",
  magenta: "#ff4fd8",
  cyan: "#4ff3ff",
  warm: "#ffd9a8",
  /** A lit window: nearly white with a pink cast, as in the reference. */
  window: "#ffe8ff",
  windowOff: "#232350",
} as const;
