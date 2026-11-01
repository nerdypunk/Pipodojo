// The Lab's prototypes run on the real engine, so their content gets the same checks as lessons.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPromptReady } from "../src/engine/brief.ts";
import { evaluate } from "../src/engine/evaluator.ts";
import { loadMissions, parseMission } from "../src/engine/missionLoader.ts";
import { bestPicks, keySetups } from "../src/engine/setups.ts";
import { CLUE_HUNTS } from "../src/game/clueHunts.ts";
import { VERSUS_ROUNDS } from "../src/game/versus.ts";
import { MISSIONS_DIR, readMissionFiles } from "./helpers.ts";

const hunts = [...CLUE_HUNTS.en, ...CLUE_HUNTS.es];

describe("clue hunts", () => {
  it.each(hunts.map((h) => [`${h.mission.id} (${h.mission.lang ?? "en"})`, h] as const))("%s is a valid lesson with a tappable piece for every clue", (_, hunt) => {
    expect(() => parseMission(hunt.mission)).not.toThrow();
    const pieces = hunt.mission.slots.flatMap((s) => s.pieces.map((p) => p.id));
    const tappable = hunt.source.segments.flatMap((s) => (s.piece ? [s.piece] : []));
    // Every tappable part is a piece, and every clue and bit of chatter can be tapped.
    for (const id of tappable) expect(pieces).toContain(id);
    const huntable = hunt.mission.slots.filter((s) => s.id === "clues" || s.id === "chatter").flatMap((s) => s.pieces.map((p) => p.id));
    expect([...tappable].sort()).toEqual([...huntable].sort());
    // The goal and answer shape are already in, so Check works as soon as a clue is tapped.
    expect(isPromptReady(hunt.mission, hunt.autoPicks)).toBe(true);
  });

  it("English and Spanish hunts match piece for piece", () => {
    CLUE_HUNTS.en.forEach((en, i) => {
      const es = CLUE_HUNTS.es[i]!;
      expect(es.mission.lang).toBe("es");
      expect(es.mission.id).toBe(en.mission.id);
      expect(es.mission.slots.map((s) => s.pieces.map((p) => `${p.id}:${p.quality}`))).toEqual(en.mission.slots.map((s) => s.pieces.map((p) => `${p.id}:${p.quality}`)));
      expect(es.mission.flaws.map((f) => f.when)).toEqual(en.mission.flaws.map((f) => f.when));
      expect(es.autoPicks).toEqual(en.autoPicks);
    });
  });

  it("the checks catch a missed clue and leave a good answer alone", () => {
    const [grandmaEn, cakeEn] = CLUE_HUNTS.en;
    const [grandmaEs, cakeEs] = CLUE_HUNTS.es;
    const without = (hunt: typeof grandmaEn, id: string) => bestPicks(hunt!.mission).filter((p) => p !== id);
    expect(evaluate(grandmaEn!.mission, without(grandmaEn, "rain"), "🌳 Riverside park picnic\n💵 $30 total").visibleFlaws).toContain("no_rain");
    expect(evaluate(grandmaEs!.mission, without(grandmaEs, "rain"), "🌳 Parque central con picnic\n💵 $30 en total").visibleFlaws).toContain("no_rain");
    expect(evaluate(cakeEn!.mission, without(cakeEn, "nuts"), "🎂 Chocolate cake for Mia, 7\n⏰ Saturday 3pm").visibleFlaws).toContain("no_nuts");
    expect(evaluate(cakeEs!.mission, without(cakeEs, "nuts"), "🎂 Pastel de chocolate para Mia, 7 años\n⏰ Sábado 3 p. m.").visibleFlaws).toContain("no_nuts");
    const good = "🐠 City aquarium, all indoors\n🪑 Lots of benches, little walking\n💵 $36 for everyone";
    expect(evaluate(grandmaEn!.mission, bestPicks(grandmaEn!.mission), good).stars).toBe(3);
  });
});

describe("which prompt wins", () => {
  const spanish: Record<string, unknown> = {};
  for (const n of readdirSync(join(MISSIONS_DIR, "es")).filter((f) => f.endsWith(".json"))) {
    spanish[n] = JSON.parse(readFileSync(join(MISSIONS_DIR, "es", n), "utf8"));
  }
  const byLang = { en: loadMissions(readMissionFiles()), es: loadMissions(spanish) };

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
