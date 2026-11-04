// The accounts waitlist: adults only (COPPA), only the email, role, language and day are kept, and
// bots that fill the hidden field get a yes but nothing is stored. Runs the real SQL on Node's
// built-in SQLite through a small stand-in for Cloudflare D1's API.
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { cleanEmail, createWaitlistHandler, isSurelyAdult } from "../functions/api/waitlist.js";
import { LIMITS } from "../functions/api/_middleware.js";

function fakeD1() {
  const sqlite = new DatabaseSync(":memory:");
  return {
    sqlite,
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

const NOW = Date.UTC(2026, 10, 4, 12, 0, 0);
const handler = createWaitlistHandler({ now: () => NOW });
const post = (body: unknown) =>
  new Request("https://pipodojo.com/api/waitlist", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const adult = { email: "Ana@Example.com ", role: "parent", birthYear: 1985, lang: "es" };

function rows(db: ReturnType<typeof fakeD1>) {
  try {
    return db.sqlite.prepare("SELECT * FROM waitlist ORDER BY email, role").all();
  } catch {
    return [];
  }
}

describe("waitlist", () => {
  it("keeps only the email, role, language and day from an adult", async () => {
    const db = fakeD1();
    const res = await handler({ request: post(adult), env: { DB: db } });
    expect(res.status).toBe(200);
    expect(rows(db)).toEqual([{ email: "ana@example.com", role: "parent", lang: "es", day: "2026-11-04" }]);
  });

  it("turns away anyone who might be under 18, and stores nothing (COPPA)", async () => {
    const db = fakeD1();
    for (const birthYear of [2020, 2014, 2013, 2008]) {
      const res = await handler({ request: post({ ...adult, birthYear }), env: { DB: db } });
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("too_young");
    }
    // No birth year at all is turned away too.
    expect((await handler({ request: post({ ...adult, birthYear: undefined }), env: { DB: db } })).status).toBe(403);
    expect(rows(db)).toEqual([]);
  });

  it("knows who is surely an adult from a birth year alone", () => {
    expect(isSurelyAdult(2007, NOW)).toBe(true); // 19 this year: at least 18 today
    expect(isSurelyAdult(2008, NOW)).toBe(false); // 18 this year: might still be 17
    expect(isSurelyAdult(1800, NOW)).toBe(false); // not a real birth year
    expect(isSurelyAdult(1990.5, NOW)).toBe(false);
  });

  it("checks the email and the role", async () => {
    const db = fakeD1();
    expect((await handler({ request: post({ ...adult, email: "not an email" }), env: { DB: db } })).status).toBe(400);
    expect((await handler({ request: post({ ...adult, role: "admin" }), env: { DB: db } })).status).toBe(400);
    expect(cleanEmail("  Someone@School.edu ")).toBe("someone@school.edu");
    expect(cleanEmail(`${"a".repeat(250)}@x.com`)).toBeNull();
    expect(rows(db)).toEqual([]);
  });

  it("says yes to bots that fill the hidden field, but keeps nothing", async () => {
    const db = fakeD1();
    const res = await handler({ request: post({ ...adult, website: "https://spam.example" }), env: { DB: db } });
    expect(res.status).toBe(200);
    expect(rows(db)).toEqual([]);
  });

  it("signing up twice keeps one row per role", async () => {
    const db = fakeD1();
    await handler({ request: post(adult), env: { DB: db } });
    await handler({ request: post(adult), env: { DB: db } });
    await handler({ request: post({ ...adult, role: "researcher" }), env: { DB: db } });
    expect(rows(db).map((r) => (r as { role: string }).role)).toEqual(["parent", "researcher"]);
  });

  it("only takes POST, and is limited per visitor", async () => {
    expect((await handler({ request: new Request("https://pipodojo.com/api/waitlist"), env: { DB: fakeD1() } })).status).toBe(405);
    expect(LIMITS["/api/waitlist"]?.limit).toBeLessThanOrEqual(10);
  });
});
