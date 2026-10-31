// Spanish lessons are full twins of the English ones: same ids, structure, scoring rules and
// tools, only the words differ. These tests keep the two in step so a translation can't break
// a lesson (a missing piece, a flaw pointing nowhere, a tool with different fields).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadMissions } from "../src/engine/missionLoader.ts";
import type { Mission } from "../src/engine/types.ts";
import { MISSIONS_DIR, readMissionFiles } from "./helpers.ts";

const ES_DIR = join(MISSIONS_DIR, "es");

function readSpanishFiles(): Record<string, unknown> {
  const files: Record<string, unknown> = {};
  for (const name of readdirSync(ES_DIR).filter((n) => n.endsWith(".json"))) {
    files[name] = JSON.parse(readFileSync(join(ES_DIR, name), "utf8"));
  }
  return files;
}

const english = new Map(loadMissions(readMissionFiles()).map((m) => [m.id, m]));
const spanish = loadMissions(readSpanishFiles());

/** "{name} at {when}" → ["name", "when"]: the argument slots a template fills in. */
const fields = (template: string | undefined) => [...(template ?? "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Everything about a lesson except its words. */
function shape(m: Mission) {
  return {
    id: m.id,
    persona: m.persona,
    path: m.path,
    order: m.order,
    icon: m.icon,
    facts: m.facts.length,
    has: { recap: !!m.recap, funFact: !!m.funFact, postcard: !!m.postcard },
    postcard: fields(m.postcard),
    slots: m.slots.map((s) => ({
      id: s.id,
      pick: s.pick,
      required: s.required ?? false,
      pieces: s.pieces.map((p) => ({ id: p.id, quality: p.quality, tip: !!p.tip })),
    })),
    flaws: m.flaws.map((f) => ({ id: f.id, when: f.when, signals: !!f.signals?.length })),
    tools: (m.tools ?? []).map((t) => ({
      name: t.name,
      app: t.app,
      outcome: t.outcome,
      store: !!t.store,
      whenLabel: !!t.whenLabel,
      fields: Object.keys((t.parameters as { properties?: object }).properties ?? {}).sort(),
      required: [...((t.parameters as { required?: string[] }).required ?? [])].sort(),
      lines: t.lines.map((l) => ({ emoji: l.emoji, fields: fields(l.text) })),
    })),
  };
}

describe("Spanish lessons", () => {
  it.each(spanish.map((m) => [m.id, m] as const))("%s is marked Spanish and matches its English twin", (id, es) => {
    expect(es.lang).toBe("es");
    const en = english.get(id);
    expect(en, `no English lesson "${id}"`).toBeDefined();
    expect(shape(es)).toEqual(shape(en!));
  });

  it("every English lesson has a Spanish twin", () => {
    const missing = [...english.keys()].filter((id) => !spanish.some((m) => m.id === id));
    expect(missing).toEqual([]);
  });
});
