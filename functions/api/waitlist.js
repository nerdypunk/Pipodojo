// The accounts waitlist: parents, teachers, schools and researchers leave an email to hear when
// accounts (or, for researchers, the anonymous usage data) open. Stored in Cloudflare D1 (binding DB).
//
// This is the one place Pipodojo keeps something about a person, and only from adults:
// - Kept: the email, the role picked, the language and the day of signing up. Nothing else, no IP
//   address, no country. Removed whenever someone asks at hello@pipodojo.com.
// - Children (COPPA): the form asks for a birth year in a neutral way (no hint of the cutoff) and
//   only accepts people who are surely 18 or older. The birth year is checked here and never stored.
// - A hidden field catches simple bots; the guard (_middleware.js) limits calls per visitor.

/** Roles a person can pick. "teacher" covers schools too. */
export const ROLES = ["parent", "teacher", "researcher"];
const LANGS = ["en", "es", "ja"];
/** Born this many years ago or more: 18 or older whatever their birthday (a year alone can't say more). */
export const ADULT_YEARS = 19;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL = 254;

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS waitlist (email TEXT NOT NULL, role TEXT NOT NULL, lang TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (email, role))",
];

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// The table is made on first use, once per database per isolate (locally and live alike).
const ready = new WeakMap();
export function ensureTable(db) {
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

/** A cleaned-up email address, or null if it doesn't look like one. */
export function cleanEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= MAX_EMAIL && EMAIL.test(email) ? email : null;
}

/** True only if someone born in `birthYear` is surely an adult in the year of `now`. */
export function isSurelyAdult(birthYear, now) {
  const year = new Date(now).getUTCFullYear();
  return Number.isInteger(birthYear) && birthYear >= year - 120 && year - birthYear >= ADULT_YEARS;
}

/** POST /api/waitlist { email, role, birthYear, lang, website }. */
export function createWaitlistHandler({ now = Date.now } = {}) {
  return async function onWaitlist({ request, env }) {
    if (request.method !== "POST") return json(405, { error: { message: "Use POST." } });
    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: { message: "Body must be valid JSON." } });
    }
    // The hidden field: people never see it, simple bots fill it in. Say yes, keep nothing.
    if (typeof body?.website === "string" && body.website.trim()) return json(200, { ok: true });

    const time = now();
    if (!isSurelyAdult(body?.birthYear, time)) return json(403, { error: { message: "This list is for adults.", code: "too_young" } });
    const email = cleanEmail(body?.email);
    if (!email) return json(400, { error: { message: "That email doesn't look right.", code: "invalid_email" } });
    const role = ROLES.includes(body?.role) ? body.role : null;
    if (!role) return json(400, { error: { message: "Pick parent, teacher or researcher.", code: "invalid_role" } });
    const lang = LANGS.includes(body?.lang) ? body.lang : "en";

    const db = env.DB;
    if (!db) return json(503, { error: { message: "The waitlist is off." } });
    await ensureTable(db);
    // Signing up twice is fine: the first sign-up (and its day) is kept.
    await db
      .prepare("INSERT OR IGNORE INTO waitlist (email, role, lang, day) VALUES (?, ?, ?, ?)")
      .bind(email, role, lang, new Date(time).toISOString().slice(0, 10))
      .run();
    return json(200, { ok: true });
  };
}

export const onWaitlist = createWaitlistHandler();
