// Cloudflare Pages middleware for every /api/* route: two cheap guards against someone scripting
// the endpoints to spend the API key.
// 1. Only answer requests made by the Pipodojo page itself (the browser's Origin header must
//    match this site). Local dev on localhost keeps working.
// 2. A per-visitor (per-IP) limit per endpoint. It lives in memory, so it is best effort: each
//    Cloudflare isolate counts on its own and forgets on restart. No database by design.
// Blocked requests get a plain 403 or 429; the game already falls back to a replay (chat) or the
// ready-made postcard (image) on any error, so a player never sees it.

/** Calls per visitor per window. A full lesson uses about 1 to 3 chat calls. */
export const LIMITS = {
  "/api/chat": { limit: 100, windowMs: 10 * 60_000 },
  "/api/image": { limit: 6, windowMs: 10 * 60_000 },
};
/** Past this many tracked visitors, forget the ones whose window is over. */
const MAX_TRACKED = 5000;
const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

function json(status, message, headers = {}) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** True when the request comes from a page on this same site (or from localhost to localhost). */
export function fromOurPage(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let from;
  try {
    from = new URL(origin);
  } catch {
    return false;
  }
  const to = new URL(request.url);
  if (from.host === to.host) return true;
  return LOCAL.has(from.hostname) && LOCAL.has(to.hostname);
}

/** A fixed-window counter per key. `take` returns 0 when allowed, else seconds until it resets. */
export function createLimiter({ limit, windowMs, now = Date.now }) {
  const windows = new Map();
  return {
    take(key) {
      const t = now();
      let win = windows.get(key);
      if (!win || t - win.start >= windowMs) {
        if (windows.size >= MAX_TRACKED) {
          for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k);
          if (windows.size >= MAX_TRACKED) windows.clear();
        }
        win = { start: t, count: 0 };
        windows.set(key, win);
      }
      if (win.count >= limit) return Math.max(1, Math.ceil((win.start + windowMs - t) / 1000));
      win.count++;
      return 0;
    },
  };
}

export function createGuard({ now = Date.now } = {}) {
  const limiters = Object.fromEntries(
    Object.entries(LIMITS).map(([path, rule]) => [path, createLimiter({ ...rule, now })]),
  );
  return async function guard({ request, next }) {
    if (!fromOurPage(request)) return json(403, "Only the Pipodojo page can use this.");
    const limiter = limiters[new URL(request.url).pathname];
    if (limiter) {
      const visitor = request.headers.get("cf-connecting-ip") ?? "local";
      const wait = limiter.take(visitor);
      if (wait) return json(429, "Pipo needs a short break. Try again in a few minutes.", { "retry-after": String(wait) });
    }
    return next();
  };
}

export const onRequest = createGuard();
