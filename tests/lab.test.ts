// "Which prompt wins?" and Pick a prompt run on real lessons: every pairing must point at a real
// lesson and flaw, in both languages, and the weaker message must really differ from the best one.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPrompt, isPromptReady } from "../src/engine/brief.ts";
import { loadMissions } from "../src/engine/missionLoader.ts";
import { bestPicks, FLAWS_IN_WEAK, keySetups, promptPair, weakerPrompts } from "../src/engine/setups.ts";
import { pathById } from "../src/game/paths.ts";
import { VERSUS_ROUNDS } from "../src/game/versus.ts";
import { MISSIONS_DIR, readMissionFiles } from "./helpers.ts";

const spanish: Record<string, unknown> = {};
for (const n of readdirSync(join(MISSIONS_DIR, "es")).filter((f) => f.endsWith(".json"))) {
  spanish[n] = JSON.parse(readFileSync(join(MISSIONS_DIR, "es", n), "utf8"));
}
const byLang = { en: loadMissions(readMissionFiles()), es: loadMissions(spanish) };

describe("pick a prompt", () => {
  const pickLessons = byLang.en.filter((m) => pathById(m.path)?.mode === "pick").map((m) => m.id);

  it("covers the pick paths", () => {
    expect(pickLessons.length).toBe(12);
  });

  it.each(pickLessons)("%s: every weaker message has two gaps and can still be sent, in both languages", (id) => {
    for (const missions of Object.values(byLang)) {
      const mission = missions.find((m) => m.id === id)!;
      const best = bestPicks(mission);
      const weaker = weakerPrompts(mission);
      expect(weaker.length).toBeGreaterThan(0);
      for (const weak of weaker) {
        expect(isPromptReady(mission, weak)).toBe(true);
        const changed = best.filter((p) => !weak.includes(p)).length + weak.filter((p) => !best.includes(p)).length;
        expect(changed, buildPrompt(mission, weak)).toBeGreaterThanOrEqual(FLAWS_IN_WEAK);
      }
    }
  });

  it("puts the best message on either side", () => {
    const mission = byLang.en.find((m) => m.id === pickLessons[0])!;
    const best = bestPicks(mission);
    expect(promptPair(mission, () => 0.9)[1]).toEqual(best);
    expect(promptPair(mission, () => 0.1)[0]).toEqual(best);
  });
});

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
