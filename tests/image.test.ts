import { afterEach, describe, expect, it, vi } from "vitest";
import { IMAGE_MODEL, IMAGE_SIZE, MAX_SCENE_CHARS, STYLE, buildImageBody, onRequest } from "../functions/api/image.js";

const env = { MODEL_API_KEY: "test-key" };

function post(body: unknown) {
  return new Request("http://localhost/api/image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function stubUpstream(status = 200, payload: unknown = { data: [{ b64_json: "AAAA" }] }) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("image endpoint", () => {
  it("fixes the model, size, count and style; only the scene comes from the client", () => {
    expect(buildImageBody({ scene: "Pipo at a barbecue", model: "other", n: 9, size: "4096x4096" })).toEqual({
      model: IMAGE_MODEL,
      prompt: `${STYLE} Pipo at a barbecue`,
      n: 1,
      size: IMAGE_SIZE,
    });
  });

  it("rejects a missing or oversized scene", () => {
    expect(typeof buildImageBody({})).toBe("string");
    expect(typeof buildImageBody({ scene: "x".repeat(MAX_SCENE_CHARS + 1) })).toBe("string");
  });

  it("returns only the picture and keeps the key on the server", async () => {
    const fetchMock = stubUpstream();
    const res = await onRequest({ request: post({ scene: "Pipo waves" }), env });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ image: "AAAA", model: IMAGE_MODEL });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
  });

  it("turns upstream trouble into a plain error status", async () => {
    stubUpstream(500, { oops: true });
    expect((await onRequest({ request: post({ scene: "Pipo waves" }), env })).status).toBe(500);
    stubUpstream(200, { data: [] });
    expect((await onRequest({ request: post({ scene: "Pipo waves" }), env })).status).toBe(502);
  });
});
