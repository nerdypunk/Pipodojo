import { describe, expect, it } from "vitest";
import { actionAnswer, pickAction, readable, toolDefinitions } from "../src/engine/actions.ts";
import { APPROVE_MESSAGE, approveAction, askPipo, TOOL_NUDGE } from "../src/engine/agentRunner.ts";
import { evaluate } from "../src/engine/evaluator.ts";
import { parseMission } from "../src/engine/missionLoader.ts";
import { parseReply } from "../src/engine/modelClient.ts";
import { fakeClock, readMissionFiles, scriptedClient } from "./helpers.ts";

const invite = parseMission(readMissionFiles()["parent-02-invite.json"], "parent-02-invite.json");
const groceries = parseMission(readMissionFiles()["parent-03-groceries.json"], "parent-03-groceries.json");
const BEST_INVITE = ["invite_group", "time_place", "rsvp", "check_first"];

describe("tool lessons", () => {
  it("offers the lesson's tools in the Chat Completions format", () => {
    expect(toolDefinitions(invite).map((t) => t.function.name)).toEqual([
      "send_whatsapp_message",
      "draft_whatsapp_message",
    ]);
  });

  it("writes arguments the way a person reads them", () => {
    expect(readable(57.4)).toBe("57.40");
    expect(readable([{ name: "Buns", price: 4 }, "Corn"])).toBe("Buns ($4), Corn");
    expect(readable(undefined)).toBe("?");
  });

  it("turns a tool call into answer lines", () => {
    const action = pickAction(groceries, [
      { name: "unknown_tool", args: {} },
      { name: "pay_and_order", args: { items: [{ name: "Burgers", price: 12 }], total: 58.5, delivery: "Saturday 1pm" } },
    ]);
    expect(action).toMatchObject({ tool: "pay_and_order", app: "shop", outcome: "done" });
    expect(actionAnswer(groceries, action!)).toBe(
      "🛒 Burgers ($12)\n💳 Total $58.50\n🚚 Delivery Saturday 1pm\n✅ Paid and ordered",
    );
  });
});

describe("askPipo with tools", () => {
  it("sends the tools and scores the action like any answer", async () => {
    const { client, requests } = scriptedClient([
      {
        content: null,
        toolCalls: [
          { name: "send_whatsapp_message", args: { to: "Barbecue crew", message: "BBQ Saturday 4pm, 12 Oak St. Reply by Thursday!" } },
        ],
      },
    ]);
    const picks = ["invite_group", "time_place", "rsvp", "send_now"];
    const run = await askPipo({ mission: invite, picks, client, now: fakeClock() });

    expect(requests[0]!.tools).toHaveLength(2);
    expect(run).toMatchObject({ status: "answered", action: { tool: "send_whatsapp_message", outcome: "done" } });
    if (run.status !== "answered") return;
    expect(run.answer).toContain("✅ Sent");
    expect(evaluate(invite, picks, run.answer).visibleFlaws).toEqual(["sent_unchecked"]);
  });

  it("a draft that waits for your OK is a clean 3 stars", async () => {
    const { client } = scriptedClient([
      {
        content: null,
        toolCalls: [
          { name: "draft_whatsapp_message", args: { to: "Barbecue crew group", message: "BBQ Saturday 4pm at 12 Oak St, reply by Thursday" } },
        ],
      },
    ]);
    const run = await askPipo({ mission: invite, picks: BEST_INVITE, client, now: fakeClock() });
    if (run.status !== "answered") throw new Error("expected an answer");
    expect(evaluate(invite, BEST_INVITE, run.answer).stars).toBe(3);
  });

  it("nudges once when Pipo replies in text, and uses the tool call that follows", async () => {
    const { client, requests } = scriptedClient([
      { content: "Sure, I'll draft it!" },
      { content: null, toolCalls: [{ name: "draft_whatsapp_message", args: { to: "Barbecue crew", message: "Hi" } }] },
    ]);
    const run = await askPipo({ mission: invite, picks: BEST_INVITE, client, now: fakeClock() });
    expect(requests).toHaveLength(2);
    expect(requests[1]!.messages.at(-1)).toEqual({ role: "user", content: TOOL_NUDGE });
    expect(run).toMatchObject({ status: "answered", action: { tool: "draft_whatsapp_message" } });
  });

  it("falls back to the text reply when Pipo still doesn't use a tool", async () => {
    const { client } = scriptedClient([{ content: "Sure!" }, { content: "📨 To: Barbecue crew\n⏳ Waiting" }]);
    const run = await askPipo({ mission: invite, picks: BEST_INVITE, client, now: fakeClock() });
    expect(run).toMatchObject({ status: "answered", answer: "📨 To: Barbecue crew\n⏳ Waiting" });
    expect(run).not.toHaveProperty("action");
  });

  it("lessons without tools make one call and never nudge", async () => {
    const { client, requests } = scriptedClient([{ content: "🍔 Burgers" }]);
    const dinner = parseMission(readMissionFiles()["parent-01-dinner.json"], "parent-01-dinner.json");
    await askPipo({ mission: dinner, picks: ["plan_dinner", "short_list"], client, now: fakeClock() });
    expect(requests).toHaveLength(1);
    expect(requests[0]).not.toHaveProperty("tools");
  });
});

describe("approveAction", () => {
  const draft = {
    tool: "draft_whatsapp_message",
    app: "whatsapp" as const,
    outcome: "waiting" as const,
    args: { to: "Barbecue crew", message: "BBQ Saturday 4pm" },
  };

  it("asks Pipo to go ahead and uses its own finishing tool call", async () => {
    const { client, requests } = scriptedClient([
      { content: null, toolCalls: [{ name: "send_whatsapp_message", args: { to: "Barbecue crew", message: "BBQ Saturday 4pm!" } }] },
    ]);
    const done = await approveAction({ mission: invite, prompt: "Invite them", action: draft, client });
    expect(requests[0]!.messages.at(-1)).toEqual({ role: "user", content: APPROVE_MESSAGE });
    expect(done).toEqual({
      tool: "send_whatsapp_message",
      app: "whatsapp",
      outcome: "done",
      args: { to: "Barbecue crew", message: "BBQ Saturday 4pm!" },
    });
  });

  it("finishes locally if Pipo fails or holds it again, so it always goes through", async () => {
    const failing = scriptedClient([new Error("network")]).client;
    const holding = scriptedClient([{ content: null, toolCalls: [{ name: "draft_whatsapp_message", args: {} }] }]).client;
    for (const client of [failing, holding]) {
      const done = await approveAction({ mission: invite, prompt: "Invite them", action: draft, client });
      expect(done).toEqual({ ...draft, tool: "send_whatsapp_message", outcome: "done" });
    }
  });
});

describe("parseReply tool calls", () => {
  it("reads tool calls and skips unreadable ones", () => {
    const reply = parseReply({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              { type: "function", function: { name: "show_cart", arguments: '{"total": 57}' } },
              { type: "function", function: { name: "broken", arguments: "{not json" } },
            ],
          },
        },
      ],
    });
    expect(reply).toEqual({ content: null, toolCalls: [{ name: "show_cart", args: { total: 57 } }] });
  });
});
