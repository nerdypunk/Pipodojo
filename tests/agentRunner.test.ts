import { describe, expect, it } from "vitest";
import { askPipo } from "../src/engine/agentRunner.ts";
import { BEST_DINNER, dinnerMission, fakeClock, scriptedClient } from "./helpers.ts";

const mission = dinnerMission();

function ask(picks: string[], replies: Parameters<typeof scriptedClient>[0]) {
  const { client, requests } = scriptedClient(replies);
  return { result: askPipo({ mission, picks, client, now: fakeClock() }), requests };
}

describe("askPipo", () => {
  it("sends the role prompt and exactly the player's prompt, nothing else", async () => {
    const { result, requests } = ask(BEST_DINNER, [{ content: "Mushroom pasta!" }]);
    const run = await result;
    expect(run).toEqual({
      status: "answered",
      prompt: "Plan a dinner for 6 friends this Saturday. One of my friends, Sam, is vegetarian. Keep the total under $60. Give me the menu and a short shopping list.",
      answer: "Mushroom pasta!",
      ms: 100,
    });
    expect(requests[0]!.messages).toEqual([
      { role: "system", content: mission.systemPrompt },
      { role: "user", content: run.prompt },
    ]);
  });

  it("doesn't leak the lesson's facts to Pipo", async () => {
    const { result, requests } = ask(["plan_dinner", "short_list"], [{ content: "ok" }]);
    await result;
    expect(JSON.stringify(requests)).not.toContain("vegetarian");
  });

  it("won't ask until every pick-one row has a piece", async () => {
    const { result, requests } = ask(["plan_dinner"], [{ content: "ok" }]);
    expect(await result).toMatchObject({ status: "failed" });
    expect(requests).toHaveLength(0);
  });

  it("fails quietly (no throw) when the model call fails", async () => {
    const { result } = ask(BEST_DINNER, [new Error("HTTP 500")]);
    expect(await result).toMatchObject({ status: "failed", failure: "HTTP 500" });
  });

  it("treats an empty answer as a failure", async () => {
    const { result } = ask(BEST_DINNER, [{ content: null }]);
    expect(await result).toMatchObject({ status: "failed" });
  });
});
