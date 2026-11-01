// Each persona has three paths of three lessons. A path is playable once its lessons exist in
// /missions (matched by the lesson's "path" id); the rest show their lesson names as coming soon.
import type { Lang, Persona } from "../engine/types.ts";

interface PathText {
  name: string;
  /** The shareable one-liner for the end-of-path card, e.g. "My AI agent just handled a whole school week". */
  brag: string;
  blurb: string;
  /** Lesson names, shown on the card (and as "coming soon" until the lessons are built). */
  lessons: readonly string[];
}

/** How the path's lessons are played: build the message from pieces, or pick one of two finished messages. */
export type PathMode = "build" | "pick";

export interface PathCard extends PathText {
  id: string;
  persona: Persona;
  /** Each place's second path is played as Pick a prompt; the rest are Build a prompt. */
  mode: PathMode;
  emoji: string;
  /** Card art tint, from the purple-blue family. */
  tint: string;
}

/** English text inline; `es` holds the Spanish. */
const DATA: readonly (PathCard & { es: PathText })[] = [
  // Busy parent
  {
    id: "parent-barbecue",
    mode: "build",
    brag: "My AI agent just planned, invited and shopped for a whole barbecue 🍔",
    persona: "parent",
    name: "Saturday barbecue",
    emoji: "🍔",
    blurb: "Friends are coming over. Pipo plans the food, sends the invites and does the shopping.",
    lessons: ["Plan the menu", "Invite your friends", "Order the groceries"],
    tint: "from-brand-400 to-brand-700",
    es: { name: "Parrillada del sábado", brag: "Mi agente de IA planeó, invitó y compró todo para una parrillada 🍔", blurb: "Vienen amigos. Pipo planea la comida, envía las invitaciones y hace las compras.", lessons: ["Planea el menú","Invita a tus amigos","Pide el súper"] },
  },
  {
    id: "parent-school",
    mode: "pick",
    brag: "My AI agent just handled a whole school week 🎒",
    persona: "parent",
    name: "School week",
    emoji: "🎒",
    blurb: "A busy week at school. Pipo plans lunches, answers the teacher and fills the calendar.",
    lessons: ["Plan the week's lunches", "Reply about the field trip", "Add school events to the calendar"],
    tint: "from-sky-400 to-brand-600",
    es: { name: "Semana de escuela", brag: "Mi agente de IA se encargó de toda una semana de escuela 🎒", blurb: "Una semana ocupada en la escuela. Pipo planea los almuerzos, le responde a la maestra y llena el calendario.", lessons: ["Planea los almuerzos de la semana","Responde sobre la excursión","Agrega los eventos de la escuela al calendario"] },
  },
  {
    id: "parent-daytrip",
    mode: "build",
    brag: "My AI agent planned our rainy Sunday out 🚗",
    persona: "parent",
    name: "Family day trip",
    emoji: "🚗",
    blurb: "A rainy Sunday. Pipo picks a spot, books the tickets and tells Grandma the plan.",
    lessons: ["Pick a spot for Sunday", "Book the tickets", "Tell Grandma the plan"],
    tint: "from-amber-300 to-brand-600",
    es: { name: "Paseo en familia", brag: "Mi agente de IA planeó nuestro domingo lluvioso 🚗", blurb: "Un domingo lluvioso. Pipo elige un lugar, compra los boletos y le cuenta el plan a la abuela.", lessons: ["Elige un lugar para el domingo","Compra los boletos","Cuéntale el plan a la abuela"] },
  },
  // Student
  {
    id: "student-exams",
    mode: "build",
    brag: "My AI agent got me ready for exam week 📚",
    persona: "student",
    name: "Exam week",
    emoji: "📚",
    blurb: "Exams are close. Pipo makes a study plan, books study time and quizzes you.",
    lessons: ["Make a study plan", "Book study sessions", "Quiz me"],
    tint: "from-sky-400 to-brand-600",
    es: { name: "Semana de exámenes", brag: "Mi agente de IA me preparó para la semana de exámenes 📚", blurb: "Se acercan los exámenes. Pipo arma un plan de estudio, aparta tiempo para estudiar y te hace preguntas.", lessons: ["Arma un plan de estudio","Aparta sesiones de estudio","Hazme preguntas"] },
  },
  {
    id: "student-project",
    mode: "pick",
    brag: "My AI agent organized our whole group project 🧩",
    persona: "student",
    name: "Group project",
    emoji: "🧩",
    blurb: "Four people, one project. Pipo splits the work, messages the group and emails the professor.",
    lessons: ["Split the tasks", "Message the group", "Email the professor"],
    tint: "from-brand-400 to-fuchsia-500",
    es: { name: "Proyecto en equipo", brag: "Mi agente de IA organizó todo nuestro proyecto en equipo 🧩", blurb: "Cuatro personas, un proyecto. Pipo reparte el trabajo, le escribe al grupo y le manda un correo al profesor.", lessons: ["Reparte las tareas","Escríbele al grupo","Mándale un correo al profesor"] },
  },
  {
    id: "student-job",
    mode: "build",
    brag: "My AI agent helped me apply for my first job 💼",
    persona: "student",
    name: "First job",
    emoji: "💼",
    blurb: "Time to earn a little. Pipo polishes your résumé, emails Bloom Café and helps you practice.",
    lessons: ["Polish your résumé", "Email about the job", "Practice the interview"],
    tint: "from-emerald-300 to-brand-600",
    es: { name: "Primer trabajo", brag: "Mi agente de IA me ayudó a buscar mi primer trabajo 💼", blurb: "Hora de ganar un poco. Pipo mejora tu CV, le escribe a Bloom Café y te ayuda a practicar.", lessons: ["Mejora tu CV","Escribe por el trabajo","Practica la entrevista"] },
  },
  // Café owner
  {
    id: "business-sale",
    mode: "build",
    brag: "My AI agent just ran my café's weekend sale 🥐",
    persona: "business",
    name: "Weekend sale",
    emoji: "🏷️",
    blurb: "Half-price pastries this weekend. Pipo writes the post, emails regulars and restocks.",
    lessons: ["Write the sale post", "Email your regulars", "Restock the shelves"],
    tint: "from-fuchsia-400 to-brand-700",
    es: { name: "Oferta del fin de semana", brag: "Mi agente de IA manejó la oferta del fin de semana de mi café 🥐", blurb: "Pan dulce a mitad de precio este fin de semana. Pipo escribe la publicación, les escribe a tus clientes frecuentes y resurte.", lessons: ["Escribe la publicación de la oferta","Escríbeles a tus clientes frecuentes","Resurte los estantes"] },
  },
  {
    id: "business-review",
    mode: "pick",
    brag: "My AI agent turned a one-star review into a happy customer ☕",
    persona: "business",
    name: "Unhappy customer",
    emoji: "💬",
    blurb: "A one-star review. Pipo replies kindly, handles a refund and plans a warm welcome back.",
    lessons: ["Reply to the review", "Handle a refund", "Follow up next week"],
    tint: "from-rose-300 to-brand-600",
    es: { name: "Cliente molesto", brag: "Mi agente de IA convirtió una reseña de una estrella en un cliente feliz ☕", blurb: "Una reseña de una estrella. Pipo responde con amabilidad, resuelve un reembolso y prepara una cálida bienvenida de vuelta.", lessons: ["Responde la reseña","Resuelve un reembolso","Da seguimiento la próxima semana"] },
  },
  {
    id: "business-staff",
    mode: "build",
    brag: "My AI agent sorted my café's staff week 🗓️",
    persona: "business",
    name: "Staff week",
    emoji: "🗓️",
    blurb: "Busy days at the café. Pipo plans shifts, messages the team and fills the calendar.",
    lessons: ["Plan the shifts", "Message the team", "Put shifts on the calendar"],
    tint: "from-sky-300 to-brand-700",
    es: { name: "Semana del equipo", brag: "Mi agente de IA organizó la semana del equipo de mi café 🗓️", blurb: "Días ocupados en el café. Pipo planea los turnos, le escribe al equipo y llena el calendario.", lessons: ["Planea los turnos","Escríbele al equipo","Pon los turnos en el calendario"] },
  },
  // Young coder (Pipo Code on the laptop)
  {
    id: "kid-site",
    mode: "build",
    brag: "I built my first website with an AI coding agent 🌐",
    persona: "kid",
    name: "My first website",
    emoji: "🌐",
    blurb: "A website about Nugget the hamster. Pipo Code plans it, builds it and fixes a bug.",
    lessons: ["Plan your website", "Build the home page", "Fix a bug"],
    tint: "from-amber-300 to-orange-500",
    es: { name: "Mi primera página web", brag: "Hice mi primera página web con un agente de IA que programa 🌐", blurb: "Una página sobre Nugget el hámster. Pipo Code la planea, la construye y arregla un error.", lessons: ["Planea tu página","Construye la página de inicio","Arregla un error"] },
  },
  {
    id: "kid-game",
    mode: "pick",
    brag: "I made my own game with an AI coding agent 🎮",
    persona: "kid",
    name: "Make a game",
    emoji: "🎮",
    blurb: "Candy Climb, an obstacle course in BlockStudio. Design it, build a level, add a shop.",
    lessons: ["Design your game", "Build the first level", "Add a shop"],
    tint: "from-fuchsia-400 to-violet-600",
    es: { name: "Haz un juego", brag: "Hice mi propio juego con un agente de IA que programa 🎮", blurb: "Candy Climb, una carrera de obstáculos en BlockStudio. Diséñalo, construye un nivel y agrega una tienda.", lessons: ["Diseña tu juego","Construye el primer nivel","Agrega una tienda"] },
  },
  {
    id: "kid-homework",
    mode: "build",
    brag: "My AI coding agent helped me learn, not copy 📊",
    persona: "kid",
    name: "Homework helper",
    emoji: "📊",
    blurb: "Pipo Code helps you learn, then makes a chart and a diagram for your homework.",
    lessons: ["Learn, don't copy", "Make a chart", "Draw a diagram"],
    tint: "from-emerald-300 to-sky-500",
    es: { name: "Ayuda con la tarea", brag: "Mi agente de IA me ayudó a aprender, no a copiar 📊", blurb: "Pipo Code te ayuda a aprender y luego hace una gráfica y un diagrama para tu tarea.", lessons: ["Aprende, no copies","Haz una gráfica","Dibuja un diagrama"] },
  },
];

const inLang = (card: (typeof DATA)[number], lang: Lang): PathCard => {
  const { es, ...base } = card;
  return lang === "es" ? { ...base, ...es } : base;
};

/** All paths in English. */
export const PATHS: readonly PathCard[] = DATA.map((card) => inLang(card, "en"));

export const pathsOf = (persona: Persona, lang: Lang = "en") => DATA.filter((p) => p.persona === persona).map((p) => inLang(p, lang));
export const pathById = (id: string, lang: Lang = "en") => {
  const card = DATA.find((p) => p.id === id);
  return card && inLang(card, lang);
};
