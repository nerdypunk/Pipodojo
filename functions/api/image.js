// Cloudflare Pages Function: POST /api/image
// Paints the end-of-path postcard with Muse Image. Holds the API key; the client only sends a
// short scene description. The model, size, count and house style are fixed here so the
// endpoint can only ever make one small Pipodojo postcard per call. Never logs request bodies.

export const UPSTREAM_URL = "https://api.meta.ai/v1/images/generations";
export const IMAGE_MODEL = "muse-image-1.0";
export const IMAGE_SIZE = "1024x1024";
export const MAX_SCENE_CHARS = 700;
export const MAX_BODY_BYTES = 4 * 1024;
export const UPSTREAM_TIMEOUT_MS = 45_000;
export const STYLE =
  "A cheerful illustrated postcard, soft purple and blue colours with warm orange highlights, " +
  "rounded friendly shapes, cosy and playful. No words, letters, numbers or logos anywhere.";

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Builds the upstream body from the client's body. Returns a string error if invalid. */
export function buildImageBody(clientBody) {
  const scene = clientBody && typeof clientBody === "object" ? clientBody.scene : undefined;
  if (typeof scene !== "string" || !scene.trim()) return "scene must be a non-empty string.";
  if (scene.length > MAX_SCENE_CHARS) return "scene is too long.";
  return { model: IMAGE_MODEL, prompt: `${STYLE} ${scene.trim()}`, n: 1, size: IMAGE_SIZE };
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json(405, { error: { message: "Use POST." } });

  const apiKey = env.MODEL_API_KEY;
  if (!apiKey) return json(500, { error: { message: "The server is not configured." } });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, { error: { message: "Request is too large." } });

  let clientBody;
  try {
    clientBody = JSON.parse(raw);
  } catch {
    return json(400, { error: { message: "Body must be valid JSON." } });
  }
  const upstreamBody = buildImageBody(clientBody);
  if (typeof upstreamBody === "string") return json(400, { error: { message: upstreamBody } });

  let upstream;
  try {
    upstream = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return json(timedOut ? 504 : 502, { error: { message: timedOut ? "The painter took too long." : "Could not reach the painter." } });
  }
  if (!upstream.ok) return json(upstream.status, { error: { message: `Painter returned HTTP ${upstream.status}` } });

  // Only the picture goes back (base64), plus which Meta model painted it, shown to the player.
  const result = await upstream.json().catch(() => null);
  const image = result?.data?.[0]?.b64_json;
  if (typeof image !== "string") return json(502, { error: { message: "The painter sent no picture." } });
  const model = typeof result?.model === "string" ? result.model : IMAGE_MODEL;
  return json(200, { image, model });
}
