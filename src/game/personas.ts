// The people Pipo helps. Each lives somewhere in Pipodojo Town and has three paths
// (see paths.ts). Every persona can be visited; paths without lessons show "Coming soon".
import type { Persona } from "../engine/types.ts";

export interface PersonaCard {
  id: Persona;
  name: string;
  emoji: string;
  /** Where they live in town, e.g. "Home". */
  place: string;
  blurb: string;
  /** Background tint for the card's art, from the purple-blue family. */
  tint: string;
}

export const PERSONAS: readonly PersonaCard[] = [
  {
    id: "parent",
    name: "Busy parent",
    emoji: "🏡",
    place: "Home",
    blurb: "Barbecues, school weeks and family trips.",
    tint: "from-brand-400 to-brand-700",
  },
  {
    id: "student",
    name: "Student",
    emoji: "🎓",
    place: "College",
    blurb: "Exams, group projects and a first job.",
    tint: "from-sky-400 to-brand-600",
  },
  {
    id: "business",
    name: "Café owner",
    emoji: "☕",
    place: "Café",
    blurb: "Sales, customers and the staff rota.",
    tint: "from-fuchsia-400 to-brand-700",
  },
];

export const personaById = (id: Persona) => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0]!;
