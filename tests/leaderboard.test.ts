// Today's leaderboard: real answers get one-time receipts, a finished lesson hands one in with its
// stars, and the stars add up per country per day. Runs the real SQL on Node's built-in SQLite
// through a small stand-in for Cloudflare D1's API.
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import { createGuard, fromOurPage } from "../functions/api/_middleware.js";
import { onRequest as chat, RECEIPT_HEADER } from "../functions/api/chat.js";
import {
  countryOf,
  createLeaderboardHandler,
  createScoreHandler,
  dayOf,
  issueReceipt,
  RECEIPT_TTL_MS,
} from "../functions/api/leaderboard.js";

/** The slice of D1 the leaderboard uses: prepare(sql).bind(...).first() / all() / run(). */
function fakeD1() {
  const sqlite = new DatabaseSync(":memory:");
  return {
    prepare(sql: string) {
      const make = (args: unknown[]) => {
        const stmt = sqlite.prepare(sql);
        return {
          bind: (...more: unknown[]) => make([...args, ...more]),
          first: async () => (stmt.get(...(args as never[])) as Record<string, unknown> | undefined) ?? null,
          all: async () => ({ results: stmt.all(...(args as never[])) }),
          run: async () => ({ meta: { changes: Number(stmt.run(...(args as never[])).changes) } }),
        };
      };
      return make([]);
    },
  };
}

const T0 = Date.UTC(2026, 10, 2, 15, 0, 0);
const from = (country?: string, init: RequestInit = {}) => {
  const request = new Request("https://pipodojo.com/api/x", init) as Request & { cf?: { country?: string } };
  if (country) Object.defineProperty(request, "cf", { value: { country } });
  return request;
};
const post = (body: unknown) => from(undefined, { method: "POST", body: JSON.stringify(body) });

async function score(db: ReturnType<typeof fakeD1>, body: unknown, now = T0) {
  const res = await createScoreHandler({ now: () => now })({ request: post(body), env: { DB: db } });
  return { status: res.status, body: await res.json() };
}
async function board(db: ReturnType<typeof fakeD1>, country?: string, now = T0) {
  const res = await createLeaderboardHandler({ now: () => now })({ request: from(country), env: { DB: db } });
  return res.json();
}

describe("leaderboard", () => {
  it("takes only real country codes", () => {
    expect(countryOf(from("HN"))).toBe("HN");
    expect(countryOf(from("XX"))).toBeNull();
    expect(countryOf(from("T1"))).toBeNull();
    expect(countryOf(from("hn"))).toBeNull();
    expect(countryOf(from())).toBeNull();
    expect(dayOf(T0)).toBe("2026-11-02");
  });

  it("adds a lesson's stars to its country once, then shows today's countries by stars", async () => {
    const db = fakeD1();
    const hn1 = await issueReceipt(db, from("HN"), T0);
    const hn2 = await issueReceipt(db, from("HN"), T0);
    const mx = await issueReceipt(db, from("MX"), T0);
    expect(await score(db, { receipt: hn1, stars: 3 })).toEqual({ status: 200, body: { counted: true, day: "2026-11-02", country: "HN" } });
    expect((await score(db, { receipt: hn2, stars: 2 })).status).toBe(200);
    expect((await score(db, { receipt: mx, stars: 3 })).status).toBe(200);
    // A receipt counts once.
    expect(await score(db, { receipt: hn1, stars: 3 })).toEqual({ status: 409, body: { counted: false } });

    expect(await board(db, "MX")).toEqual({
      day: "2026-11-02",
      countries: [
        { country: "HN", stars: 5, lessons: 2 },
        { country: "MX", stars: 3, lessons: 1 },
      ],
      allTime: [
        { country: "HN", stars: 5, lessons: 2 },
        { country: "MX", stars: 3, lessons: 1 },
      ],
      you: "MX",
    });
  });

  it("refuses made-up, stale or malformed scores", async () => {
    const db = fakeD1();
    const old = await issueReceipt(db, from("HN"), T0 - RECEIPT_TTL_MS - 1);
    const fresh = await issueReceipt(db, from("HN"), T0);
    expect((await score(db, { receipt: crypto.randomUUID(), stars: 3 })).status).toBe(409);
    expect((await score(db, { receipt: old, stars: 3 })).status).toBe(409);
    expect((await score(db, { receipt: "not-a-receipt", stars: 3 })).status).toBe(400);
    for (const stars of [0, 4, 2.5, "3", null]) expect((await score(db, { receipt: fresh, stars })).status).toBe(400);
    // The fresh receipt was never used by the bad calls, so it still counts.
    expect((await score(db, { receipt: fresh, stars: 1 })).status).toBe(200);
    expect((await board(db)).countries).toEqual([{ country: "HN", stars: 1, lessons: 1 }]);
  });

  it("starts a new board each UTC day, and adds every day up all time", async () => {
    const db = fakeD1();
    const today = await issueReceipt(db, from("HN"), T0);
    await score(db, { receipt: today, stars: 3 });
    const tomorrow = T0 + 24 * 60 * 60_000;
    expect((await board(db, "HN", tomorrow)).countries).toEqual([]);
    expect((await board(db, "HN", T0)).countries).toHaveLength(1);

    for (const [country, stars] of [["HN", 2], ["MX", 3], ["MX", 3]] as const) {
      await score(db, { receipt: await issueReceipt(db, from(country), tomorrow), stars }, tomorrow);
    }
    const next = await board(db, "HN", tomorrow);
    expect(next.countries).toEqual([
      { country: "MX", stars: 6, lessons: 2 },
      { country: "HN", stars: 2, lessons: 1 },
    ]);
    expect(next.allTime).toEqual([
      { country: "MX", stars: 6, lessons: 2 },
      { country: "HN", stars: 5, lessons: 2 },
    ]);
  });

  it("makes no receipt without a database or a real country", async () => {
    const db = fakeD1();
    expect(await issueReceipt(undefined, from("HN"), T0)).toBeNull();
    expect(await issueReceipt(db, from("XX"), T0)).toBeNull();
    expect(await issueReceipt(db, from(), T0)).toBeNull();
  });

  it("says it's off when there's no database", async () => {
    const res = await createLeaderboardHandler()({ request: from("HN"), env: {} });
    expect(res.status).toBe(503);
    const scored = await createScoreHandler()({ request: post({ receipt: crypto.randomUUID(), stars: 3 }), env: {} });
    expect(scored.status).toBe(503);
  });
});

describe("chat receipts", () => {
  const chatRequest = (country?: string) =>
    from(country, { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }) });

  it("gives a real answer a one-time receipt for the caller's country", async () => {
    const db = fakeD1();
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ choices: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    try {
      const res = await chat({ request: chatRequest("HN"), env: { MODEL_API_KEY: "k", DB: db } });
      const receipt = res.headers.get(RECEIPT_HEADER);
      expect(receipt).toMatch(/^[0-9a-f-]{36}$/);
      expect(await res.json()).toEqual({ choices: [] });
      expect((await score(db, { receipt, stars: 2 }, Date.now())).status).toBe(200);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("gives no receipt for a failed answer, and still answers when the database breaks", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));
    try {
      const failed = await chat({ request: chatRequest("HN"), env: { MODEL_API_KEY: "k", DB: fakeD1() } });
      expect(failed.status).toBe(500);
      expect(failed.headers.get(RECEIPT_HEADER)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
    try {
      const broken = { prepare: () => { throw new Error("D1 is down"); } };
      const ok = await chat({ request: chatRequest("HN"), env: { MODEL_API_KEY: "k", DB: broken } });
      expect(ok.status).toBe(200);
      expect(ok.headers.get(RECEIPT_HEADER)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("guard for the leaderboard", () => {
  it("lets the page read the leaderboard with a same-site GET, and nothing else without an Origin", () => {
    const get = (headers: Record<string, string>) => new Request("https://pipodojo.com/api/leaderboard", { headers });
    expect(fromOurPage(get({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(fromOurPage(get({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(fromOurPage(get({}))).toBe(false);
    const postNoOrigin = new Request("https://pipodojo.com/api/score", { method: "POST", headers: { "sec-fetch-site": "same-origin" } });
    expect(fromOurPage(postNoOrigin)).toBe(false);
  });

  it("limits scores per visitor", async () => {
    const guard = createGuard();
    const send = () =>
      guard({
        request: new Request("https://pipodojo.com/api/score", { method: "POST", headers: { origin: "https://pipodojo.com", "cf-connecting-ip": "1.2.3.4" } }),
        next: async () => new Response("ok"),
      });
    for (let i = 0; i < 30; i++) expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });
});

describe("countries", () => {
  it("shows a flag and a name for a country code", async () => {
    const { countryName, flagOf } = await import("../src/game/countries.ts");
    expect(flagOf("HN")).toBe("🇭🇳");
    expect(flagOf("US")).toBe("🇺🇸");
    expect(flagOf("??")).toBe("🏳️");
    expect(countryName("HN", "es")).toBe("Honduras");
    expect(countryName("MX", "es")).toBe("México");
    expect(countryName("US", "en")).toBe("United States");
  });
});
