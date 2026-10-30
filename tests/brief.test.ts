import { describe, expect, it } from "vitest";
import { buildPrompt, isBriefReady, isGoodBrief, poorPicks, togglePick } from "../src/engine/brief.ts";
import { refundMission } from "./helpers.ts";

const mission = refundMission();

describe("togglePick", () => {
  it("swaps the choice in a pick-one slot", () => {
    expect(togglePick(mission, ["vague", "warm"], "specific")).toEqual(["warm", "specific"]);
    expect(togglePick(mission, ["specific"], "specific")).toEqual(["specific"]);
  });

  it("toggles options in a pick-many slot", () => {
    const on = togglePick(mission, ["specific"], "follow_policy");
    expect(on).toEqual(["specific", "follow_policy"]);
    expect(togglePick(mission, on, "follow_policy")).toEqual(["specific"]);
  });

  it("ignores ids that aren't in the brief", () => {
    expect(togglePick(mission, ["specific"], "nope")).toEqual(["specific"]);
  });
});

describe("buildPrompt", () => {
  it("joins the picked texts in slot order, whatever order they were tapped", () => {
    expect(buildPrompt(mission, ["warm", "no_promises", "specific"])).toBe(
      "Check whether this order can get a refund, then draft a reply for me to review. Don't promise anything you haven't checked. Keep it warm and short.",
    );
  });

  it("is empty with nothing picked", () => {
    expect(buildPrompt(mission, [])).toBe("");
  });
});

describe("brief quality", () => {
  it("is ready once every pick-one slot has a choice (rules can stay empty)", () => {
    expect(isBriefReady(mission, ["specific"])).toBe(false);
    expect(isBriefReady(mission, ["specific", "formal"])).toBe(true);
  });

  it("is good with a good goal and no poor picks", () => {
    expect(isGoodBrief(mission, ["specific", "warm"])).toBe(true);
    expect(isGoodBrief(mission, ["vague", "warm"])).toBe(false);
    expect(isGoodBrief(mission, ["specific", "please_customer", "warm"])).toBe(false);
  });

  it("lists poor picks", () => {
    expect(poorPicks(mission, ["vague", "please_customer", "warm"])).toEqual(["vague", "please_customer"]);
  });
});
