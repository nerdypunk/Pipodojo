// The people Pipo helps. Each lives somewhere in Pipodojo Town and has three paths
// (see paths.ts). Every persona can be visited; paths without lessons show "Coming soon".
import type { Lang, Persona } from "../engine/types.ts";

interface PersonaText {
  name: string;
  /** Where they live in town, e.g. "Home". */
  place: string;
  blurb: string;
}

export interface PersonaCard extends PersonaText {
  id: Persona;
  emoji: string;
  /** Background tint for the card's art, from the purple-blue family. */
  tint: string;
}

/** English text inline; `es` holds the Spanish, `ja` the Japanese. */
const DATA: readonly (PersonaCard & { es: PersonaText; ja: PersonaText })[] = [
  {
    id: "parent",
    name: "Busy parent",
    emoji: "🏡",
    place: "Home",
    blurb: "Barbecues, school weeks and family trips.",
    tint: "from-brand-400 to-brand-700",
    es: { name: "Familia ocupada", place: "Casa", blurb: "Parrilladas, semanas de escuela y paseos en familia." },
    ja: { name: "忙しい親", place: "おうち", blurb: "バーベキュー、学校の一週間、家族のお出かけ。" },
  },
  {
    id: "student",
    name: "Student",
    emoji: "🎓",
    place: "College",
    blurb: "Exams, group projects and a first job.",
    tint: "from-sky-400 to-brand-600",
    es: { name: "Estudiante", place: "Universidad", blurb: "Exámenes, proyectos en equipo y un primer trabajo." },
    ja: { name: "学生", place: "大学", blurb: "試験、グループ課題、はじめてのバイト。" },
  },
  {
    id: "business",
    name: "Café owner",
    emoji: "☕",
    place: "Café",
    blurb: "Sales, customers and the staff schedule.",
    tint: "from-fuchsia-400 to-brand-700",
    es: { name: "Dueño del café", place: "Café", blurb: "Ofertas, clientes y los turnos del equipo." },
    ja: { name: "カフェのオーナー", place: "カフェ", blurb: "セール、お客さん、スタッフのシフト。" },
  },
  {
    id: "kid",
    name: "Young coder",
    emoji: "🧒",
    place: "Treehouse home",
    blurb: "Websites, games and homework, with Pipo Code on the laptop.",
    tint: "from-emerald-300 to-brand-600",
    es: { name: "Joven programador", place: "Casa del árbol", blurb: "Páginas web, juegos y tareas, con Pipo Code en la laptop." },
    ja: { name: "小さなプログラマー", place: "ツリーハウス", blurb: "ノートパソコンのPipo Codeで、ウェブサイト、ゲーム、宿題。" },
  },
  {
    id: "executive",
    name: "Busy executive",
    emoji: "💼",
    place: "Office tower",
    blurb: "Flight refunds, marketplace finds and tax paperwork.",
    tint: "from-slate-400 to-brand-700",
    es: { name: "Ejecutivo ocupado", place: "Torre de oficinas", blurb: "Reembolsos de vuelos, compras en marketplace y papeleo de impuestos." },
    ja: { name: "忙しいビジネスパーソン", place: "オフィスタワー", blurb: "フライトの返金、マーケットプレイス、税金の書類。" },
  },
];

const inLang = (card: (typeof DATA)[number], lang: Lang): PersonaCard => {
  const { es, ja, ...base } = card;
  return lang === "en" ? base : { ...base, ...{ es, ja }[lang] };
};

/** The personas, with their words in a language. */
export const personasIn = (lang: Lang): PersonaCard[] => DATA.map((card) => inLang(card, lang));

/** English personas (ids, emoji and tints are the same in every language). */
export const PERSONAS: readonly PersonaCard[] = personasIn("en");

export const personaById = (id: Persona, lang: Lang = "en") => inLang(DATA.find((p) => p.id === id) ?? DATA[0]!, lang);
