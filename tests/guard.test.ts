import { describe, expect, it, vi } from "vitest";
import { LIMITS, createGuard, createLimiter, fromOurPage } from "../functions/api/_middleware.js";

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { method: "POST", headers });
}

describe("fromOurPage", () => {
  it("allows the site's own page and localhost dev", () => {
    expect(fromOurPage(req("https://pipodojo.pages.dev/api/chat", { origin: "https://pipodojo.pages.dev" }))).toBe(true);
    expect(fromOurPage(req("https://abc123.pipodojo.pages.dev/api/chat", { origin: "https://abc123.pipodojo.pages.dev" }))).toBe(true);
    expect(fromOurPage(req("http://127.0.0.1:8788/api/chat", { origin: "http://localhost:5173" }))).toBe(true);
  });

  it("refuses other sites, a missing origin and localhost pretending on the live site", () => {
    expect(fromOurPage(req("https://pipodojo.pages.dev/api/chat", { origin: "https://evil.example" }))).toBe(false);
    expect(fromOurPage(req("https://pipodojo.pages.dev/api/chat"))).toBe(false);
    expect(fromOurPage(req("https://pipodojo.pages.dev/api/chat", { origin: "http://localhost:5173" }))).toBe(false);
    expect(fromOurPage(req("https://pipodojo.pages.dev/api/chat", { origin: "null" }))).toBe(false);
  });
});

describe("createLimiter", () => {
  it("allows up to the limit per key, then reopens after the window", () => {
    let t = 0;
    const limiter = createLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    expect(limiter.take("a")).toBe(0);
    expect(limiter.take("a")).toBe(0);
    expect(limiter.take("a")).toBe(60);
    expect(limiter.take("b")).toBe(0);
    t = 30_000;
    expect(limiter.take("a")).toBe(30);
    t = 60_000;
    expect(limiter.take("a")).toBe(0);
  });
});

describe("guard", () => {
  const site = "https://pipodojo.pages.dev";
  const call = (path: string, ip = "1.2.3.4", origin = site) =>
    req(`${site}${path}`, { origin, "cf-connecting-ip": ip });

  it("passes good requests through and blocks other sites with 403", async () => {
    const guard = createGuard({ now: () => 0 });
    const next = vi.fn(async () => new Response("ok"));
    expect(await (await guard({ request: call("/api/chat"), next })).text()).toBe("ok");
    const blocked = await guard({ request: call("/api/chat", "1.2.3.4", "https://evil.example"), next });
    expect(blocked.status).toBe(403);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("limits postcards per visitor with 429 and a retry-after", async () => {
    const guard = createGuard({ now: () => 0 });
    const next = vi.fn(async () => new Response("ok"));
    for (let i = 0; i < LIMITS["/api/image"].limit; i++) {
      expect((await guard({ request: call("/api/image"), next })).status).toBe(200);
    }
    const limited = await guard({ request: call("/api/image"), next });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    // Another visitor, and chat for the same visitor, are counted apart.
    expect((await guard({ request: call("/api/image", "5.6.7.8"), next })).status).toBe(200);
    expect((await guard({ request: call("/api/chat"), next })).status).toBe(200);
  });
});
