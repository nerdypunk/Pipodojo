// Who is looking at the admin pages. Cloudflare Access puts a login in front of /admin and, once
// someone signs in, attaches a signed token (the Cf-Access-Jwt-Assertion header, or the
// CF_Authorization cookie). This file checks that token again here, on the server, so the pages stay
// closed even when someone reaches the Worker another way (the workers.dev or staging address).
//
// Set up in the Cloudflare dashboard, as Worker variables (not in this file):
// - ACCESS_TEAM_DOMAIN: the Zero Trust team domain, like "myteam.cloudflareaccess.com"
// - ACCESS_AUD: the Access application's audience (AUD) tag; several, comma-separated, if more than
//   one Access application points here (for example the live and staging addresses)
// If either is missing, nobody gets in.
//
// For local development only: DEV_ADMIN_BYPASS=true in .dev.vars lets you in, and only on localhost.

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);
/** Access's public keys change rarely; keep them an hour. */
const CERTS_TTL_MS = 60 * 60_000;
/** A little slack for clocks that are a few seconds apart. */
const LEEWAY_S = 60;

function b64urlBytes(part) {
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const b64urlJson = (part) => JSON.parse(new TextDecoder().decode(b64urlBytes(part)));

function readCookie(request, name) {
  for (const piece of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = piece.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/** "myteam.cloudflareaccess.com", whether it was written with https:// or a trailing slash. */
function teamDomain(env) {
  return (env.ACCESS_TEAM_DOMAIN ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function audiences(env) {
  return (env.ACCESS_AUD ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Makes the check. `fetch` and `now` can be swapped in tests; each check keeps its own key cache.
 * The returned function gives the signed-in email, or null if the request isn't let in.
 */
export function createAccessCheck({ fetch: fetchImpl = (...args) => fetch(...args), now = Date.now } = {}) {
  const certs = new Map(); // team domain -> { keys, at }

  async function keysFor(team, { fresh = false } = {}) {
    const cached = certs.get(team);
    if (!fresh && cached && now() - cached.at < CERTS_TTL_MS) return cached.keys;
    const res = await fetchImpl(`https://${team}/cdn-cgi/access/certs`);
    if (!res.ok) throw new Error(`certs ${res.status}`);
    const keys = (await res.json())?.keys;
    if (!Array.isArray(keys)) throw new Error("certs without keys");
    certs.set(team, { keys, at: now() });
    return keys;
  }

  async function verify(token, team, auds) {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [head, body, sig] = parts;
    const header = b64urlJson(head);
    if (header?.alg !== "RS256" || typeof header.kid !== "string") return null;

    // A key we don't know yet may be a fresh rotation: look once more before giving up.
    let jwk = (await keysFor(team)).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await keysFor(team, { fresh: true })).find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signed = new TextEncoder().encode(`${head}.${body}`);
    if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(sig), signed))) return null;

    const claims = b64urlJson(body);
    const t = now() / 1000;
    const tokenAuds = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
    if (!tokenAuds.some((a) => auds.includes(a))) return null;
    if (claims.iss !== `https://${team}`) return null;
    if (typeof claims.exp !== "number" || claims.exp + LEEWAY_S < t) return null;
    if (typeof claims.nbf === "number" && claims.nbf - LEEWAY_S > t) return null;
    return typeof claims.email === "string" && claims.email ? claims.email : null;
  }

  return async function adminUser(request, env) {
    if (env.DEV_ADMIN_BYPASS === "true" && LOCAL.has(new URL(request.url).hostname)) return "local-dev";
    const team = teamDomain(env);
    const auds = audiences(env);
    if (!team || !auds.length) return null;
    const token = request.headers.get("cf-access-jwt-assertion") || readCookie(request, "CF_Authorization");
    if (!token) return null;
    try {
      return await verify(token, team, auds);
    } catch {
      return null;
    }
  };
}

export const adminUser = createAccessCheck();
