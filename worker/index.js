// The Cloudflare Worker that serves Pipodojo: the built game from `dist`, plus the two API routes.
// The API code lives in functions/api (written as Pages Functions); this file runs it the same
// way on Workers: the guard first (same-site only, per-visitor limits), then the endpoint.
// wrangler.jsonc sends only /api/* here; everything else is served straight from the files.
import { onRequest as guard } from "../functions/api/_middleware.js";
import { onRequest as chat } from "../functions/api/chat.js";
import { onRequest as image } from "../functions/api/image.js";

const ROUTES = { "/api/chat": chat, "/api/image": image };

export default {
  async fetch(request, env) {
    const route = ROUTES[new URL(request.url).pathname];
    if (!route) {
      return new Response(JSON.stringify({ error: { message: "Not found." } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return guard({ request, env, next: () => route({ request, env }) });
  },
};
