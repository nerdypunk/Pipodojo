// The tool-calling loop: call the model, play tools locally, repeat until the
// model asks for the gated tool, gives a final answer, or hits MAX_STEPS.
import { buildPrompt, isBriefReady } from "./brief.ts";
import { equippedTools, isWritingTool, runSimulatedTool, toToolDefinitions } from "./simulatedTools.ts";
import type {
  AgentRun,
  ChatMessage,
  Clock,
  Draft,
  Mission,
  ModelClient,
  RunStep,
  Setup,
} from "./types.ts";

export const MAX_STEPS = 6;

export interface RunOptions {
  mission: Mission;
  setup: Setup;
  client: ModelClient;
  now: Clock;
  /** Called as each step happens, so the UI can animate the trace live. */
  onStep?: (step: RunStep) => void;
  maxSteps?: number;
}

/** The mission's context, then the player's prompt exactly as the "Your prompt" card shows it. */
export function buildInitialMessages(mission: Mission, prompt: string): ChatMessage[] {
  return [
    { role: "system", content: mission.systemPrompt },
    {
      role: "user",
      content: `Here is the situation:\n${JSON.stringify(mission.context, null, 2)}\n\n${prompt}`,
    },
  ];
}

export async function runAgent({ mission, setup, client, now, onStep, maxSteps = MAX_STEPS }: RunOptions): Promise<AgentRun> {
  if (!isBriefReady(mission, setup.picks)) return failed([], "The brief is missing a choice");

  const tools = equippedTools(mission, setup.equipped);
  const definitions = toToolDefinitions(tools);
  const messages = buildInitialMessages(mission, buildPrompt(mission, setup.picks));
  const steps: RunStep[] = [];
  const record = (step: RunStep) => {
    steps.push(step);
    onStep?.(step);
  };

  let finalAnswer: string | null = null;

  for (let i = 0; i < maxSteps; i++) {
    const started = now();
    let reply;
    try {
      reply = await client.complete({ messages, tools: definitions });
    } catch (err) {
      return failed(steps, err instanceof Error ? err.message : String(err));
    }
    record({ kind: "model", ms: Math.round(now() - started), content: reply.content, toolCalls: reply.toolCalls });

    if (reply.toolCalls.length === 0) {
      finalAnswer = reply.content;
      break;
    }

    messages.push({
      role: "assistant",
      content: reply.content,
      tool_calls: reply.toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.arguments },
      })),
    });

    for (const call of reply.toolCalls) {
      const tool = tools.find((t) => t.id === call.name);

      if (tool?.role === "gated") {
        const outcome = runSimulatedTool(tool, call.arguments);
        record({ kind: "gate", callId: call.id, toolId: tool.id, args: outcome.args });
        return { status: "gate", steps, draft: findDraft(mission, steps, null), reachedGatedTool: true };
      }

      if (!tool) {
        const result = { error: `There is no tool called "${call.name}".` };
        record({ kind: "tool", callId: call.id, toolId: call.name, args: null, result, ok: false });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
        continue;
      }

      const outcome = runSimulatedTool(tool, call.arguments);
      record({ kind: "tool", callId: call.id, toolId: tool.id, args: outcome.args, result: outcome.result, ok: outcome.ok });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(outcome.result) });
    }
  }

  // No gated call. The player still reviews whatever Pipo produced before it goes out.
  const draft = findDraft(mission, steps, finalAnswer);
  if (!draft) return failed(steps, "The agent produced nothing to review");
  return { status: "gate", steps, draft, reachedGatedTool: false };
}

function failed(steps: RunStep[], failure: string): AgentRun {
  return { status: "failed", steps, draft: null, reachedGatedTool: false, failure };
}

/**
 * The draft shown at the gate: the gated call's arguments, else the last writing
 * tool's arguments, else the model's final answer.
 */
export function findDraft(mission: Mission, steps: readonly RunStep[], finalAnswer: string | null): Draft | null {
  const gate = steps.findLast((s) => s.kind === "gate");
  if (gate?.kind === "gate" && gate.args) return toDraft(gate.toolId, gate.args);

  const writing = steps.findLast((s) => {
    if (s.kind !== "tool" || !s.ok || !s.args) return false;
    const tool = mission.tools.find((t) => t.id === s.toolId);
    return tool !== undefined && isWritingTool(tool);
  });
  if (writing?.kind === "tool" && writing.args) return toDraft(writing.toolId, writing.args);

  if (finalAnswer?.trim()) return toDraft("answer", { message: finalAnswer.trim() });
  return null;
}

function toDraft(source: string, args: Record<string, unknown>): Draft {
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(args)) {
    fields[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return { source, fields, text: Object.values(fields).join("\n") };
}
