// Zod schemas for lesson files. Every file in /missions must pass MissionSchema.
import { z } from "zod";

const id = z.string().regex(/^[a-z0-9_-]{1,64}$/, "Use lowercase letters, numbers, - or _");
const text = z.string().trim().min(1);

/** A flaw's `when` condition: the player picked, or left out, a prompt piece. */
export const FLAW_CONDITION = /^(picked|not_picked):([a-z0-9_-]+)$/;

const regexSource = z.string().min(1).refine((source) => {
  try {
    new RegExp(source, "i");
    return true;
  } catch {
    return false;
  }
}, "Not a valid regular expression");

export const PersonaSchema = z.enum(["business", "student", "parent"]);

/** One tappable prompt piece: `label` is the tile, `text` is the words it adds to the prompt. */
export const PieceSchema = z.strictObject({
  id,
  label: text,
  text,
  quality: z.enum(["good", "neutral", "weak"]),
  /** For weak pieces: why it weakens the prompt, shown after Check. */
  tip: text.optional(),
});

/** A row of pieces, e.g. "What do you want?" (pick one) or "What Pipo needs to know" (pick any). */
export const SlotSchema = z.strictObject({
  id,
  label: text,
  pick: z.enum(["one", "many"]),
  /** Needs a good piece for 3 stars. */
  required: z.boolean().optional(),
  pieces: z.array(PieceSchema).min(2).max(4),
});

export const FlawSchema = z.strictObject({
  id,
  when: z.string().regex(FLAW_CONDITION, 'Use "picked:<piece id>" or "not_picked:<piece id>"'),
  /** Regexes on Pipo's answer. The flaw is visible only if one matches. */
  signals: z.array(regexSource).min(1).optional(),
  /** Shown when the condition holds: what the prompt was missing. */
  hint: text,
  /** Shown when the flaw is visible in Pipo's answer. */
  explain: text,
});

export const MissionSchema = z
  .strictObject({
    id,
    persona: PersonaSchema,
    order: z.number().int().positive(),
    title: text,
    /** Pipo's opening line, e.g. "Friends are coming Saturday. Tell me what you need!" */
    situation: text,
    /** Things the player knows and Pipo doesn't, shown on the lesson card. */
    facts: z.array(text).max(4).default([]),
    /** Role only. Must not nudge Pipo toward good or bad answers. */
    systemPrompt: text,
    slots: z.array(SlotSchema).min(2).max(4),
    flaws: z.array(FlawSchema).min(1),
    lesson: text,
  })
  .superRefine((m, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: "custom", message, path });

    const pieces = m.slots.flatMap((s) => s.pieces);
    for (const [name, ids] of [
      ["slot", m.slots.map((s) => s.id)],
      ["piece", pieces.map((p) => p.id)],
      ["flaw", m.flaws.map((f) => f.id)],
    ] as const) {
      const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
      if (dupes.length) issue(`Duplicate ${name} id: ${dupes.join(", ")}`, []);
    }

    const goal = m.slots.find((s) => s.required);
    if (!goal) issue("Needs a required slot (what you want)", ["slots"]);
    else {
      const q = goal.pieces.map((p) => p.quality);
      if (!q.includes("good") || !q.includes("weak")) {
        issue("The required slot needs at least one good and one weak piece", ["slots"]);
      }
    }

    m.flaws.forEach((flaw, i) => {
      const ref = FLAW_CONDITION.exec(flaw.when)?.[2];
      if (ref && !pieces.some((p) => p.id === ref)) issue(`Unknown piece "${ref}"`, ["flaws", i, "when"]);
    });
  });
