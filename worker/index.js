// The Cloudflare Worker that serves Pipodojo: the built game from `dist`, plus the API routes.
// The API code lives in functions/api (written as Pages Functions); this file runs it the same
// way on Workers: the guard first (same-site only, per-visitor limits), then the endpoint.
// wrangler.jsonc sends only /api/* and /admin here; everything else is served straight from the files.
import { onRequest as guard } from "../functions/api/_middleware.js";
import { onRequest as chat } from "../functions/api/chat.js";
import { onRequest as image } from "../functions/api/image.js";
import { onLeaderboard as leaderboard, onScore as score } from "../functions/api/leaderboard.js";
import { onWaitlist as waitlist } from "../functions/api/waitlist.js";
import { onDigest as digest, sendDigest } from "../functions/api/digest.js";
import { onAdmin as admin } from "../functions/admin/dashboard.js";

const ROUTES = { "/api/chat": chat, "/api/image": image, "/api/score": score, "/api/leaderboard": leaderboard, "/api/waitlist": waitlist, "/api/waitlist/digest": digest };

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    // The waitlist dashboard: opened by its maker in the browser, so not behind the API guard (which
    // only lets the game's own page in). It checks the Cloudflare Access login itself.
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return admin({ request, env });
    const route = ROUTES[pathname];
    if (!route) {
      return new Response(JSON.stringify({ error: { message: "Not found." } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return guard({ request, env, next: () => route({ request, env }) });
  },
  // The Cron Trigger in wrangler.jsonc (every morning): email yesterday's waitlist sign-ups.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDigest(env, { now: event.scheduledTime }));
  },
};
