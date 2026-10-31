import { describe, expect, it } from "vitest";
import { createHttpModelClient, ModelCallError, parseReply } from "../src/engine/modelClient.ts";

const request = { messages: [{ role: "user" as const, content: "hi" }] };

describe("parseReply", () => {
  it("reads the answer from the Meta API shape", () => {
    const reply = parseReply({
      choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Mushroom pasta!", refusal: null } }],
    });
    expect(reply).toEqual({ content: "Mushroom pasta!" });
  });

  it("treats empty content as null", () => {
    expect(parseReply({ choices: [{ message: { content: "  " } }] })).toEqual({ content: null });
    expect(parseReply({ choices: [{ message: { content: null } }] })).toEqual({ content: null });
  });

  it("throws on a reply with no message", () => {
    expect(() => parseReply({ choices: [] })).toThrow(ModelCallError);
  });
});

describe("createHttpModelClient", () => {
  it("throws a ModelCallError on HTTP errors", async () => {
    const client = createHttpModelClient({
      url: "/api/chat",
      timeoutMs: 1000,
      fetch: async () => new Response("{}", { status: 429 }),
    });
    await expect(client.complete(request)).rejects.toThrow("HTTP 429");
  });

  it("times out slow calls", async () => {
    const client = createHttpModelClient({
      url: "/api/chat",
      timeoutMs: 20,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    });
    await expect(client.complete(request)).rejects.toThrow("timed out");
  });

  it("posts messages and tools as JSON", async () => {
    let sent: unknown;
    const client = createHttpModelClient({
      url: "/api/chat",
      timeoutMs: 1000,
      fetch: async (_url, init) => {
        sent = JSON.parse(String(init.body));
        return Response.json({ choices: [{ message: { content: "done" } }] });
      },
    });
    expect(await client.complete(request)).toEqual({ content: "done" });
    expect(sent).toEqual(request);
  });
});
