import { describe, expect, it } from "vitest";
import { evaluate } from "../src/engine/evaluator.ts";
import { answerLines } from "../src/game/feedback.ts";
import { BEST_DINNER, dinnerMission } from "./helpers.ts";

const mission = dinnerMission();

describe("answerLines", () => {
  it("splits Pipo's answer into emoji card lines", () => {
    const answer = "👥 Barbecue for 6 friends\n**🍔 Veggie burgers**, corn\n- 💰 Total ~$55";
    const lines = answerLines(mission, evaluate(mission, BEST_DINNER, answer), answer);
    expect(lines).toEqual([
      { emoji: "👥", text: "Barbecue for 6 friends", flagged: false },
      { emoji: "🍔", text: "Veggie burgers, corn", flagged: false },
      { emoji: "💰", text: "Total ~$55", flagged: false },
    ]);
  });

  it("flags the line that shows the gap", () => {
    const picks = BEST_DINNER.filter((p) => p !== "vegetarian");
    const answer = "👥 Barbecue for 6 friends\n🍔 Menu: burgers, hot dogs, corn\n💰 Total ~$55";
    const lines = answerLines(mission, evaluate(mission, picks, answer), answer);
    expect(lines.map((l) => l.flagged)).toEqual([false, true, false]);
  });

  it("doesn't flag every line for something that's missing", () => {
    const picks = BEST_DINNER.filter((p) => p !== "budget");
    const answer = "👥 Barbecue for 6 friends\n🍔 Veggie burgers, corn";
    const score = evaluate(mission, picks, answer);
    expect(score.visibleFlaws).toEqual(["no_budget"]);
    expect(answerLines(mission, score, answer).some((l) => l.flagged)).toBe(false);
  });

  it("veggie burgers aren't meat", () => {
    const picks = BEST_DINNER.filter((p) => p !== "vegetarian");
    expect(evaluate(mission, picks, "👥 For 6\n🍔 Veggie burgers, corn\n💰 $50").visibleFlaws).toEqual([]);
  });
});
