import { describe, expect, it } from "vitest";
import { conditionHolds, evaluate, signalsMatch, visibleFlaws } from "../src/engine/evaluator.ts";
import { BEST_DINNER, dinnerMission } from "./helpers.ts";

const mission = dinnerMission();
const noVeg = BEST_DINNER.filter((p) => p !== "vegetarian");
const noBudget = BEST_DINNER.filter((p) => p !== "budget");

const meatyPlan = "👥 Barbecue for 6\n🍔 Burgers, corn, slaw\n💰 Total about $45";
const veggiePlan = "👥 Barbecue for 6\n🌽 Veggie burgers, corn, slaw\n💰 Total about $48";
const noPricePlan = "👥 Barbecue for 6\n🌽 Veggie burgers, corn\n🛒 Buns, patties, corn";

describe("conditions and signals", () => {
  it("picked and not_picked follow the player's pieces", () => {
    expect(conditionHolds("not_picked:vegetarian", noVeg)).toBe(true);
    expect(conditionHolds("not_picked:vegetarian", BEST_DINNER)).toBe(false);
    expect(conditionHolds("picked:help_dinner", ["help_dinner"])).toBe(true);
  });

  it("signals are case-insensitive, and no signals always match", () => {
    expect(signalsMatch(["steak"], "STEAK night")).toBe(true);
    expect(signalsMatch(["steak"], "pasta")).toBe(false);
    expect(signalsMatch(undefined, "")).toBe(true);
  });
});

describe("visibleFlaws", () => {
  it("shows when the missing fact changed Pipo's answer", () => {
    expect(visibleFlaws(mission, noVeg, meatyPlan).map((f) => f.id)).toEqual(["no_vegetarian"]);
  });

  it("stays hidden when Pipo happened to get it right anyway", () => {
    expect(visibleFlaws(mission, noVeg, veggiePlan)).toEqual([]);
  });

  it("never applies when the fact was in the prompt", () => {
    expect(visibleFlaws(mission, BEST_DINNER, meatyPlan)).toEqual([]);
  });
});

describe("evaluate", () => {
  it("a clean prompt is 3 stars", () => {
    expect(evaluate(mission, BEST_DINNER, veggiePlan)).toEqual({
      stars: 3,
      weakPicks: [],
      missedFlaws: [],
      visibleFlaws: [],
    });
  });

  it("a gap that shows up in the answer is 1 star", () => {
    const score = evaluate(mission, noVeg, meatyPlan);
    expect(score.stars).toBe(1);
    expect(score.visibleFlaws).toEqual(["no_vegetarian"]);
  });

  it("a gap that didn't show up is 2 stars", () => {
    const score = evaluate(mission, noVeg, veggiePlan);
    expect(score.stars).toBe(2);
    expect(score.missedFlaws).toEqual(["no_vegetarian"]);
    expect(score.visibleFlaws).toEqual([]);
  });

  it("a weak piece costs the third star", () => {
    expect(evaluate(mission, [...BEST_DINNER, "amazing"], veggiePlan).stars).toBe(2);
  });

  it("a missing budget shows up when the plan has no prices", () => {
    expect(evaluate(mission, noBudget, noPricePlan).visibleFlaws).toEqual(["no_budget"]);
    expect(evaluate(mission, noBudget, veggiePlan).visibleFlaws).toEqual([]);
  });

  it("a vague goal shows up when Pipo plans for the wrong number of people", () => {
    const vague = ["help_dinner", "vegetarian", "budget", "short_list"];
    const forFour = "👥 Barbecue for 4 people\n🌽 Veggie burgers\n💰 About $45";
    expect(evaluate(mission, vague, forFour).visibleFlaws).toEqual(["vague_goal"]);
    expect(evaluate(mission, vague, veggiePlan).visibleFlaws).toEqual([]);
  });
});
