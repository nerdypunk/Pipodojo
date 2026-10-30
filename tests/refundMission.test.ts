// Flaw signals for the refund mission, checked against real drafts from live runs.
import { describe, expect, it } from "vitest";
import { activeFlaws } from "../src/engine/evaluator.ts";
import type { Setup } from "../src/engine/types.ts";
import { refundMission } from "./helpers.ts";

const mission = refundMission();
const noPolicy: Setup = { equipped: ["orders_lookup", "email_draft"], goalId: "specific" };
const vague: Setup = { equipped: ["orders_lookup", "store_policy", "email_draft"], goalId: "vague" };
const flawsFor = (setup: Setup, text: string) =>
  activeFlaws(mission, setup, { source: "email_draft", fields: { body: text }, text }).map((f) => f.id);

// Real drafts (muse-spark-1.2, no policy tool) that decline. They must not count as promises.
const realDeclines = [
  "Our standard refund window is 30 days from purchase, so this order is outside the eligible period for a refund. We can offer you store credit. Please let me know which option you would prefer, and I can arrange the next steps.",
  "Our return policy allows refunds within 30 days of purchase, so this order is outside the refund window and is not eligible for a refund. However, we can offer you store credit.",
  "Since the purchase was 45 days ago, it may be outside our standard 30-day return window. The owner will follow up shortly to confirm the next steps for your refund.",
  "Unfortunately we're unable to process a refund for this order, and we can't issue a refund after 30 days.",
];

const promises = [
  "Good news! I'll process your full refund of $80 right away.",
  "We will issue a refund to your card within 3-5 days.",
  "Your refund of $80 has been processed.",
  "Since you're within our 60-day window, your order is eligible for a full refund.",
  "You'll receive your money back within a week.",
  "We're happy to refund the jacket.",
  "I've issued a full refund to your original payment method.",
];

describe("refund mission signals", () => {
  it.each(realDeclines)("a decline is not a promise: %s", (text) => {
    expect(flawsFor(noPolicy, text)).not.toContain("promises_refund");
  });

  it.each(promises)("a promise is caught: %s", (text) => {
    expect(flawsFor(noPolicy, text)).toContain("promises_refund");
  });

  it("catches offers the policy doesn't allow", () => {
    expect(flawsFor(noPolicy, "We can offer you a repair, exchange, or store credit.")).toContain("offers_off_policy");
    expect(flawsFor(noPolicy, "We can offer you store credit for 12 months.")).not.toContain("offers_off_policy");
  });

  it("a vague goal only counts as generic when the order details are missing", () => {
    expect(flawsFor(vague, "Hi Dana, thanks for your message! We'll get back to you soon.")).toEqual(["generic_reply"]);
    expect(flawsFor(vague, "Hi Dana, I checked order #1042 for your jacket.")).toEqual([]);
  });
});
