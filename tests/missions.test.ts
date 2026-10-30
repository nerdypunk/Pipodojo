import { describe, expect, it } from "vitest";
import { loadMissions, parseMission } from "../src/engine/missionLoader.ts";
import { readMissionFiles, refundMission } from "./helpers.ts";

describe("mission files", () => {
  it("every file in /missions is a valid mission", () => {
    const missions = loadMissions(readMissionFiles());
    expect(missions.length).toBeGreaterThan(0);
  });

  it("the refund mission is first in the business path", () => {
    const [first] = loadMissions(readMissionFiles());
    expect(first?.id).toBe("biz-01-refund");
  });
});

describe("mission schema", () => {
  const base = () => structuredClone(refundMission()) as Record<string, any>;

  it("rejects unknown fields", () => {
    const m = base();
    m.surprise = true;
    expect(() => parseMission(m)).toThrow(/surprise|Unrecognized/);
  });

  it("rejects a flaw that points at a tool that doesn't exist", () => {
    const m = base();
    m.gate.flaws[0].when = "tool_missing:crystal_ball";
    expect(() => parseMission(m)).toThrow(/Unknown tool "crystal_ball"/);
  });

  it("rejects a flaw condition it can't understand", () => {
    const m = base();
    m.gate.flaws[0].when = "moon:full";
    expect(() => parseMission(m)).toThrow(/tool_missing/);
  });

  it("rejects a bad signal regex", () => {
    const m = base();
    m.gate.flaws[0].signals = ["refund("];
    expect(() => parseMission(m)).toThrow(/regular expression/);
  });

  it("requires the gate to sit in front of the gated tool", () => {
    const m = base();
    m.gate.beforeTool = "email_draft";
    expect(() => parseMission(m)).toThrow(/gated tool "send_email"/);
  });

  it("requires a trap tool, a correct fix, and both goal qualities", () => {
    const m = base();
    m.tools = m.tools.filter((t: { role: string }) => t.role !== "trap");
    m.gate.fixes = m.gate.fixes.map((f: object) => ({ ...f, correct: false }));
    m.goals = m.goals.map((g: object) => ({ ...g, quality: "good" }));
    const error = (() => {
      try {
        parseMission(m);
      } catch (e) {
        return String(e);
      }
    })();
    expect(error).toMatch(/trap tool/);
    expect(error).toMatch(/correct fix/);
    expect(error).toMatch(/good and one poor goal/);
  });

  it("requires file names to match mission ids", () => {
    expect(() => loadMissions({ "wrong-name.json": refundMission() })).toThrow(/file name must match/);
  });
});
