import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../worker/index.js";

const site = "https://pipodojo.example.dev";
const env = { MODEL_API_KEY: "test-key" };

function post(path: string, origin = site) {
  return new Request(`${site}${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", "cf-connecting-ip": "9.9.9.9" },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("worker", () => {
  it("runs the chat endpoint for the site's own page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })));
    const res = await worker.fetch(post("/api/chat"), env);
    expect(res.status).toBe(200);
  });

  it("guards the API and 404s unknown API paths", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    expect((await worker.fetch(post("/api/chat", "https://evil.example"), env)).status).toBe(403);
    expect((await worker.fetch(post("/api/nope"), env)).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
});
