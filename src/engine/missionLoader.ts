import { MissionSchema } from "./schema.ts";
import type { Mission, Persona } from "./types.ts";

const PERSONA_ORDER: Persona[] = ["business", "student", "parent"];

/** Validates one mission. Throws an Error that names the file and every problem. */
export function parseMission(data: unknown, source = "mission"): Mission {
  const parsed = MissionSchema.safeParse(data);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`${source} is not a valid mission:\n${problems}`);
  }
  return parsed.data;
}

/**
 * Validates a set of mission files keyed by path (e.g. from import.meta.glob or fs).
 * File names must match the mission id. Returns missions sorted by persona, path, then order.
 */
export function loadMissions(files: Record<string, unknown>): Mission[] {
  const missions = Object.entries(files).map(([path, data]) => {
    const mission = parseMission(data, path);
    const fileId = path.split(/[\\/]/).pop()?.replace(/\.json$/, "");
    if (fileId !== mission.id) throw new Error(`${path}: file name must match id "${mission.id}"`);
    return mission;
  });

  const seen = new Set<string>();
  for (const m of missions) {
    const key = `${m.path}:${m.order}`;
    if (seen.has(key)) throw new Error(`Two ${m.path} missions have order ${m.order}`);
    seen.add(key);
  }

  return missions.sort(
    (a, b) =>
      PERSONA_ORDER.indexOf(a.persona) - PERSONA_ORDER.indexOf(b.persona) || a.path.localeCompare(b.path) || a.order - b.order,
  );
}
