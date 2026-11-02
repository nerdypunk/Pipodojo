import { createHttpModelClient } from "../engine/modelClient.ts";

/** SPEC section 10.2: 10 seconds per model call. */
const MODEL_TIMEOUT_MS = 10_000;

/** Cost control: live runs allowed per page session. */
const MAX_LIVE_RUNS_PER_SESSION = 50;

/** The leaderboard receipt from the latest real answer (see functions/api/leaderboard.js). */
let receipt: { id: string; at: number } | null = null;

export const liveClient = createHttpModelClient({
  url: "/api/chat",
  fetch: async (url, init) => {
    const res = await fetch(url, init);
    const id = res.headers.get("x-pipodojo-receipt");
    if (id) receipt = { id, at: Date.now() };
    return res;
  },
  timeoutMs: MODEL_TIMEOUT_MS,
});

/** Hands over the latest receipt once (null if there's none from the last 30 minutes). */
export function takeReceipt(): string | null {
  const fresh = receipt && Date.now() - receipt.at < 30 * 60_000 ? receipt.id : null;
  receipt = null;
  return fresh;
}

let liveRunsUsed = 0;

/** Returns false once this session has used up its live runs. */
export function takeLiveRun(): boolean {
  if (liveRunsUsed >= MAX_LIVE_RUNS_PER_SESSION) return false;
  liveRunsUsed++;
  return true;
}

export const isDebug = new URLSearchParams(window.location.search).has("debug");
