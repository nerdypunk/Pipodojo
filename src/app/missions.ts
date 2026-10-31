import { loadMissions } from "../engine/missionLoader.ts";
import type { Lang, Mission } from "../engine/types.ts";

const files = import.meta.glob("../../missions/*.json", { eager: true, import: "default" });
const spanishFiles = import.meta.glob("../../missions/es/*.json", { eager: true, import: "default" });

/** All English missions, validated at load. Sorted by persona, path, then order. */
export const missions = loadMissions(files);

const spanish = new Map(loadMissions(spanishFiles).map((m) => [m.id, m]));

/**
 * The lessons in a language, in the same order as the English ones. Each Spanish lesson is a
 * full twin of its English one (tests keep them in step); any lesson without a twin falls back
 * to English, so a missing translation never breaks the game.
 */
export function missionsIn(lang: Lang): Mission[] {
  return lang === "en" ? missions : missions.map((m) => spanish.get(m.id) ?? m);
}
