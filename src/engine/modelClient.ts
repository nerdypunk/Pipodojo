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
  const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  const toolCalls: ToolCall[] = rawCalls.flatMap((c: unknown, i) => {
    const call = c as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
    if (typeof call?.function?.name !== "string") return [];
    return [
      {
        id: typeof call.id === "string" ? call.id : `call_${i}`,
        name: call.function.name,
        arguments: typeof call.function.arguments === "string" ? call.function.arguments : "",
      },
    ];
  });
  return { content, toolCalls };
}
