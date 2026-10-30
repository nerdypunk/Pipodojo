import { describe, expect, it } from "vitest";
import { runAgent } from "../src/engine/agentRunner.ts";
import type { RunStep, Setup } from "../src/engine/types.ts";
import { call, fakeClock, refundMission, scriptedClient } from "./helpers.ts";

const mission = refundMission();
const best: Setup = { equipped: ["orders_lookup", "store_policy", "email_draft"], goalId: "specific" };
const email = { to: "dana@example.com", subject: "Your jacket", body: "We can offer store credit." };

function run(setup: Setup, replies: Parameters<typeof scriptedClient>[0], maxSteps?: number) {
  const { client, requests } = scriptedClient(replies);
  const steps: RunStep[] = [];
  const result = runAgent({ mission, setup, client, now: fakeClock(), onStep: (s) => steps.push(s), maxSteps });
  return { result, requests, steps };
}

describe("runAgent", () => {
  it("plays tools, then pauses at the gated tool with its draft", async () => {
    const { result, requests, steps } = run(best, [
      { content: "Let me check.", toolCalls: [call("c1", "orders_lookup", { order_number: "1042" }), call("c2", "store_policy")] },
      { content: null, toolCalls: [call("c3", "send_email", email)] },
    ]);
    const out = await result;

    expect(out.status).toBe("gate");
    expect(out.reachedGatedTool).toBe(true);
    expect(out.draft).toEqual({ source: "send_email", fields: email, text: Object.values(email).join("\n") });
    expect(steps.map((s) => s.kind)).toEqual(["model", "tool", "tool", "model", "gate"]);

    // The second request carries the assistant turn and both tool results.
    const second = requests[1]!.messages;
    expect(second.at(-3)).toMatchObject({ role: "assistant", tool_calls: [{ id: "c1" }, { id: "c2" }] });
    expect(second.at(-2)).toMatchObject({ role: "tool", tool_call_id: "c1" });
    expect(JSON.parse((second.at(-1) as { content: string }).content)).toMatchObject({ return_window_days: 30 });
  });

  it("only sends equipped tools (plus the gated one) to the model", async () => {
    const { result, requests } = run({ equipped: ["orders_lookup"], goalId: "vague" }, [{ content: "Hi Dana.", toolCalls: [] }]);
    await result;
    expect(requests[0]!.tools.map((t) => t.function.name)).toEqual(["orders_lookup", "send_email"]);
  });

  it("includes the context and the chosen goal in the first message", async () => {
    const { result, requests } = run(best, [{ content: "ok", toolCalls: [] }]);
    await result;
    const user = requests[0]!.messages[1]!;
    expect(user.content).toContain("Order #1042");
    expect(user.content).toContain("Check if this order is eligible, then draft a reply");
  });

  it("returns a tool error to the model for malformed arguments, and keeps going", async () => {
    const { result, requests, steps } = run(best, [
      { content: null, toolCalls: [call("c1", "orders_lookup", "{not json")] },
      { content: null, toolCalls: [call("c2", "send_email", email)] },
    ]);
    expect((await result).status).toBe("gate");
    expect(steps[1]).toMatchObject({ kind: "tool", ok: false });
    expect(requests[1]!.messages.at(-1)!.content).toContain("JSON object");
  });

  it("tells the model when it calls a tool it wasn't given", async () => {
    const { result, requests } = run({ equipped: ["email_draft"], goalId: "specific" }, [
      { content: null, toolCalls: [call("c1", "issue_refund", { order_number: "1042" })] },
      { content: "Done.", toolCalls: [] },
    ]);
    await result;
    expect(requests[1]!.messages.at(-1)!.content).toContain('no tool called \\"issue_refund\\"');
  });

  it("runs a trap tool if it was equipped (that's the lesson)", async () => {
    const { result, steps } = run({ ...best, equipped: [...best.equipped, "issue_refund"] }, [
      { content: null, toolCalls: [call("c1", "issue_refund", { order_number: "1042" })] },
      { content: null, toolCalls: [call("c2", "send_email", email)] },
    ]);
    await result;
    expect(steps[1]).toMatchObject({ kind: "tool", toolId: "issue_refund", ok: true, result: { status: "refund_issued" } });
  });

  it("without a gated call, the last written draft goes to the gate", async () => {
    const { result } = run(best, [
      { content: null, toolCalls: [call("c1", "email_draft", email)] },
      { content: "I drafted a reply for you to review.", toolCalls: [] },
    ]);
    const out = await result;
    expect(out).toMatchObject({ status: "gate", reachedGatedTool: false, draft: { source: "email_draft", fields: email } });
  });

  it("falls back to the final answer when nothing was drafted", async () => {
    const { result } = run(best, [{ content: "Hi Dana, sorry about the zipper!", toolCalls: [] }]);
    expect((await result).draft).toMatchObject({ source: "answer", fields: { message: "Hi Dana, sorry about the zipper!" } });
  });

  it("stops after the step limit", async () => {
    const lookup = { content: null, toolCalls: [call("c", "orders_lookup", { order_number: "1042" })] };
    const { result, requests } = run(best, [lookup, lookup, lookup, lookup], 3);
    const out = await result;
    expect(requests).toHaveLength(3);
    expect(out.status).toBe("failed");
  });

  it("fails quietly (no throw) when the model call fails", async () => {
    const { result } = run(best, [new Error("HTTP 500")]);
    expect(await result).toMatchObject({ status: "failed", failure: "HTTP 500", draft: null });
  });

  it("records how long each model call took", async () => {
    const { steps, result } = run(best, [{ content: "ok", toolCalls: [] }]);
    await result;
    expect(steps[0]).toMatchObject({ kind: "model", ms: 100 });
  });
});
