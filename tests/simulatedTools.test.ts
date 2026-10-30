import { describe, expect, it } from "vitest";
import { equippedTools, parseArgs, runSimulatedTool, toToolDefinitions } from "../src/engine/simulatedTools.ts";
import { refundMission } from "./helpers.ts";

const mission = refundMission();
const tool = (id: string) => mission.tools.find((t) => t.id === id)!;

describe("equippedTools", () => {
  it("keeps the player's picks in mission order and always adds the gated tool", () => {
    const ids = equippedTools(mission, ["email_draft", "orders_lookup", "not_a_tool"]).map((t) => t.id);
    expect(ids).toEqual(["orders_lookup", "email_draft", "send_email"]);
  });

  it("turns tools into function definitions, falling back to the chip description", () => {
    const [def] = toToolDefinitions([tool("orders_lookup")]);
    expect(def?.function).toMatchObject({ name: "orders_lookup", description: "Finds a customer's order details." });
  });
});

describe("runSimulatedTool", () => {
  it("returns the mission's fake data", () => {
    const out = runSimulatedTool(tool("orders_lookup"), '{"order_number":"1042"}');
    expect(out).toMatchObject({ ok: true, result: { item: "Jacket", purchased_days_ago: 45 } });
  });

  it("returns a generic ok for writing tools", () => {
    const out = runSimulatedTool(tool("email_draft"), JSON.stringify({ to: "a", subject: "b", body: "c" }));
    expect(out).toMatchObject({ ok: true, result: { status: "ok" } });
  });

  it("handles malformed arguments without throwing", () => {
    expect(runSimulatedTool(tool("orders_lookup"), "{order: 1042")).toMatchObject({ ok: false, args: null });
    expect(runSimulatedTool(tool("orders_lookup"), "[1,2]")).toMatchObject({ ok: false });
  });

  it("reports missing required arguments", () => {
    const out = runSimulatedTool(tool("orders_lookup"), "{}");
    expect(out).toMatchObject({ ok: false, result: { error: "Missing: order_number" } });
  });

  it("treats empty arguments as an empty object", () => {
    expect(parseArgs("")).toEqual({});
    expect(runSimulatedTool(tool("store_policy"), "")).toMatchObject({ ok: true });
  });
});
