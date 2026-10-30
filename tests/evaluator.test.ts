import { describe, expect, it } from "vitest";
import { activeFlaws, conditionHolds, evaluate, signalsMatch } from "../src/engine/evaluator.ts";
import type { Draft, Setup } from "../src/engine/types.ts";
import { refundMission } from "./helpers.ts";

const mission = refundMission();
const ALL_REQUIRED = ["orders_lookup", "store_policy", "email_draft"];
const best: Setup = { equipped: ALL_REQUIRED, goalId: "specific" };
const noPolicy: Setup = { equipped: ["orders_lookup", "email_draft"], goalId: "specific" };
const vague: Setup = { equipped: ALL_REQUIRED, goalId: "vague" };
const withTrap: Setup = { equipped: [...ALL_REQUIRED, "issue_refund"], goalId: "specific" };

const draft = (body: string): Draft => ({ source: "send_email", fields: { body }, text: body });
const promise = draft("Good news! We will refund your $80 right away.");
const decline = draft("Your order is past our 30-day window, but we can offer store credit.");

describe("flaw conditions", () => {
  it("tool_missing holds only when the tool is off", () => {
    expect(conditionHolds("tool_missing:store_policy", noPolicy)).toBe(true);
    expect(conditionHolds("tool_missing:store_policy", best)).toBe(false);
  });

  it("goal holds only for that goal", () => {
    expect(conditionHolds("goal:vague", vague)).toBe(true);
    expect(conditionHolds("goal:vague", best)).toBe(false);
  });

  it("signals are case-insensitive, and no signals always match", () => {
    expect(signalsMatch(["money back"], "You'll get your MONEY BACK")).toBe(true);
    expect(signalsMatch(["money back"], "store credit")).toBe(false);
    expect(signalsMatch(undefined, "")).toBe(true);
  });
});

describe("activeFlaws", () => {
  it("activates when the setup is weak and the draft shows the mistake", () => {
    expect(activeFlaws(mission, noPolicy, promise).map((f) => f.id)).toEqual(["promises_refund"]);
  });

  it("stays quiet when the setup is weak but the draft is safe", () => {
    expect(activeFlaws(mission, noPolicy, draft("Thanks, we'll look into it."))).toEqual([]);
  });

  it("stays quiet in a good setup even if the draft mentions a refund", () => {
    expect(activeFlaws(mission, best, promise)).toEqual([]);
  });

  it("a vague-goal draft that skips the order details is generic", () => {
    expect(activeFlaws(mission, vague, decline).map((f) => f.id)).toEqual(["generic_reply"]);
  });
});

describe("evaluate", () => {
  it("best setup, clean draft, approve: 3 stars", () => {
    const score = evaluate(mission, best, decline, { type: "approve" });
    expect(score.stars).toBe(3);
    expect(score.activeFlaws).toEqual([]);
  });

  it("approving a flawed draft: 0 stars, unsafe", () => {
    const score = evaluate(mission, noPolicy, promise, { type: "approve" });
    expect(score.stars).toBe(0);
    expect(score.checks.safeOutcome).toBe(false);
  });

  it("an incorrect fix (send as is) on a flawed draft is unsafe too", () => {
    const score = evaluate(mission, noPolicy, promise, { type: "fix", fixId: "send_anyway" });
    expect(score.checks.safeOutcome).toBe(false);
  });

  it("catching the flaw in a weak setup: safe, but capped at 1 star", () => {
    const stop = evaluate(mission, noPolicy, promise, { type: "stop" });
    expect(stop.stars).toBe(1);
    expect(stop.checks.correctDecision).toBe(true);
    expect(stop.missingRequired).toEqual(["store_policy"]);

    const fix = evaluate(mission, noPolicy, promise, { type: "fix", fixId: "check_policy" });
    expect(fix.stars).toBe(1);
  });

  it("vague goal caps at 1 star even when caught", () => {
    expect(evaluate(mission, vague, decline, { type: "stop" }).stars).toBe(1);
  });

  it("stopping a clean draft is safe but not the best call: 2 stars", () => {
    const score = evaluate(mission, best, decline, { type: "stop" });
    expect(score.stars).toBe(2);
    expect(score.checks.correctDecision).toBe(false);
  });

  it("a trap tool costs the third star", () => {
    const score = evaluate(mission, withTrap, decline, { type: "approve" });
    expect(score.stars).toBe(2);
    expect(score.trapsEquipped).toEqual(["issue_refund"]);
  });

  it("no draft at all scores like a clean draft for signal-based flaws", () => {
    expect(evaluate(mission, noPolicy, null, { type: "approve" }).activeFlaws).toEqual([]);
  });
});
