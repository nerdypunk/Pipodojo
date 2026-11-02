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
    if (tool) {
      return {
        tool: tool.name,
        app: tool.app,
        outcome: tool.outcome,
        args: call.args,
        ...(tool.store ? { store: tool.store } : {}),
        ...(tool.whenLabel ? { whenLabel: tool.whenLabel } : {}),
      };
    }
  }
  return null;
}

/** The action as answer lines, e.g. "📨 To: Barbecue crew". */
export function actionAnswer(mission: Mission, action: PipoAction): string {
  const tool = mission.tools?.find((t) => t.name === action.tool);
  if (!tool) return "";
  return tool.lines.flatMap((line) => lineTexts(action, line.text).map((text) => `${line.emoji} ${text}`)).join("\n");
}

/**
 * The text of one tool line. In the listings app, a line that is only "{items}" becomes one line
 * per saved listing, so a gap can point at the one listing that shows it. Other lines stay one line.
 */
function lineTexts(action: PipoAction, template: string): string[] {
  const field = /^\{(\w+)\}$/.exec(template.trim())?.[1];
  const list = field === undefined ? undefined : action.args[field];
  if (action.app === "listings" && Array.isArray(list) && list.length) return list.map(readable);
  return [fill(template, action.args)];
}

/** How many answer lines the listings app's saved listings became (its first tool line). */
export function listingLineCount(action: PipoAction): number {
  const items = action.args.items;
  return Array.isArray(items) && items.length ? items.length : 1;
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
    const { name, price, label, ...rest } = value as {
      name?: unknown;
      price?: unknown;
      label?: unknown;
      when?: unknown;
      value?: unknown;
      cost?: unknown;
      note?: unknown;
      condition?: unknown;
      rating?: unknown;
      distance?: unknown;
    };
    // Form fields: "Work laptop: $1,200".
    if (label !== undefined && name === undefined) return rest.value === undefined ? readable(label) : `${readable(label)}: ${readable(rest.value)}`;
    if (name !== undefined) {
      // Marketplace listings: "Green desk chair ($35) · good · ★ 4.9 · 2 mi".
      const listing = [rest.condition, rest.rating === undefined || rest.rating === null ? undefined : `★ ${stars(rest.rating)}`, rest.distance]
        .filter((part) => part !== undefined && part !== null && part !== "")
        .map(readable);
      if (price !== undefined) return [`${readable(name)} ($${readable(price)})`, ...listing].join(" · ");
      // Events, chart bars, game shop items and diagram steps: "Bake sale (Thu 3pm)", "Apples (8)".
      const detail = rest.when ?? rest.value ?? rest.cost ?? rest.note;
      if (detail !== undefined) return `${readable(name)} (${readable(detail)})`;
      return readable(name);
    }
  }
  return String(value);
}

/** A star rating the way a person reads it: 4.9, 5 or 4.5 (not 4.90). */
export function stars(value: unknown): string {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\s*\d+(\.\d+)?\s*$/.test(value) ? Number(value) : NaN;
  return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : readable(value);
}
