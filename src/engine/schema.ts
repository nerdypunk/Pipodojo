// Zod schemas for mission files. Every file in /missions must pass MissionSchema.
import { z } from "zod";

// Tool ids are sent to the model as function names, so keep them simple.
const id = z.string().regex(/^[a-z0-9_-]{1,64}$/, "Use lowercase letters, numbers, - or _");
const text = z.string().trim().min(1);

/** A flaw's `when` condition: the player left a tool off, or picked / skipped a brief option. */
export const FLAW_CONDITION = /^(tool_missing|picked|not_picked):([a-z0-9_-]+)$/;

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

/** One tappable piece of the prompt: `label` is the button, `text` is the words it adds. */
export const BriefOptionSchema = z.strictObject({
  id,
  label: text,
  text,
  quality: z.enum(["good", "neutral", "poor"]),
  /** For poor options: why it weakens a prompt, shown on the result screen. */
  tip: text.optional(),
});

/** A group of options, e.g. Goal (pick one), Rules (pick any), Tone (pick one). */
export const BriefSlotSchema = z.strictObject({
  id,
  label: text,
  pick: z.enum(["one", "many"]),
  /** Needs a good option picked for the 2nd star. */
  required: z.boolean().optional(),
  options: z.array(BriefOptionSchema).min(2).max(4),
});

export const FlawSchema = z.strictObject({
  id,
  when: z.string().regex(FLAW_CONDITION, 'Use "tool_missing:<tool id>", "picked:<option id>" or "not_picked:<option id>"'),
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
    brief: z.array(BriefSlotSchema).min(2).max(4),
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

    const options = m.brief.flatMap((s) => s.options);
    for (const [name, ids] of [
      ["tool", m.tools.map((t) => t.id)],
      ["brief slot", m.brief.map((s) => s.id)],
      ["brief option", options.map((o) => o.id)],
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

    const goalSlot = m.brief.find((s) => s.required);
    if (!goalSlot) issue("Needs a required brief slot (the goal)", ["brief"]);
    else {
      const q = goalSlot.options.map((o) => o.quality);
      if (!q.includes("good") || !q.includes("poor")) {
        issue("The required slot needs at least one good and one poor option", ["brief"]);
      }
    }
    if (!m.brief.some((s) => !s.required && s.options.some((o) => o.quality === "poor"))) {
      issue("Needs a tempting poor option outside the required slot", ["brief"]);
    }
    if (!m.gate.fixes.some((f) => f.correct)) issue("Needs at least one correct fix", ["gate", "fixes"]);

    m.gate.flaws.forEach((flaw, i) => {
      const match = FLAW_CONDITION.exec(flaw.when);
      if (!match) return;
      const [, kind, ref] = match;
      if ((kind === "picked" || kind === "not_picked") && !options.some((o) => o.id === ref)) {
        issue(`Unknown brief option "${ref}"`, ["gate", "flaws", i, "when"]);
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
