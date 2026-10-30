// Zod schemas for mission files. Every file in /missions must pass MissionSchema.
import { z } from "zod";

// Tool ids are sent to the model as function names, so keep them simple.
const id = z.string().regex(/^[a-z0-9_-]{1,64}$/, "Use lowercase letters, numbers, - or _");
const text = z.string().trim().min(1);

/** A flaw's `when` condition: the player left a tool off, or picked a goal. */
export const FLAW_CONDITION = /^(tool_missing|goal):([a-z0-9_-]+)$/;

const regexSource = z.string().min(1).refine((source) => {
  try {
    new RegExp(source, "i");
    return true;
  } catch {
    return false;
  }
}, "Not a valid regular expression");

export const PersonaSchema = z.enum(["business", "student", "parent"]);
export const ToolRoleSchema = z.enum(["required", "optional", "gated", "trap"]);

export const ToolSchema = z.strictObject({
  id,
  label: text,
  description: text,
  modelDescription: text.optional(),
  /** Past-tense line for the trace, e.g. "Checked the order". */
  traceLabel: text.optional(),
  role: ToolRoleSchema,
  parameters: z.record(z.string(), z.unknown()).optional(),
  result: z.unknown().optional(),
});

export const GoalSchema = z.strictObject({
  id,
  label: text,
  quality: z.enum(["good", "poor"]),
});

export const FlawSchema = z.strictObject({
  id,
  when: z.string().regex(FLAW_CONDITION, 'Use "tool_missing:<tool id>" or "goal:<goal id>"'),
  signals: z.array(regexSource).min(1).optional(),
  explain: text,
});

export const FixSchema = z.strictObject({
  id,
  label: text,
  correct: z.boolean(),
  result: text,
});

export const MissionSchema = z
  .strictObject({
    id,
    persona: PersonaSchema,
    order: z.number().int().positive(),
    title: text,
    scenario: text,
    context: z.record(z.string(), z.unknown()),
    systemPrompt: text,
    tools: z.array(ToolSchema).min(1),
    goals: z.array(GoalSchema).min(2).max(3),
    gate: z.strictObject({
      beforeTool: id,
      flaws: z.array(FlawSchema).min(1),
      fixes: z.array(FixSchema).min(2).max(3),
    }),
    lesson: text,
  })
  .superRefine((m, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: "custom", message, path });

    for (const [name, ids] of [
      ["tool", m.tools.map((t) => t.id)],
      ["goal", m.goals.map((g) => g.id)],
      ["flaw", m.gate.flaws.map((f) => f.id)],
      ["fix", m.gate.fixes.map((f) => f.id)],
    ] as const) {
      const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
      if (dupes.length) issue(`Duplicate ${name} id: ${dupes.join(", ")}`, []);
    }

    const roles = m.tools.map((t) => t.role);
    if (!roles.includes("required")) issue("Needs at least one required tool", ["tools"]);
    if (!roles.includes("trap")) issue("Needs at least one trap tool", ["tools"]);
    const gated = m.tools.filter((t) => t.role === "gated");
    if (gated.length !== 1) issue("Needs exactly one gated tool", ["tools"]);
    if (gated[0] && gated[0].id !== m.gate.beforeTool) {
      issue(`gate.beforeTool must be the gated tool "${gated[0].id}"`, ["gate", "beforeTool"]);
    }

    const qualities = m.goals.map((g) => g.quality);
    if (!qualities.includes("good") || !qualities.includes("poor")) {
      issue("Needs at least one good and one poor goal", ["goals"]);
    }
    if (!m.gate.fixes.some((f) => f.correct)) issue("Needs at least one correct fix", ["gate", "fixes"]);

    m.gate.flaws.forEach((flaw, i) => {
      const match = FLAW_CONDITION.exec(flaw.when);
      if (!match) return;
      const [, kind, ref] = match;
      if (kind === "goal" && !m.goals.some((g) => g.id === ref)) {
        issue(`Unknown goal "${ref}"`, ["gate", "flaws", i, "when"]);
      }
      if (kind === "tool_missing") {
        const tool = m.tools.find((t) => t.id === ref);
        if (!tool) issue(`Unknown tool "${ref}"`, ["gate", "flaws", i, "when"]);
        else if (tool.role === "gated") {
          issue("The gated tool is always equipped, so it can't be missing", ["gate", "flaws", i, "when"]);
        }
      }
    });
  });
