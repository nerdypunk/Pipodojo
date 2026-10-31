// The paths a player can pick before a lesson. Only paths marked available can be played;
// the rest are placeholders that show "Coming soon".
import type { Persona } from "../engine/types.ts";

export interface PersonaCard {
  id: Persona;
  name: string;
  emoji: string;
  blurb: string;
  /** Background tint for the card's art, from the purple-blue family. */
  tint: string;
  available: boolean;
}

export const PERSONAS: readonly PersonaCard[] = [
  {
    id: "parent",
    name: "Busy parent",
    emoji: "🏡",
    blurb: "Plan dinners, rainy weekends and notes to school.",
    tint: "from-brand-400 to-brand-700",
    available: true,
  },
  {
    id: "student",
    name: "Student",
    emoji: "🎒",
    blurb: "Study plans, article summaries and emails to teachers.",
    tint: "from-sky-400 to-brand-600",
    available: false,
  },
  {
    id: "business",
    name: "Small business",
    emoji: "🛍️",
    blurb: "Reply to customers, plan a sale post and staff shifts.",
    tint: "from-fuchsia-400 to-brand-700",
    available: false,
  },
];
