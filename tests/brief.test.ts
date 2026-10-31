import { describe, expect, it } from "vitest";
import { buildPrompt, emptySlots, hasGoodGoal, isPromptReady, togglePick, weakPicks } from "../src/engine/brief.ts";
import { BEST_DINNER, dinnerMission } from "./helpers.ts";

const mission = dinnerMission();

describe("togglePick", () => {
  it("swaps the choice in a pick-one slot", () => {
    expect(togglePick(mission, ["help_dinner", "short_list"], "plan_dinner")).toEqual(["short_list", "plan_dinner"]);
  });

  it("taps a picked piece again to take it out", () => {
    expect(togglePick(mission, ["plan_dinner"], "plan_dinner")).toEqual([]);
  });

  it("toggles pieces in a pick-many slot", () => {
    const on = togglePick(mission, ["plan_dinner"], "vegetarian");
    expect(on).toEqual(["plan_dinner", "vegetarian"]);
    expect(togglePick(mission, on, "vegetarian")).toEqual(["plan_dinner"]);
  });

  it("ignores ids that aren't pieces", () => {
    expect(togglePick(mission, ["plan_dinner"], "nope")).toEqual(["plan_dinner"]);
  });
});

describe("buildPrompt", () => {
  it("joins the pieces in slot order, whatever order they were tapped", () => {
    expect(buildPrompt(mission, ["short_list", "budget", "plan_dinner", "vegetarian"])).toBe(
      "Plan a dinner for 6 friends this Saturday. One of my friends, Sam, is vegetarian. Keep the total under $60. Give me the menu and a short shopping list.",
    );
  });

  it("is empty with nothing picked", () => {
    expect(buildPrompt(mission, [])).toBe("");
  });
});

describe("prompt readiness and quality", () => {
  it("is ready once every pick-one slot has a piece (pick-any rows can stay empty)", () => {
    expect(isPromptReady(mission, ["plan_dinner"])).toBe(false);
    expect(emptySlots(mission, ["plan_dinner"]).map((s) => s.id)).toEqual(["shape"]);
    expect(isPromptReady(mission, ["plan_dinner", "short_list"])).toBe(true);
  });

  it("knows a good goal and weak picks", () => {
    expect(hasGoodGoal(mission, BEST_DINNER)).toBe(true);
    expect(hasGoodGoal(mission, ["help_dinner"])).toBe(false);
    expect(weakPicks(mission, ["help_dinner", "amazing", "everything"])).toEqual(["help_dinner", "amazing", "everything"]);
  });
});
