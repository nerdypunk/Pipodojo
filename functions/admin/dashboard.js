// The waitlist dashboard, for Pipodojo's maker only: everyone on the accounts waitlist (email, role,
// language, day), a few counts, and a CSV download. It lives at /admin, behind a Cloudflare Access
// login, and checks that login again itself (access.js) before showing anything.
//
// GET /admin                    the page (?role=parent|teacher|researcher to show one role)
// GET /admin/waitlist.csv       the same list as a spreadsheet (also takes ?role=)
import { ensureTable, ROLES } from "../api/waitlist.js";
import { adminUser as defaultAdminUser } from "./access.js";

const ROLE_NAMES = { parent: "Parents", teacher: "Teachers and schools", researcher: "Researchers" };
const LANG_NAMES = { en: "English", es: "Spanish", ja: "Japanese" };
/** Rows shown on the page; the CSV always has everyone. */
const PAGE_LIMIT = 5000;

const SECURITY = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** One CSV cell. A leading = + - @ is defused so a spreadsheet never runs it as a formula. */
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function text(status, body) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...SECURITY } });
}

function pickRole(url) {
  const role = url.searchParams.get("role");
  return ROLES.includes(role) ? role : null;
}

async function listRows(db, role, limit) {
  const where = role ? " WHERE role = ?" : "";
  const sql = `SELECT email, role, lang, day FROM waitlist${where} ORDER BY day DESC, email${limit ? ` LIMIT ${limit}` : ""}`;
  const stmt = role ? db.prepare(sql).bind(role) : db.prepare(sql);
  return (await stmt.all()).results ?? [];
}

/** Counts for the cards at the top of the page. */
export async function summary(db, today) {
  const n = async (sql, ...args) => Number((await db.prepare(sql).bind(...args).first())?.n ?? 0);
  const weekAgo = new Date(Date.parse(today) - 6 * 86_400_000).toISOString().slice(0, 10);
  const byRole = Object.fromEntries(ROLES.map((r) => [r, 0]));
  for (const row of (await db.prepare("SELECT role, COUNT(*) AS n FROM waitlist GROUP BY role").all()).results ?? []) {
    if (row.role in byRole) byRole[row.role] = Number(row.n);
  }
  const byLang = {};
  for (const row of (await db.prepare("SELECT lang, COUNT(*) AS n FROM waitlist GROUP BY lang").all()).results ?? []) {
    byLang[row.lang] = Number(row.n);
  }
  return {
    signups: await n("SELECT COUNT(*) AS n FROM waitlist"),
    people: await n("SELECT COUNT(DISTINCT email) AS n FROM waitlist"),
    today: await n("SELECT COUNT(*) AS n FROM waitlist WHERE day = ?", today),
    week: await n("SELECT COUNT(*) AS n FROM waitlist WHERE day >= ?", weekAgo),
    byRole,
    byLang,
  };
}

function csvResponse(rows, role) {
  const lines = ["email,role,lang,day", ...rows.map((r) => [r.email, r.role, r.lang, r.day].map(csvCell).join(","))];
  // The BOM at the start makes Excel read accents correctly.
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      ...SECURITY,
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pipodojo-waitlist${role ? `-${role}` : ""}.csv"`,
    },
  });
}

function page({ user, rows, stats, role }) {
  const card = (label, value) => `<div class="card"><div class="num">${esc(value)}</div><div class="lbl">${esc(label)}</div></div>`;
  const tab = (value, label) =>
    `<a class="tab${role === value ? " on" : ""}" href="/admin${value ? `?role=${value}` : ""}">${esc(label)}</a>`;
  const langs = Object.entries(stats.byLang)
    .map(([lang, n]) => `${esc(LANG_NAMES[lang] ?? lang)} ${esc(n)}`)
    .join(" · ");
  const body = rows.length
    ? rows
        .map(
          (r) =>
            `<tr><td class="email">${esc(r.email)}</td><td>${esc(ROLE_NAMES[r.role] ?? r.role)}</td><td>${esc(LANG_NAMES[r.lang] ?? r.lang)}</td><td class="day">${esc(r.day)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="empty">No one here yet.</td></tr>`;
  const csv = `/admin/waitlist.csv${role ? `?role=${role}` : ""}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Waitlist · Pipodojo</title>
<style>
  :root { --bg: #f4f2ff; --panel: #fff; --ink: #26233a; --muted: #6b6782; --line: #e4e0f5; --brand: #5b4bd6; --brand-soft: #ece9ff; --on-brand: #fff; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #15132a; --panel: #1f1c3a; --ink: #f1efff; --muted: #a9a4c8; --line: #34305a; --brand: #a89cff; --brand-soft: #2c2754; --on-brand: #15132a; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 1000px; margin: 0 auto; padding: 24px 16px 48px; }
  header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; margin-bottom: 20px; }
  h1 { margin: 0; font-size: 24px; font-weight: 800; }
  .who { color: var(--muted); font-size: 13px; }
  .who a { color: var(--brand); }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 12px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }
  .num { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .lbl { color: var(--muted); font-size: 13px; font-weight: 600; }
  .langs { color: var(--muted); font-size: 13px; margin: 0 0 20px; }
  .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .tab { padding: 6px 12px; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); color: var(--ink); text-decoration: none; font-size: 13px; font-weight: 700; }
  .tab.on { background: var(--brand); border-color: var(--brand); color: var(--on-brand); }
  .btn { padding: 8px 14px; border-radius: 10px; background: var(--brand-soft); color: var(--brand); text-decoration: none; font-weight: 800; font-size: 13px; }
  .table { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  tr:last-child td { border-bottom: 0; }
  .email { font-weight: 600; }
  .day { font-variant-numeric: tabular-nums; color: var(--muted); }
  .empty { text-align: center; color: var(--muted); padding: 32px; }
  .note { color: var(--muted); font-size: 12px; margin-top: 10px; }
</style>
</head>
<body>
<main>
  <header>
    <h1>🤖 Pipodojo waitlist</h1>
    <div class="who">Signed in as ${esc(user)} · <a href="/cdn-cgi/access/logout">Sign out</a></div>
  </header>
  <section class="cards" aria-label="Counts">
    ${card("People", stats.people)}
    ${card("Today", stats.today)}
    ${card("Last 7 days", stats.week)}
    ${ROLES.map((r) => card(ROLE_NAMES[r], stats.byRole[r])).join("\n    ")}
  </section>
  <p class="langs">${langs || "No sign-ups yet."}</p>
  <div class="bar">
    <nav class="tabs" aria-label="Show">
      ${tab(null, `Everyone (${stats.signups})`)}
      ${ROLES.map((r) => tab(r, ROLE_NAMES[r])).join("\n      ")}
    </nav>
    <a class="btn" href="${csv}">Download CSV</a>
  </div>
  <div class="table">
    <table>
      <thead><tr><th>Email</th><th>Role</th><th>Language</th><th>Joined</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>
  <p class="note">Someone who picked two roles shows up once for each. Days are in UTC.${rows.length >= PAGE_LIMIT ? ` Showing the newest ${PAGE_LIMIT}; the CSV has everyone.` : ""}</p>
</main>
</body>
</html>`;
}

/** Makes the /admin handler. `adminUser` and `now` can be swapped in tests. */
export function createAdminHandler({ adminUser = defaultAdminUser, now = Date.now } = {}) {
  return async function onAdmin({ request, env }) {
    const user = await adminUser(request, env);
    if (!user) return text(403, "This page is private.");
    if (request.method !== "GET" && request.method !== "HEAD") return text(405, "Use GET.");

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/admin" && path !== "/admin/waitlist.csv") return text(404, "Not found.");
    if (!env.DB) return text(503, "The database isn't connected on this version.");

    await ensureTable(env.DB);
    const role = pickRole(url);
    if (path === "/admin/waitlist.csv") return csvResponse(await listRows(env.DB, role, 0), role);

    const today = new Date(now()).toISOString().slice(0, 10);
    const [rows, stats] = await Promise.all([listRows(env.DB, role, PAGE_LIMIT), summary(env.DB, today)]);
    return new Response(page({ user, rows, stats, role }), {
      headers: { ...SECURITY, "content-type": "text/html; charset=utf-8" },
    });
  };
}

export const onAdmin = createAdminHandler();
