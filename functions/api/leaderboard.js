// The leaderboard: stars earned by players in each country, today and all time, from Cloudflare D1
// (binding DB). Daily rows are kept, so all time is every day added up.
// Privacy by design: no accounts, no cookies, no IP addresses, nothing about a person. Only a
// country code (the one Cloudflare attaches to every request) and daily totals per country.
//
// Fair counting: every real answer from Muse Spark comes with a one-time receipt (made in
// chat.js, tagged with the caller's country). Finishing a lesson hands that receipt in with its
// stars, and the receipt is used up. So each counted lesson needs a real call through our relay,
// which the guard already limits per visitor. A receipt is good for RECEIPT_TTL_MS.

export const RECEIPT_TTL_MS = 30 * 60_000;
/** Most countries a leaderboard response lists. */
export const MAX_ROWS = 250;
/** How long one isolate reuses the leaderboard it last read. */
export const CACHE_MS = 30_000;

const COUNTRY = /^[A-Z]{2}$/;
/** Codes that aren't a real country: unknown, Tor, and Cloudflare's "XX". */
const NOT_A_COUNTRY = new Set(["XX", "T1"]);
const RECEIPT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, country TEXT NOT NULL, created INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS receipts_created ON receipts (created)",
  "CREATE TABLE IF NOT EXISTS daily (day TEXT NOT NULL, country TEXT NOT NULL, stars INTEGER NOT NULL DEFAULT 0, lessons INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, country))",
];

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

/** The caller's two-letter country code from Cloudflare, or null when it isn't a real country. */
export function countryOf(request) {
  const code = request.cf?.country;
  return typeof code === "string" && COUNTRY.test(code) && !NOT_A_COUNTRY.has(code) ? code : null;
}

/** The leaderboard day: the UTC date, e.g. "2026-11-02". */
export function dayOf(now) {
  return new Date(now).toISOString().slice(0, 10);
}

// The tables are made on first use, once per database per isolate (locally and live alike).
const ready = new WeakMap();
export function ensureTables(db) {
  let done = ready.get(db);
  if (!done) {
    done = (async () => {
      for (const sql of SCHEMA) await db.prepare(sql).run();
    })();
    done.catch(() => ready.delete(db));
    ready.set(db, done);
  }
  return done;
}

/** Makes a one-time receipt for a real answer from the caller's country. Null if it can't. */
export async function issueReceipt(db, request, now = Date.now()) {
  const country = countryOf(request);
  if (!db || !country) return null;
  await ensureTables(db);
  const id = crypto.randomUUID();
  await db.prepare("INSERT INTO receipts (id, country, created) VALUES (?, ?, ?)").bind(id, country, now).run();
  return id;
}

/** POST /api/score { receipt, stars }: uses up the receipt and adds the stars to its country's day. */
export function createScoreHandler({ now = Date.now } = {}) {
  return async function onScore({ request, env }) {
    if (request.method !== "POST") return json(405, { error: { message: "Use POST." } });
    const db = env.DB;
    if (!db) return json(503, { error: { message: "The leaderboard is off." } });
    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: { message: "Body must be valid JSON." } });
    }
    const receipt = body?.receipt;
    const stars = body?.stars;
    if (typeof receipt !== "string" || !RECEIPT.test(receipt)) return json(400, { error: { message: "No valid receipt." } });
    if (!Number.isInteger(stars) || stars < 1 || stars > 3) return json(400, { error: { message: "Stars must be 1, 2 or 3." } });

    const t = now();
    await ensureTables(db);
    // Use the receipt up: only a fresh, unused one counts, and only once.
    const used = await db
      .prepare("DELETE FROM receipts WHERE id = ? AND created >= ? RETURNING country")
      .bind(receipt, t - RECEIPT_TTL_MS)
      .first();
    if (!used) return json(409, { counted: false });

    const day = dayOf(t);
    await db
      .prepare(
        "INSERT INTO daily (day, country, stars, lessons) VALUES (?, ?, ?, 1) ON CONFLICT (day, country) DO UPDATE SET stars = stars + excluded.stars, lessons = lessons + 1",
      )
      .bind(day, used.country, stars)
      .run();
    // Receipts nobody handed in (a Try again, a Send step) are cleared once they're too old to count.
    await db.prepare("DELETE FROM receipts WHERE created < ?").bind(t - RECEIPT_TTL_MS).run();
    return json(200, { counted: true, day, country: used.country });
  };
}

/** GET /api/leaderboard: countries by stars today and all time (every day added up), and the caller's own country. */
export function createLeaderboardHandler({ now = Date.now } = {}) {
  let cached = null;
  return async function onLeaderboard({ request, env }) {
    if (request.method !== "GET") return json(405, { error: { message: "Use GET." } });
    const db = env.DB;
    if (!db) return json(503, { error: { message: "The leaderboard is off." } });
    const t = now();
    const day = dayOf(t);
    if (!cached || cached.day !== day || t - cached.at > CACHE_MS) {
      await ensureTables(db);
      const [today, allTime] = await Promise.all([
        db
          .prepare("SELECT country, stars, lessons FROM daily WHERE day = ? ORDER BY stars DESC, lessons DESC, country ASC LIMIT ?")
          .bind(day, MAX_ROWS)
          .all(),
        db
          .prepare(
            "SELECT country, SUM(stars) AS stars, SUM(lessons) AS lessons FROM daily GROUP BY country ORDER BY stars DESC, lessons DESC, country ASC LIMIT ?",
          )
          .bind(MAX_ROWS)
          .all(),
      ]);
      cached = { day, at: t, countries: today.results ?? [], allTime: allTime.results ?? [] };
    }
    const body = { day, countries: cached.countries, allTime: cached.allTime, you: countryOf(request) };
    return json(200, body, { "cache-control": "no-store" });
  };
}

export const onScore = createScoreHandler();
export const onLeaderboard = createLeaderboardHandler();
