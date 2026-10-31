// HTTP model client for an OpenAI-style Chat Completions endpoint (our /api/chat proxy).
import type { ModelClient, ModelReply, ToolCall } from "./types.ts";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface HttpModelClientOptions {
  url: string;
  fetch: FetchLike;
  /** Per model call. SPEC: 10 seconds. */
  timeoutMs: number;
}

export class ModelCallError extends Error {
  override name = "ModelCallError";
}

export function createHttpModelClient({ url, fetch, timeoutMs }: HttpModelClientOptions): ModelClient {
  return {
    async complete(request) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const timedOut = err instanceof Error && err.name === "TimeoutError";
        throw new ModelCallError(timedOut ? "Model call timed out" : "Model call failed to send");
      }
      if (!res.ok) throw new ModelCallError(`Model call returned HTTP ${res.status}`);

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new ModelCallError("Model reply was not JSON");
      }
      return parseReply(json);
    },
  };
}

/** Normalizes a Chat Completions response. Throws ModelCallError if the shape is wrong. */
export function parseReply(json: unknown): ModelReply {
  const message = (json as { choices?: { message?: unknown }[] } | null)?.choices?.[0]?.message as
    | { content?: unknown; tool_calls?: unknown }
    | undefined;
  if (!message || typeof message !== "object") throw new ModelCallError("Model reply had no message");

  const content = typeof message.content === "string" && message.content.trim() ? message.content : null;
  const toolCalls = parseToolCalls(message.tool_calls);
  return toolCalls.length ? { content, toolCalls } : { content };
}

/** Tool calls with readable JSON arguments; anything malformed is skipped. */
function parseToolCalls(raw: unknown): ToolCall[] {
  if (!Array.isArray(raw)) return [];
  const calls: ToolCall[] = [];
  for (const item of raw) {
    const fn = (item as { function?: { name?: unknown; arguments?: unknown } } | null)?.function;
    if (!fn || typeof fn.name !== "string") continue;
    try {
      const args: unknown = typeof fn.arguments === "string" ? JSON.parse(fn.arguments || "{}") : fn.arguments;
      if (args && typeof args === "object" && !Array.isArray(args)) {
        calls.push({ name: fn.name, args: args as Record<string, unknown> });
      }
    } catch {
      // Unreadable arguments: treat as no call.
    }
  }
  return calls;
}
