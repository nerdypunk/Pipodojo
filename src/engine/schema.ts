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

/** A pretend app action for Pipo (a function the model can call). Nothing real ever happens. */
export const ToolSchema = z.strictObject({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/, "Use lowercase letters, numbers or _"),
  /** Told to the model: when to use this tool. */
  description: text,
  /** Which phone mockup shows the result. */
  app: z.enum(["whatsapp", "shop", "email", "calendar"]),
  /** The store's name on the shop screen, e.g. "TicketHub" (default FreshCart). */
  store: text.optional(),
  /** Label for the shop's "delivery" row, e.g. "Visit" for tickets (default Delivery). */
  whenLabel: text.optional(),
  /** done: Pipo went ahead (sent, paid). waiting: Pipo is holding it for your OK. */
  outcome: z.enum(["done", "waiting"]),
  /** JSON Schema for the arguments, passed to the model as is. */
  parameters: z.record(z.string(), z.unknown()),
  /** The answer lines this action becomes, for scoring and the card. "{field}" fills in an argument. */
  lines: z.array(z.strictObject({ emoji: text, text })).min(1).max(5),
});

export const MissionSchema = z
  .strictObject({
    id,
    persona: PersonaSchema,
    /** The path this lesson belongs to, e.g. "parent-barbecue" (see src/game/paths.ts). */
    path: id,
    order: z.number().int().positive(),
    title: text,
    /** One emoji for the lesson's spot on the path map. */
    icon: text.optional(),
    /** Shown after the lesson: what Pipo got done, e.g. "Pipo planned your barbecue menu." */
    recap: text.optional(),
    /** Shown after the lesson: a plain-words fact about what agents can do, leading into the next lesson. */
    funFact: text.optional(),
    /** This lesson's part of the end-of-path postcard. {answer} is Pipo's answer; {arg} is a tool argument. */
    postcard: text.optional(),
    /** Pipo's opening line, e.g. "Friends are coming Saturday. Tell me what you need!" */
    situation: text,
    /** Things the player knows and Pipo doesn't, shown on the lesson card. */
    facts: z.array(text).max(4).default([]),
    /** Role only. Must not nudge Pipo toward good or bad answers. */
    systemPrompt: text,
    /** Optional pretend apps Pipo can act in. Without tools, Pipo answers in text. */
    tools: z.array(ToolSchema).max(4).optional(),
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
