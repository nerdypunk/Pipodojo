// Simulated tools: nothing real ever happens. Results come from the mission file.
import type { Mission, Tool, ToolDefinition } from "./types.ts";

const EMPTY_PARAMETERS = { type: "object", properties: {}, required: [] };

/**
 * The tools the agent actually gets: the player's picks (in mission order) plus the
 * gated tool, which is always on because it only ever triggers the approval gate.
 */
export function equippedTools(mission: Mission, chosen: readonly string[]): Tool[] {
  return mission.tools.filter((t) => t.role === "gated" || chosen.includes(t.id));
}

export function toToolDefinitions(tools: readonly Tool[]): ToolDefinition[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.id,
      description: t.modelDescription ?? t.description,
      parameters: t.parameters ?? EMPTY_PARAMETERS,
    },
  }));
}

/** Parses a model's tool arguments. Returns null if they aren't a JSON object. */
export function parseArgs(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw.trim() || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export type ToolOutcome =
  | { ok: true; args: Record<string, unknown>; result: unknown }
  | { ok: false; args: Record<string, unknown> | null; result: { error: string } };

/** Plays a tool from the mission's fake data. Bad input becomes an error for the model, never a crash. */
export function runSimulatedTool(tool: Tool, rawArgs: string): ToolOutcome {
  const args = parseArgs(rawArgs);
  if (!args) return { ok: false, args: null, result: { error: "Arguments must be a JSON object." } };

  const required = tool.parameters?.["required"];
  if (Array.isArray(required)) {
    const missing = required.filter((key) => typeof key === "string" && !(key in args));
    if (missing.length) return { ok: false, args, result: { error: `Missing: ${missing.join(", ")}` } };
  }

  return { ok: true, args, result: tool.result ?? { status: "ok" } };
}

/** A tool with no fake result is a "writing" tool: its arguments are the work product. */
export function isWritingTool(tool: Tool): boolean {
  return tool.result === undefined && tool.role !== "gated";
}
