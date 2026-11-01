// "Which prompt wins?" and Pick a prompt run on real lessons: every pairing must point at a real
// lesson and flaw, in both languages, and the weaker message must really differ from the best one.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPromptReady } from "../src/engine/brief.ts";
import { loadMissions } from "../src/engine/missionLoader.ts";
import { bestPicks, keySetups } from "../src/engine/setups.ts";
import { VERSUS_ROUNDS } from "../src/game/versus.ts";
import { MISSIONS_DIR, readMissionFiles } from "./helpers.ts";

const spanish: Record<string, unknown> = {};
for (const n of readdirSync(join(MISSIONS_DIR, "es")).filter((f) => f.endsWith(".json"))) {
  spanish[n] = JSON.parse(readFileSync(join(MISSIONS_DIR, "es", n), "utf8"));
}
const byLang = { en: loadMissions(readMissionFiles()), es: loadMissions(spanish) };

describe("which prompt wins", () => {
  it.each(VERSUS_ROUNDS.map((r) => [r.missionId, r] as const))("%s has a weaker message in both languages", (_, round) => {
    for (const missions of Object.values(byLang)) {
      const mission = missions.find((m) => m.id === round.missionId)!;
      expect(mission).toBeDefined();
      const weak = keySetups(mission)[round.flaw];
      expect(weak, `no flaw ${round.flaw}`).toBeDefined();
      expect(weak).not.toEqual(bestPicks(mission));
      expect(isPromptReady(mission, weak!)).toBe(true);
    }
  });
});
