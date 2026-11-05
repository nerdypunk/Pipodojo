// "Which prompt wins?" and Pick a prompt run on real lessons: every pairing must point at a real
// lesson and flaw, in both languages, and the weaker message must really differ from the best one.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPrompt, isPromptReady } from "../src/engine/brief.ts";
import { loadMissions } from "../src/engine/missionLoader.ts";
import { missedFlaws } from "../src/engine/evaluator.ts";
import { bestPicks, FLAWS_IN_WEAK, keySetups, PAIR_CLOSE, promptOptions, promptPair, weakerPrompts } from "../src/engine/setups.ts";
import { pathById } from "../src/game/paths.ts";
import { VERSUS_ROUNDS } from "../src/game/versus.ts";
import { MISSIONS_DIR, readMissionFiles } from "./helpers.ts";

const read = (lang: string) => {
  const files: Record<string, unknown> = {};
  for (const n of readdirSync(join(MISSIONS_DIR, lang)).filter((f) => f.endsWith(".json"))) {
    files[n] = JSON.parse(readFileSync(join(MISSIONS_DIR, lang, n), "utf8"));
  }
  return files;
};
const byLang = { en: loadMissions(readMissionFiles()), es: loadMissions(read("es")), ja: loadMissions(read("ja")) };

describe("pick a prompt", () => {
  const pickLessons = byLang.en.filter((m) => pathById(m.path)?.mode === "pick").map((m) => m.id);

  it("covers the pick paths", () => {
    expect(pickLessons.length).toBe(15);
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

  const nothingMissing = (mission: Parameters<typeof missedFlaws>[0], picks: string[]) => missedFlaws(mission, picks).length === 0;

  it("puts the best message on either side", () => {
    const mission = byLang.en.find((m) => m.id === pickLessons[0])!;
    expect(nothingMissing(mission, promptPair(mission, () => 0.9)[1])).toBe(true);
    expect(nothingMissing(mission, promptPair(mission, () => 0.1)[0])).toBe(true);
  });

  // Leaving facts out makes a message shorter; length must not give the better one away.
  it.each(pickLessons)("%s: the two messages can be close in length, in every language", (id) => {
    for (const [lang, missions] of Object.entries(byLang)) {
      const mission = missions.find((m) => m.id === id)!;
      const options = promptOptions(mission);
      expect(options.some((o) => Math.abs(o.gap) <= PAIR_CLOSE), lang).toBe(true);
      for (const o of options) {
        expect(nothingMissing(mission, o.best)).toBe(true);
        expect(nothingMissing(mission, o.weak)).toBe(false);
      }
    }
  });

  it.each(Object.keys(byLang))("%s: the better message isn't usually the longer one", (lang) => {
    const missions = byLang[lang as keyof typeof byLang].filter((m) => pickLessons.includes(m.id));
    let longer = 0;
    for (const mission of missions) {
      const close = promptOptions(mission).filter((o) => Math.abs(o.gap) <= PAIR_CLOSE);
      const l = close.filter((o) => o.gap > 0).length;
      longer += l && l < close.length ? 0.5 : l ? 1 : 0;
    }
    expect(longer / missions.length).toBeLessThanOrEqual(0.65);
  });
});

describe("pick one rows", () => {
  // The right option used to be the longest about 90% of the time, so tapping the longer one won.
  it.each(Object.keys(byLang))("%s: the good option isn't usually the longest", (lang) => {
    let rows = 0;
    let longest = 0;
    for (const mission of byLang[lang as keyof typeof byLang]) {
      for (const slot of mission.slots.filter((s) => s.pick === "one")) {
        const good = slot.pieces.filter((p) => p.quality === "good");
        if (!good.length) continue;
        rows++;
        const max = Math.max(...slot.pieces.map((p) => p.label.length));
        if (good.some((p) => p.label.length === max)) longest++;
      }
    }
    const share = longest / rows;
    expect(share).toBeGreaterThanOrEqual(0.35);
    expect(share).toBeLessThanOrEqual(0.62);
  });
});

describe("hints", () => {
  // A hint like "Help me with the barbecue" doesn't say how many… must quote words the player saw.
  it.each(Object.keys(byLang))("%s: every quoted phrase in a hint is on one of the lesson's pieces", (lang) => {
    for (const mission of byLang[lang as keyof typeof byLang]) {
      const pieces = mission.slots.flatMap((s) => s.pieces.flatMap((p) => [p.label, p.text])).join(" | ").toLowerCase();
      for (const flaw of mission.flaws) {
        for (const [, quoted] of flaw.hint.matchAll(/["“「]([^"”」]+)["”」]/g)) {
          expect(pieces, `${mission.id} ${flaw.id}: ${quoted}`).toContain(quoted!.replace(/[.。!！]$/, "").toLowerCase());
        }
      }
    }
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
