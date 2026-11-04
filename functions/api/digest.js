// The waitlist digest: once a day (a Cron Trigger, see worker/index.js and wrangler.jsonc) Pipodojo
// emails its maker how many people joined the waitlist the day before, by role, and the total so
// far. Counts only: no one's email address goes into the message, so the list itself stays in D1.
// Days with no sign-ups send nothing.
//
// Sent with Cloudflare Email Service (the DIGEST send_email binding) from waitlist@pipodojo.com to
// DIGEST_TO, a secret (the address stays out of this public repo). POST /api/waitlist/digest with
// the secret DIGEST_KEY in the x-digest-key header sends today's counts right away, for testing.
import { ensureTable, ROLES } from "./waitlist.js";

const FROM = { email: "waitlist@pipodojo.com", name: "Pipodojo" };
/** One and many of each role, for the email. */
const ROLE_NAMES = { parent: ["parent", "parents"], teacher: ["teacher or school", "teachers or schools"], researcher: ["researcher", "researchers"] };

const dayOf = (time) => new Date(time).toISOString().slice(0, 10);

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Sign-ups on one UTC day, by role, and everyone on the list. */
export async function countsFor(db, day) {
  await ensureTable(db);
  const { results } = await db.prepare("SELECT role, COUNT(*) AS n FROM waitlist WHERE day = ? GROUP BY role").bind(day).all();
  const byRole = Object.fromEntries(ROLES.map((role) => [role, 0]));
  for (const row of results ?? []) if (row.role in byRole) byRole[row.role] = Number(row.n);
  const total = Number((await db.prepare("SELECT COUNT(*) AS n FROM waitlist").first())?.n ?? 0);
  const newOnes = Object.values(byRole).reduce((a, b) => a + b, 0);
  return { day, byRole, newOnes, total };
}

/** The email for a day's counts: a subject, plain text and simple HTML. */
export function digestEmail({ day, byRole, newOnes, total }, label) {
  const lines = ROLES.filter((role) => byRole[role] > 0).map((role) => `${byRole[role]} ${ROLE_NAMES[role][byRole[role] === 1 ? 0 : 1]}`);
  const subject = `Pipodojo waitlist: ${newOnes} new ${label} (${total} total)`;
  const summary = newOnes ? `${newOnes} ${newOnes === 1 ? "person" : "people"} joined ${label} (${day}): ${lines.join(", ")}.` : `No one joined ${label} (${day}).`;
  const text = [
    summary,
    `${total} on the list in all.`,
    "",
    "The list itself (emails) stays in Cloudflare D1 (pipodojo-leaderboard). To see it:",
    'cf d1 query bcb2faf7-0684-4710-951e-e8651141be2c --sql "SELECT * FROM waitlist ORDER BY day"',
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#26233a">
<p style="font-size:20px;font-weight:800;margin:0 0 8px">🤖 ${newOnes} new on the Pipodojo waitlist ${label}</p>
<p style="margin:0 0 4px">${summary}</p>
<p style="margin:0 0 16px"><b>${total}</b> on the list in all.</p>
<p style="margin:0;color:#6b6782;font-size:14px">The list itself stays in Cloudflare D1:<br><code>cf d1 query bcb2faf7-0684-4710-951e-e8651141be2c --sql "SELECT * FROM waitlist ORDER BY day"</code></p>
</div>`;
  return { subject, text, html };
}

/**
 * Sends one day's digest. `day` defaults to yesterday (the morning digest); a test can ask for
 * today. Skips quietly when the email isn't set up or (unless `always`) nobody joined.
 */
export async function sendDigest(env, { now = Date.now(), day = dayOf(now - 86_400_000), label = "yesterday", always = false } = {}) {
  if (!env.DB || !env.DIGEST || !env.DIGEST_TO) return { sent: false, reason: "not set up" };
  const counts = await countsFor(env.DB, day);
  if (!counts.newOnes && !always) return { sent: false, reason: "no sign-ups", counts };
  const { subject, text, html } = digestEmail(counts, label);
  const result = await env.DIGEST.send({ from: FROM, to: env.DIGEST_TO, subject, text, html });
  return { sent: true, messageId: result?.messageId, counts };
}

/** Constant-time comparison, so the key can't be guessed from response times. */
function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** POST /api/waitlist/digest with x-digest-key: sends today's counts now (for testing). */
export function createDigestHandler({ now = Date.now } = {}) {
  return async function onDigest({ request, env }) {
    if (request.method !== "POST") return json(405, { error: { message: "Use POST." } });
    // Says which problem it is (never the key itself), and forgives spaces or line breaks that slip
    // in when a key is pasted.
    if (!env.DIGEST_KEY?.trim()) return json(503, { error: { message: "The digest key isn't set up on this version." } });
    if (!sameSecret(request.headers.get("x-digest-key")?.trim(), env.DIGEST_KEY.trim())) {
      return json(403, { error: { message: "Not allowed: that key doesn't match." } });
    }
    try {
      const time = now();
      const result = await sendDigest(env, { now: time, day: dayOf(time), label: "today so far", always: true });
      return json(result.sent ? 200 : 503, result);
    } catch (error) {
      // Email Service errors carry a code (e.g. E_SENDER_DOMAIN_NOT_AVAILABLE): pass it on for setup.
      return json(502, { sent: false, reason: error?.code ?? "send failed", message: String(error?.message ?? error) });
    }
  };
}

export const onDigest = createDigestHandler();
