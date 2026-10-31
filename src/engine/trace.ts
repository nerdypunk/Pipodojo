// Records every model call so the "Under the hood" view can show what really happened:
// what was sent, which tools were offered, what Muse Spark answered, and how long it took.
import type { Clock, ModelClient, ModelReply, ModelRequest } from "./types.ts";

export interface CallRecord {
  request: ModelRequest;
  reply?: ModelReply;
  /** Internal error text; only shown in the under-the-hood view, never as a player error. */
  error?: string;
  ms: number;
}

/** Wraps a client so each call is reported (with its result) after it finishes. */
export function recordingClient(client: ModelClient, now: Clock, onCall: (record: CallRecord) => void): ModelClient {
  return {
    async complete(request) {
      const started = now();
      try {
        const reply = await client.complete(request);
        onCall({ request, reply, ms: Math.round(now() - started) });
        return reply;
      } catch (err) {
        onCall({ request, error: err instanceof Error ? err.message : String(err), ms: Math.round(now() - started) });
        throw err;
      }
    },
  };
}

/** Why a call was made: the first ask, a nudge to use a tool, or the player's Send / Pay. */
export type CallKind = "ask" | "nudge" | "approve";

export function callKind(record: CallRecord, nudge: string, approve: string): CallKind {
  const last = record.request.messages.at(-1);
  if (last?.role === "user" && last.content === nudge) return "nudge";
  if (last?.role === "user" && last.content === approve) return "approve";
  return "ask";
}
