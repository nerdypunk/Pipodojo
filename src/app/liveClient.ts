import { createHttpModelClient } from "../engine/modelClient.ts";

/** SPEC section 10.2: 10 seconds per model call. */
const MODEL_TIMEOUT_MS = 10_000;

/** Cost control: live runs allowed per page session. */
const MAX_LIVE_RUNS_PER_SESSION = 50;

export const liveClient = createHttpModelClient({
  url: "/api/chat",
  fetch: (url, init) => fetch(url, init),
  timeoutMs: MODEL_TIMEOUT_MS,
});

let liveRunsUsed = 0;

/** Returns false once this session has used up its live runs. */
export function takeLiveRun(): boolean {
  if (liveRunsUsed >= MAX_LIVE_RUNS_PER_SESSION) return false;
  liveRunsUsed++;
  return true;
}

export const isDebug = new URLSearchParams(window.location.search).has("debug");
