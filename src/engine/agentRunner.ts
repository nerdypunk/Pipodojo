// Sends the player's prompt to Pipo (the model) and returns its answer.
// Pipo only gets the role prompt and the player's prompt: it knows only what it is told.
// In lessons with tools, Pipo acts in a pretend app (a tool call) and the action becomes the answer.
import { actionAnswer, pickAction, toolDefinitions } from "./actions.ts";
import { buildPrompt, isPromptReady } from "./brief.ts";
import type { ChatMessage, Clock, Mission, ModelClient, ModelRequest, PipoAction, PipoRun } from "./types.ts";

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

/** In lessons with tools: act through a tool instead of describing what you would do. */
export const TOOL_STYLE =
  "You act through your tools: the user only sees what your tools do, never a text reply. " +
  "Do the task by calling exactly one of your tools, filling in every field. Don't ask questions; " +
  "if something wasn't said, decide it yourself.";

/** Sent once if Pipo replied in text in a lesson with tools. */
export const TOOL_NUDGE = "Please do it now by calling one of your tools.";

export function buildMessages(mission: Mission, prompt: string): ChatMessage[] {
  const style = mission.tools?.length ? `${ANSWER_STYLE}\n\n${TOOL_STYLE}` : ANSWER_STYLE;
  return [
    { role: "system", content: `${mission.systemPrompt}\n\n${style}` },
    { role: "user", content: prompt },
  ];
}

export function buildRequest(mission: Mission, prompt: string): ModelRequest {
  const tools = toolDefinitions(mission);
  return tools.length ? { messages: buildMessages(mission, prompt), tools } : { messages: buildMessages(mission, prompt) };
}

/** What the player "says" when they tap Send or Pay on Pipo's phone. */
export const APPROVE_MESSAGE = "Looks good, go ahead and do it now.";

/**
 * The player approved an action Pipo was holding (a draft or a cart). Pipo is asked to go ahead
 * and finishes it with its own tool call. If the call fails or Pipo doesn't act, the action is
 * finished locally so the player always sees it go through.
 */
export async function approveAction(opts: {
  mission: Mission;
  prompt: string;
  action: PipoAction;
  client: ModelClient;
}): Promise<PipoAction> {
  const { mission, prompt, action, client } = opts;
  const finish = mission.tools?.find((t) => t.app === action.app && t.outcome === "done");
  const local: PipoAction = finish ? { ...action, tool: finish.name, outcome: "done" } : { ...action, outcome: "done" };
  if (action.outcome === "done") return action;
  try {
    const request = buildRequest(mission, prompt);
    const reply = await client.complete({
      ...request,
      messages: [
        ...request.messages,
        { role: "assistant", content: `It's ready and I'm waiting for your OK:\n${actionAnswer(mission, action)}` },
        { role: "user", content: APPROVE_MESSAGE },
      ],
    });
    const next = pickAction(mission, reply.toolCalls);
    return next && next.outcome === "done" ? next : local;
  } catch {
    return local;
  }
}

export async function askPipo({ mission, picks, client, now }: RunOptions): Promise<PipoRun> {
  const prompt = buildPrompt(mission, picks);
  if (!isPromptReady(mission, picks)) return { status: "failed", prompt, failure: "The prompt is missing a piece" };

  const started = now();
  try {
    const request = buildRequest(mission, prompt);
    let reply = await client.complete(request);
    // Tools can't be forced through the API (tool_choice "auto" only), so nudge once, like an agent loop.
    if (request.tools && !pickAction(mission, reply.toolCalls)) {
      reply = await client.complete({
        ...request,
        messages: [...request.messages, { role: "assistant", content: reply.content ?? "" }, { role: "user", content: TOOL_NUDGE }],
      });
    }
    const ms = Math.round(now() - started);

    const action = pickAction(mission, reply.toolCalls);
    if (action) return { status: "answered", prompt, answer: actionAnswer(mission, action), ms, action };

    const answer = reply.content?.trim();
    if (!answer) return { status: "failed", prompt, failure: "Pipo gave an empty answer" };
    return { status: "answered", prompt, answer, ms };
  } catch (err) {
    return { status: "failed", prompt, failure: err instanceof Error ? err.message : String(err) };
  }
}
