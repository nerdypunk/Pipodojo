import { describe, expect, it } from "vitest";
import { loadMissions, parseMission } from "../src/engine/missionLoader.ts";
import { dinnerMission, readMissionFiles } from "./helpers.ts";

describe("lesson files", () => {
  it("every file in /missions is a valid lesson", () => {
    expect(loadMissions(readMissionFiles()).length).toBeGreaterThan(0);
  });
});

describe("lesson schema", () => {
  const base = () => structuredClone(dinnerMission()) as Record<string, any>;
  const errorOf = (data: unknown) => {
    try {
      parseMission(data);
      return "";
    } catch (e) {
      return String(e);
    }
  };

  it("rejects unknown fields", () => {
    const m = base();
    m.tools = [];
    expect(errorOf(m)).toMatch(/tools|Unrecognized/);
  });

  it("rejects a flaw that points at a piece that doesn't exist", () => {
    const m = base();
    m.flaws[0].when = "not_picked:crystal_ball";
    expect(errorOf(m)).toMatch(/Unknown piece "crystal_ball"/);
  });

  it("rejects a flaw condition it can't understand", () => {
    const m = base();
    m.flaws[0].when = "moon:full";
    expect(errorOf(m)).toMatch(/not_picked/);
  });

  it("rejects a bad signal regex", () => {
    const m = base();
    m.flaws[0].signals = ["steak("];
    expect(errorOf(m)).toMatch(/regular expression/);
  });

  it("needs a required slot with a good and a weak piece", () => {
    const m = base();
    m.slots[0].pieces = m.slots[0].pieces.map((p: object) => ({ ...p, quality: "good" }));
    expect(errorOf(m)).toMatch(/good and one weak piece/);
  });

  it("rejects duplicate piece ids", () => {
    const m = base();
    m.slots[1].pieces[0].id = "plan_dinner";
    expect(errorOf(m)).toMatch(/Duplicate piece id: plan_dinner/);
  });

  it("requires file names to match lesson ids", () => {
    expect(() => loadMissions({ "wrong-name.json": dinnerMission() })).toThrow(/file name must match/);
  });
});
