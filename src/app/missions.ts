import { loadMissions } from "../engine/missionLoader.ts";

const files = import.meta.glob("../../missions/*.json", { eager: true, import: "default" });

/** All missions, validated at load. Sorted by persona, then order. */
export const missions = loadMissions(files);
