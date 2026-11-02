// The listings app: Pipo saves marketplace listings to your saved list. Each saved listing becomes
// its own answer line, so a gap (too pricey, a low-rated seller, no back support) points at the
// one listing that shows it, on the result card and on the phone.
import { describe, expect, it } from "vitest";
import { actionAnswer, listingLineCount, pickAction, readable, stars } from "../src/engine/actions.ts";
import { evaluate } from "../src/engine/evaluator.ts";
import { parseMission } from "../src/engine/missionLoader.ts";
import { bestPicks, keySetups } from "../src/engine/setups.ts";
import { answerLines } from "../src/game/feedback.ts";
import { readMissionFiles } from "./helpers.ts";

const chairs = parseMission(readMissionFiles()["exec-04-listings.json"], "exec-04-listings.json");

const GREEN = { name: "Green desk chair", price: 35, condition: "good", rating: 4.9, distance: "2 mi" };
const LEATHER = { name: "Leather executive chair", price: 120, condition: "like new", rating: 4.9, distance: "3 mi" };
const CHEAP = { name: "Ergonomic office chair", price: 25, condition: "like new", rating: 3.1, distance: "1 mi" };
const STOOL = { name: "Wooden bar stool", price: 15, condition: "like new", rating: 4.9, distance: "1 mi" };

function saved(items: unknown[]) {
  return pickAction(chairs, [{ name: "save_listings", args: { items } }])!;
}

describe("listings app", () => {
  it("writes a listing the way a person reads it", () => {
    expect(readable(GREEN)).toBe("Green desk chair ($35) · good · ★ 4.9 · 2 mi");
    expect(readable({ name: "Chair", price: 20, rating: "4.50" })).toBe("Chair ($20) · ★ 4.5");
    // Other items with a price stay as they were.
    expect(readable({ name: "Buns", price: 4 })).toBe("Buns ($4)");
  });

  it("rounds star ratings the way people say them", () => {
    expect(stars(4.9)).toBe("4.9");
    expect(stars(5)).toBe("5");
    expect(stars(4.86)).toBe("4.9");
    expect(stars("great")).toBe("great");
  });

  it("gives each saved listing its own answer line", () => {
    const action = saved([GREEN, STOOL]);
    expect(action).toMatchObject({ app: "listings", outcome: "done" });
    expect(listingLineCount(action)).toBe(2);
    expect(actionAnswer(chairs, action)).toBe(
      "🪑 Green desk chair ($35) · good · ★ 4.9 · 2 mi\n🪑 Wooden bar stool ($15) · like new · ★ 4.9 · 1 mi\n🔖 Saved to your list",
    );
  });

  it("keeps one line when nothing was saved", () => {
    const action = saved([]);
    expect(listingLineCount(action)).toBe(1);
    expect(actionAnswer(chairs, action).split("\n")).toHaveLength(2);
  });

  it("a clean save of good chairs is 3 stars", () => {
    const answer = actionAnswer(chairs, saved([GREEN]));
    expect(evaluate(chairs, bestPicks(chairs), answer).stars).toBe(3);
  });

  it.each([
    ["no_budget", LEATHER],
    ["no_rating", CHEAP],
    ["vague_goal", STOOL],
  ] as const)("%s shows up on the one listing that has it", (flaw, bad) => {
    const picks = keySetups(chairs)[flaw]!;
    const answer = actionAnswer(chairs, saved([GREEN, bad]));
    const score = evaluate(chairs, picks, answer);
    expect(score.visibleFlaws).toEqual([flaw]);
    expect(answerLines(chairs, score, answer).map((l) => l.flagged)).toEqual([false, true, false]);
  });
});
