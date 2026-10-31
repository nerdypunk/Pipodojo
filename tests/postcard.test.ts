import { describe, expect, it } from "vitest";
import { parseMission } from "../src/engine/missionLoader.ts";
import { MAX_SCENE_CHARS, postcardScene } from "../src/engine/postcard.ts";
import type { Mission, RunLog } from "../src/engine/types.ts";
import { readMissionFiles } from "./helpers.ts";

const missions = Object.fromEntries(
  Object.entries(readMissionFiles()).map(([file, raw]) => {
    const mission = parseMission(raw, file);
    return [mission.id, mission];
  }),
) as Record<string, Mission>;

function log(missionId: string, answer: string, args?: Record<string, unknown>): RunLog {
  return {
    missionId,
    picks: [],
    prompt: "",
    answer,
    ...(args ? { action: { tool: "t", app: "shop", outcome: "done", args } } : {}),
    ms: 1,
    score: { stars: 3, weakPicks: [], missedFlaws: [], visibleFlaws: [] },
  };
}

describe("postcardScene", () => {
  const ids = Object.keys(missions).filter((id) => id.startsWith("parent-")).sort();

  it("paints what Pipo really did in each lesson, starring the player's Pipo", () => {
    const runs = [
      log(ids[0]!, "🍖 **Menu:** veggie burgers for Sam\n🌽 Corn and salad"),
      log(ids[1]!, "📨 To: barbecue crew", { to: "barbecue crew", message: "BBQ Saturday at 4pm! 🎉" }),
      log(ids[2]!, "🛒 ...", { items: [{ name: "Veggie patties", price: 6 }, { name: "Buns", price: 3 }], total: 9 }),
    ].map((l) => ({ mission: missions[l.missionId]!, log: l }));
    const scene = postcardScene("a small friendly mint robot named Pipo", runs);
    expect(scene).toMatch(/^Starring a small friendly mint robot named Pipo\./);
    expect(scene).toContain("Menu: veggie burgers for Sam, Corn and salad");
    expect(scene).toContain("BBQ Saturday at 4pm!");
    expect(scene).toContain("Veggie patties, Buns");
    expect(scene).not.toMatch(/\$|🎉|\*\*/);
  });

  it("stays under the painter's limit however long the answers are", () => {
    const long = "word ".repeat(400);
    const runs = ids.map((id) => ({ mission: missions[id]!, log: log(id, long, { message: long, items: [long] }) }));
    expect(postcardScene("Pipo", runs).length).toBeLessThanOrEqual(MAX_SCENE_CHARS);
  });

  it("matches the server's cap", async () => {
    const server = await import("../functions/api/image.js");
    expect(MAX_SCENE_CHARS).toBe(server.MAX_SCENE_CHARS);
  });
});
