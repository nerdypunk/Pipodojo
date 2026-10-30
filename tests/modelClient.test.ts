import { describe, expect, it } from "vitest";
import { createHttpModelClient, ModelCallError, parseReply } from "../src/engine/modelClient.ts";

const request = { messages: [{ role: "user" as const, content: "hi" }], tools: [] };

describe("parseReply", () => {
  it("normalizes tool calls from the Meta API shape", () => {
    const reply = parseReply({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: "I'll look up order #1042 for you.",
            tool_calls: [{ id: "call_1", type: "function", function: { name: "orders_lookup", arguments: '{"order_number":"1042"}' } }],
          },
        },
      ],
    });
    expect(reply).toEqual({
      content: "I'll look up order #1042 for you.",
      toolCalls: [{ id: "call_1", name: "orders_lookup", arguments: '{"order_number":"1042"}' }],
    });
  });

  it("treats empty content as null and skips nameless calls", () => {
    const reply = parseReply({ choices: [{ message: { content: "  ", tool_calls: [{ id: "x" }] } }] });
    expect(reply).toEqual({ content: null, toolCalls: [] });
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
    expect(await client.complete(request)).toEqual({ content: "done", toolCalls: [] });
    expect(sent).toEqual(request);
  });
});
