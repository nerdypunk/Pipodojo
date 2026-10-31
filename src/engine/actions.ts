// Turns a tool call (Pipo acting in a pretend app) into the text lines the rest of the game
// already understands: the flaws score them and the answer card shows them.
import type { Mission, PipoAction, ToolCall, ToolDefinition } from "./types.ts";

/** The lesson's tools in the Chat Completions format. */
export function toolDefinitions(mission: Mission): ToolDefinition[] {
  return (mission.tools ?? []).map((tool) => ({
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));
}

/** The first tool call that matches one of the lesson's tools. */
export function pickAction(mission: Mission, calls: readonly ToolCall[] | undefined): PipoAction | null {
  for (const call of calls ?? []) {
    const tool = mission.tools?.find((t) => t.name === call.name);
    if (tool) return { tool: tool.name, app: tool.app, outcome: tool.outcome, args: call.args };
  }
  return null;
}

/** The action as answer lines, e.g. "📨 To: Barbecue crew". */
export function actionAnswer(mission: Mission, action: PipoAction): string {
  const tool = mission.tools?.find((t) => t.name === action.tool);
  if (!tool) return "";
  return tool.lines.map((line) => `${line.emoji} ${fill(line.text, action.args)}`).join("\n");
}

/** Replaces "{field}" with the argument, written the way a person would read it. */
export function fill(template: string, args: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => readable(args[key]));
}

export function readable(value: unknown): string {
  if (value === undefined || value === null) return "?";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) return value.map(readable).join(", ");
  if (typeof value === "object") {
    const { name, price } = value as { name?: unknown; price?: unknown };
    if (name !== undefined) return price !== undefined ? `${readable(name)} ($${readable(price)})` : readable(name);
  }
  return String(value);
}
