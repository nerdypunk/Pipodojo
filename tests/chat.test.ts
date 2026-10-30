import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_BODY_BYTES,
  MAX_OUTPUT_TOKENS,
  MAX_TOKENS_PARAM,
  MODEL,
  REASONING_EFFORT,
  buildUpstreamBody,
  onRequest,
} from "../functions/api/chat.js";

const env = { MODEL_API_KEY: "test-key" };
const messages = [{ role: "user", content: "hi" }];
const tools = [{ type: "function", function: { name: "t", parameters: { type: "object" } } }];

function post(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function stubUpstream(status = 200, payload: unknown = { choices: [] }) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof stubUpstream>) {
  const init = fetchMock.mock.calls[0]?.[1];
  return JSON.parse(String(init?.body));
}

afterEach(() => vi.unstubAllGlobals());

describe("buildUpstreamBody", () => {
  it("forces the model and output cap, ignoring client overrides", () => {
    const body = buildUpstreamBody({
      messages,
      model: "something-contributor",
      temperature: 2,
      max_tokens: 99999,
      reasoning_effort: "max",
    });
    expect(body).toMatchObject({
      model: MODEL,
      [MAX_TOKENS_PARAM]: MAX_OUTPUT_TOKENS,
      reasoning_effort: REASONING_EFFORT,
    });
    expect(body).not.toHaveProperty("max_completion_tokens");
    expect((body as { temperature: number }).temperature).toBeLessThanOrEqual(0.3);
  });

  it("adds tool_choice only when tools are present", () => {
    expect(buildUpstreamBody({ messages })).not.toHaveProperty("tool_choice");
    expect(buildUpstreamBody({ messages, tools: [] })).not.toHaveProperty("tool_choice");
    expect(buildUpstreamBody({ messages, tools })).toMatchObject({ tools, tool_choice: "auto" });
  });

  it("rejects bad shapes", () => {
    expect(typeof buildUpstreamBody({})).toBe("string");
    expect(typeof buildUpstreamBody({ messages: [] })).toBe("string");
    expect(typeof buildUpstreamBody({ messages, tools: "nope" })).toBe("string");
  });
});

describe("onRequest", () => {
  it("rejects non-POST methods", async () => {
    const res = await onRequest({ request: new Request("http://localhost/api/chat"), env });
    expect(res.status).toBe(405);
  });

  it("rejects oversized bodies without calling upstream", async () => {
    const fetchMock = stubUpstream();
    const big = JSON.stringify({ messages: [{ role: "user", content: "x".repeat(MAX_BODY_BYTES) }] });
    const res = await onRequest({ request: post(big), env });
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    stubUpstream();
    const res = await onRequest({ request: post("{not json"), env });
    expect(res.status).toBe(400);
  });

  it("fails cleanly when the key is missing", async () => {
    const fetchMock = stubUpstream();
    const res = await onRequest({ request: post({ messages }), env: {} });
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the key as a bearer token and the forced model upstream", async () => {
    const fetchMock = stubUpstream();
    await onRequest({ request: post({ messages, tools, model: "other" }), env });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
    expect(sentBody(fetchMock)).toMatchObject({ model: MODEL, tool_choice: "auto" });
  });

  it("uses MODEL_ID only when it is on the allowlist", async () => {
    let fetchMock = stubUpstream();
    await onRequest({ request: post({ messages }), env: { ...env, MODEL_ID: "muse-spark-1.2-contributor" } });
    expect(sentBody(fetchMock).model).toBe("muse-spark-1.2-contributor");

    fetchMock = stubUpstream();
    await onRequest({ request: post({ messages }), env: { ...env, MODEL_ID: "some-other-model" } });
    expect(sentBody(fetchMock).model).toBe(MODEL);
  });

  it("passes the upstream status and body through unchanged", async () => {
    stubUpstream(429, { error: { message: "slow down" } });
    const res = await onRequest({ request: post({ messages }), env });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: { message: "slow down" } });
  });

  it("does not leak the key in error responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const res = await onRequest({ request: post({ messages }), env });
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("test-key");
  });
});
