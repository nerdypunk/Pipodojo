// Sends the player's prompt to Pipo (the model) and returns its answer.
// Pipo only gets the role prompt and the player's prompt: it knows only what it is told.
import { buildPrompt, isPromptReady } from "./brief.ts";
import type { ChatMessage, Clock, Mission, ModelClient, PipoRun } from "./types.ts";

export interface RunOptions {
  mission: Mission;
  picks: readonly string[];
  client: ModelClient;
  now: Clock;
}

/** Every lesson's answer is a tiny game card, not a chat reply. */
export const ANSWER_STYLE =
  "Answer like a quick game card, not a chat. Reply with 3 or 4 short lines and nothing else. " +
  "Each line starts with one emoji and has at most 8 words. No intro, no closing, no questions, no markdown.";

export function buildMessages(mission: Mission, prompt: string): ChatMessage[] {
  return [
    { role: "system", content: `${mission.systemPrompt}\n\n${ANSWER_STYLE}` },
    { role: "user", content: prompt },
  ];
}

export async function askPipo({ mission, picks, client, now }: RunOptions): Promise<PipoRun> {
  const prompt = buildPrompt(mission, picks);
  if (!isPromptReady(mission, picks)) return { status: "failed", prompt, failure: "The prompt is missing a piece" };

  const started = now();
  try {
    const reply = await client.complete({ messages: buildMessages(mission, prompt) });
    const answer = reply.content?.trim();
    if (!answer) return { status: "failed", prompt, failure: "Pipo gave an empty answer" };
    return { status: "answered", prompt, answer, ms: Math.round(now() - started) };
  } catch (err) {
    return { status: "failed", prompt, failure: err instanceof Error ? err.message : String(err) };
  }
}
