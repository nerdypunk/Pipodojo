// Cloudflare Pages Function: POST /api/chat
// Holds the API key and forwards a Chat Completions request to the Meta Model API.
// Contract (SPEC.md section 5): forces the model, caps output tokens, fixes a low
// temperature, rejects oversized bodies, adds tool_choice only when tools are
// present, returns the upstream response unchanged, never logs request bodies.

export const UPSTREAM_URL = "https://api.meta.ai/v1/chat/completions";
// The client never picks the model. The server may choose one of ALLOWED_MODELS via
// the MODEL_ID env var; anything else falls back to the standard tier.
// The -contributor tier is much cheaper but lets Meta train on prompts. Our prompts
// are only fictional mission text plus button choices, so it is fine for testing.
export const MODEL = "muse-spark-1.2";
export const ALLOWED_MODELS = ["muse-spark-1.2", "muse-spark-1.2-contributor"];

export function resolveModel(env) {
  return ALLOWED_MODELS.includes(env?.MODEL_ID) ? env.MODEL_ID : MODEL;
}
// The model reasons before answering and reasoning tokens count against this cap.
// Too low a cap returns an empty answer (finish_reason "length"). 1200 leaves headroom.
export const MAX_OUTPUT_TOKENS = 1200;
export const MAX_TOKENS_PARAM = "max_tokens"; // max_completion_tokens is also accepted
// "minimal" roughly halves latency on drafting steps vs the default. "none" is rejected.
export const REASONING_EFFORT = "minimal";
export const TEMPERATURE = 0.2;
export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_MESSAGES = 40;
export const MAX_TOOLS = 12;
export const UPSTREAM_TIMEOUT_MS = 20_000;

function errorResponse(status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Builds the upstream body from the client's body. Returns a string error if invalid. */
export function buildUpstreamBody(clientBody, model = MODEL) {
  if (!clientBody || typeof clientBody !== "object") return "Body must be a JSON object.";
  const { messages, tools } = clientBody;
  if (!Array.isArray(messages) || messages.length === 0) return "messages must be a non-empty array.";
  if (messages.length > MAX_MESSAGES) return "Too many messages.";
  if (tools !== undefined && !Array.isArray(tools)) return "tools must be an array.";
  if (Array.isArray(tools) && tools.length > MAX_TOOLS) return "Too many tools.";

  // Only messages and tools come from the client; everything else is fixed here.
  const body = {
    model,
    messages,
    temperature: TEMPERATURE,
    [MAX_TOKENS_PARAM]: MAX_OUTPUT_TOKENS,
    reasoning_effort: REASONING_EFFORT,
  };
  if (Array.isArray(tools) && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  return body;
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return errorResponse(405, "Use POST.");

  const apiKey = env.MODEL_API_KEY;
  if (!apiKey) return errorResponse(500, "The server is not configured.");

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return errorResponse(413, "Request is too large.");

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return errorResponse(413, "Request is too large.");
  }

  let clientBody;
  try {
    clientBody = JSON.parse(raw);
  } catch {
    return errorResponse(400, "Body must be valid JSON.");
  }

  const upstreamBody = buildUpstreamBody(clientBody, resolveModel(env));
  if (typeof upstreamBody === "string") return errorResponse(400, upstreamBody);

  let upstream;
  try {
    upstream = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return errorResponse(timedOut ? 504 : 502, timedOut ? "The model took too long." : "Could not reach the model.");
  }

  // Pass the upstream response through unchanged (status, body, content type).
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
