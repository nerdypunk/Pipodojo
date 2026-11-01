// "Clue hunt" (a Lab prototype): instead of tapping ready-made pieces, the player reads a long,
// messy message (a chat from Grandma, a customer's email) and taps the parts Pipo needs. Each
// tappable part is a piece of an ordinary lesson, so the prompt, Pipo's live answer and the
// rule-based score all work exactly like the main game. Chatter the player taps counts as a weak
// piece; a clue they miss is a fact left out.
import type { Lang, Mission } from "../engine/types.ts";

export interface ClueSource {
  kind: "chat" | "email";
  from: string;
  subject?: string;
  /** The message in order. Parts with a `piece` can be tapped; the rest is plain text. */
  segments: { text: string; piece?: string }[];
}

export interface ClueHunt {
  mission: Mission;
  source: ClueSource;
  /** The goal and answer-shape pieces, already in the prompt: the hunt is only for the clues. */
  autoPicks: string[];
}

const NOT_ES = "(?<![a-záéíóúñü])";
const END_ES = "(?![a-záéíóúñü])";

const grandmaEn: ClueHunt = {
  autoPicks: ["plan_day", "short"],
  source: {
    kind: "chat",
    from: "Grandma Rosa 👵",
    segments: [
      { text: "Hi sweetie! 💕 Sunday works for me. " },
      { text: "My knees are bad these days, so I can't walk very far.", piece: "knees" },
      { text: " Did you hear? " },
      { text: "The neighbor's cat had four kittens!", piece: "kittens" },
      { text: " 🐱 Also, the forecast says " },
      { text: "it will rain all day Sunday.", piece: "rain" },
      { text: " ☔ " },
      { text: "Let's keep the tickets under $40 for all of us,", piece: "budget" },
      { text: " lunch is my treat. " },
      { text: "The kids are crazy about animals right now!", piece: "animals" },
      { text: " 🐠 I watched " },
      { text: "a lovely show about baking", piece: "baking" },
      { text: " last night. Love you!" },
    ],
  },
  mission: {
    id: "lab-clue-grandma",
    persona: "parent",
    path: "lab",
    order: 1,
    title: "Sunday with Grandma",
    icon: "👵",
    situation: "Grandma Rosa sent a long message about Sunday. Tap the parts I need to pick the right place!",
    facts: [],
    systemPrompt: "You are Pipo, a friendly personal assistant on someone's phone. Help with what they ask.",
    slots: [
      {
        id: "want",
        label: "What Pipo should do",
        pick: "one",
        required: true,
        pieces: [
          { id: "plan_day", label: "Pick a place for Sunday", text: "Pick one place for our family day out with Grandma and the kids this Sunday.", quality: "good" },
          { id: "help_day", label: "Help with Sunday", text: "Help with Sunday.", quality: "weak" },
        ],
      },
      {
        id: "clues",
        label: "Clues",
        pick: "many",
        pieces: [
          { id: "knees", label: "She can't walk far", text: "Grandma can't walk far because of her knees.", quality: "good" },
          { id: "rain", label: "Rain all day", text: "It's going to rain all day on Sunday.", quality: "good" },
          { id: "budget", label: "Under $40 for everyone", text: "Keep the tickets under $40 for all of us.", quality: "good" },
          { id: "animals", label: "The kids love animals", text: "The kids love animals.", quality: "good" },
        ],
      },
      {
        id: "chatter",
        label: "Chatter",
        pick: "many",
        pieces: [
          { id: "kittens", label: "The neighbor's kittens", text: "The neighbor's cat had kittens.", quality: "weak", tip: "The kittens are sweet, but they don't help Pipo pick a place." },
          { id: "baking", label: "A show about baking", text: "Grandma watched a show about baking.", quality: "weak", tip: "A lovely show, but it tells Pipo nothing about Sunday." },
        ],
      },
      {
        id: "shape",
        label: "How Pipo answers",
        pick: "one",
        pieces: [
          { id: "short", label: "One place, in 3 lines", text: "Give me one place and why it fits, in 3 short lines.", quality: "good" },
          { id: "long", label: "Tell me everything", text: "Tell me everything about Sunday.", quality: "weak" },
        ],
      },
    ],
    flaws: [
      {
        id: "no_knees",
        when: "not_picked:knees",
        signals: ["^(?![\\s\\S]*(bench|seat|sit|elevator|lift|wheelchair|stroller|little walking|minimal walking|not much walking|without much walking|short walk|easy walk|rest|accessible|step-free|easy for grandma))"],
        hint: "You didn't tell Pipo that Grandma can't walk far.",
        explain: "Pipo didn't know about Grandma's knees, so the plan does nothing to make it easy for her.",
      },
      {
        id: "no_rain",
        when: "not_picked:rain",
        signals: ["\\b(park|beach|picnic|zoo|garden|trail|lake|outdoors?|outside|farm|safari)\\b"],
        hint: "You didn't tell Pipo it will rain all day.",
        explain: "Pipo didn't know it will rain, so it picked somewhere outdoors.",
      },
      {
        id: "no_budget",
        when: "not_picked:budget",
        signals: ["^(?![\\s\\S]*\\$\\s?\\d)"],
        hint: "You didn't tell Pipo the budget.",
        explain: "Pipo didn't know the budget, so the plan has no prices.",
      },
      {
        id: "no_animals",
        when: "not_picked:animals",
        signals: ["^(?![\\s\\S]*(animal|aquarium|zoo|fish|shark|penguin|dolphin|farm|pet|reptile))"],
        hint: "You didn't tell Pipo the kids love animals.",
        explain: "Pipo didn't know the kids love animals, so the plan misses what they'd enjoy most.",
      },
    ],
    lesson: "When a message is long, pick out the facts Pipo needs and leave the chatter out.",
  },
};

const grandmaEs: ClueHunt = {
  autoPicks: ["plan_day", "short"],
  source: {
    kind: "chat",
    from: "Abuela Rosa 👵",
    segments: [
      { text: "¡Hola, mi amor! 💕 El domingo me queda bien. " },
      { text: "Ando mal de las rodillas, así que no puedo caminar mucho.", piece: "knees" },
      { text: " ¿Ya supiste? " },
      { text: "¡La gata de la vecina tuvo cuatro gatitos!", piece: "kittens" },
      { text: " 🐱 Y el pronóstico dice que " },
      { text: "va a llover todo el domingo.", piece: "rain" },
      { text: " ☔ " },
      { text: "Que los boletos cuesten menos de $40 para todos,", piece: "budget" },
      { text: " la comida la invito yo. " },
      { text: "¡Los niños andan locos por los animales!", piece: "animals" },
      { text: " 🐠 Anoche vi " },
      { text: "un programa precioso de repostería", piece: "baking" },
      { text: ". ¡Los quiero!" },
    ],
  },
  mission: {
    id: "lab-clue-grandma",
    lang: "es",
    persona: "parent",
    path: "lab",
    order: 1,
    title: "Domingo con la abuela",
    icon: "👵",
    situation: "La abuela Rosa mandó un mensaje largo sobre el domingo. ¡Toca lo que necesito para elegir el lugar correcto!",
    facts: [],
    systemPrompt: "Eres Pipo, un asistente personal amigable en el celular de alguien. Ayuda con lo que te pidan.",
    slots: [
      {
        id: "want",
        label: "Lo que Pipo debe hacer",
        pick: "one",
        required: true,
        pieces: [
          { id: "plan_day", label: "Elige un lugar para el domingo", text: "Elige un lugar para nuestro paseo en familia este domingo con la abuela y los niños.", quality: "good" },
          { id: "help_day", label: "Ayuda con el domingo", text: "Ayuda con el domingo.", quality: "weak" },
        ],
      },
      {
        id: "clues",
        label: "Pistas",
        pick: "many",
        pieces: [
          { id: "knees", label: "No puede caminar mucho", text: "La abuela no puede caminar mucho por sus rodillas.", quality: "good" },
          { id: "rain", label: "Lloverá todo el día", text: "Va a llover todo el domingo.", quality: "good" },
          { id: "budget", label: "Menos de $40 para todos", text: "Que los boletos cuesten menos de $40 para todos.", quality: "good" },
          { id: "animals", label: "A los niños les encantan los animales", text: "A los niños les encantan los animales.", quality: "good" },
        ],
      },
      {
        id: "chatter",
        label: "Plática",
        pick: "many",
        pieces: [
          { id: "kittens", label: "Los gatitos de la vecina", text: "La gata de la vecina tuvo gatitos.", quality: "weak", tip: "Los gatitos son tiernos, pero no ayudan a Pipo a elegir un lugar." },
          { id: "baking", label: "Un programa de repostería", text: "La abuela vio un programa de repostería.", quality: "weak", tip: "Qué lindo programa, pero no le dice a Pipo nada sobre el domingo." },
        ],
      },
      {
        id: "shape",
        label: "Cómo responde Pipo",
        pick: "one",
        pieces: [
          { id: "short", label: "Un lugar, en 3 líneas", text: "Dame un lugar y por qué funciona, en 3 líneas cortas.", quality: "good" },
          { id: "long", label: "Dime todo", text: "Dime todo sobre el domingo.", quality: "weak" },
        ],
      },
    ],
    flaws: [
      {
        id: "no_knees",
        when: "not_picked:knees",
        signals: ["^(?![\\s\\S]*(banca|asiento|sentar|elevador|ascensor|silla de ruedas|carrito|poco caminar|camin(o|ar) poco|sin caminar mucho|no caminar mucho|recorrido corto|descans|accesible|sin escaleras|c[oó]modo para (la )?abuela))"],
        hint: "No le dijiste a Pipo que la abuela no puede caminar mucho.",
        explain: "Pipo no sabía lo de las rodillas de la abuela, así que el plan no le hace nada fácil.",
      },
      {
        id: "no_rain",
        when: "not_picked:rain",
        signals: [`${NOT_ES}(parque|playa|picnic|zool[oó]gico|jard[ií]n|sendero|lago|al aire libre|granja|safari)${END_ES}`],
        hint: "No le dijiste a Pipo que va a llover todo el día.",
        explain: "Pipo no sabía que va a llover, así que eligió un lugar al aire libre.",
      },
      {
        id: "no_budget",
        when: "not_picked:budget",
        signals: ["^(?![\\s\\S]*\\$\\s?\\d)"],
        hint: "No le dijiste a Pipo el presupuesto.",
        explain: "Pipo no sabía el presupuesto, así que el plan no tiene precios.",
      },
      {
        id: "no_animals",
        when: "not_picked:animals",
        signals: ["^(?![\\s\\S]*(animal|acuario|zool[oó]gico|pez|peces|tibur|ping[uü]ino|delf[ií]n|granja|mascota|reptil))"],
        hint: "No le dijiste a Pipo que a los niños les encantan los animales.",
        explain: "Pipo no sabía que a los niños les encantan los animales, así que el plan no tiene lo que más disfrutarían.",
      },
    ],
    lesson: "Cuando un mensaje es largo, toma los datos que Pipo necesita y deja fuera la plática.",
  },
};

const cakeEn: ClueHunt = {
  autoPicks: ["order", "lines"],
  source: {
    kind: "email",
    from: "Dana Reyes",
    subject: "Cake for Saturday! 🎂",
    segments: [
      { text: "Hi Bloom team! " },
      { text: "I'd love a cake for my daughter Mia, who's turning 7!", piece: "age" },
      { text: " " },
      { text: "My sister says hi, by the way.", piece: "sister" },
      { text: " Important: " },
      { text: "Mia is allergic to nuts.", piece: "nuts" },
      { text: " " },
      { text: "She's obsessed with chocolate,", piece: "flavor" },
      { text: " so anything chocolate is perfect. " },
      { text: "We'll pick it up Saturday at 3pm.", piece: "pickup" },
      { text: " Oh, and " },
      { text: "we loved your croissants last week!", piece: "croissants" },
      { text: " Thanks so much, Dana" },
    ],
  },
  mission: {
    id: "lab-clue-cake",
    persona: "business",
    path: "lab",
    order: 2,
    title: "The birthday cake order",
    icon: "🎂",
    situation: "A customer emailed a cake order, with lots of extra news. Tap what the kitchen needs to know!",
    facts: [],
    systemPrompt: "You are Pipo, a friendly assistant for the owner of Bloom Café, a small local café. Help with what they ask.",
    slots: [
      {
        id: "want",
        label: "What Pipo should do",
        pick: "one",
        required: true,
        pieces: [
          { id: "order", label: "Write the cake order for the kitchen", text: "Write this cake order as a short note for our kitchen.", quality: "good" },
          { id: "vague", label: "Handle the cake", text: "Handle the cake thing.", quality: "weak" },
        ],
      },
      {
        id: "clues",
        label: "Clues",
        pick: "many",
        pieces: [
          { id: "age", label: "Mia is turning 7", text: "It's for Mia, who is turning 7.", quality: "good" },
          { id: "nuts", label: "She's allergic to nuts", text: "Mia is allergic to nuts.", quality: "good" },
          { id: "flavor", label: "Chocolate cake", text: "She wants chocolate.", quality: "good" },
          { id: "pickup", label: "Pickup Saturday at 3pm", text: "Pickup is Saturday at 3pm.", quality: "good" },
        ],
      },
      {
        id: "chatter",
        label: "Chatter",
        pick: "many",
        pieces: [
          { id: "sister", label: "Her sister says hi", text: "Her sister says hi.", quality: "weak", tip: "Nice, but the kitchen doesn't need it." },
          { id: "croissants", label: "She loved the croissants", text: "She loved our croissants last week.", quality: "weak", tip: "A lovely compliment, but it doesn't change the cake." },
        ],
      },
      {
        id: "shape",
        label: "How Pipo answers",
        pick: "one",
        pieces: [
          { id: "lines", label: "3 or 4 short lines", text: "Keep it to 3 or 4 short lines the kitchen can follow.", quality: "good" },
          { id: "anyhow", label: "Write it however", text: "Write it however you like.", quality: "weak" },
        ],
      },
    ],
    flaws: [
      {
        id: "no_nuts",
        when: "not_picked:nuts",
        signals: ["^(?![\\s\\S]*(nut[- ]?free|no nuts|without nuts|allerg))"],
        hint: "You didn't tell Pipo about Mia's nut allergy.",
        explain: "Pipo didn't know about the nut allergy, so the kitchen note doesn't warn anyone.",
      },
      {
        id: "no_age",
        when: "not_picked:age",
        signals: ["^(?![\\s\\S]*(\\b7\\b|seven))"],
        hint: "You didn't tell Pipo how old Mia is turning.",
        explain: "Pipo didn't know Mia is turning 7, so the cake doesn't say it.",
      },
      {
        id: "no_flavor",
        when: "not_picked:flavor",
        signals: ["^(?![\\s\\S]*chocolate)"],
        hint: "You didn't tell Pipo the flavor.",
        explain: "Pipo didn't know Mia loves chocolate, so it guessed the flavor.",
      },
      {
        id: "no_pickup",
        when: "not_picked:pickup",
        signals: ["^(?![\\s\\S]*\\b3\\s?(pm|p\\.m\\.|:00))"],
        hint: "You didn't tell Pipo when it's picked up.",
        explain: "Pipo didn't know the pickup time, so the kitchen doesn't know when it's due.",
      },
    ],
    lesson: "Customers write a lot. Pass on the facts that matter, especially allergies.",
  },
};

const cakeEs: ClueHunt = {
  autoPicks: ["order", "lines"],
  source: {
    kind: "email",
    from: "Dana Reyes",
    subject: "¡Pastel para el sábado! 🎂",
    segments: [
      { text: "¡Hola, equipo Bloom! " },
      { text: "Quiero un pastel para mi hija Mia, ¡que cumple 7 años!", piece: "age" },
      { text: " " },
      { text: "Por cierto, mi hermana les manda saludos.", piece: "sister" },
      { text: " Importante: " },
      { text: "Mia es alérgica a las nueces.", piece: "nuts" },
      { text: " " },
      { text: "Le fascina el chocolate,", piece: "flavor" },
      { text: " así que cualquier cosa de chocolate es perfecta. " },
      { text: "Lo recogemos el sábado a las 3 p. m.", piece: "pickup" },
      { text: " Ah, y " },
      { text: "¡nos encantaron sus croissants la semana pasada!", piece: "croissants" },
      { text: " Mil gracias, Dana" },
    ],
  },
  mission: {
    id: "lab-clue-cake",
    lang: "es",
    persona: "business",
    path: "lab",
    order: 2,
    title: "El pastel de cumpleaños",
    icon: "🎂",
    situation: "Una clienta mandó un correo con un pedido de pastel y muchas noticias extra. ¡Toca lo que la cocina necesita saber!",
    facts: [],
    systemPrompt: "Eres Pipo, un asistente amigable para la dueña o el dueño de Bloom Café, un café pequeño del barrio. Ayuda con lo que te pidan.",
    slots: [
      {
        id: "want",
        label: "Lo que Pipo debe hacer",
        pick: "one",
        required: true,
        pieces: [
          { id: "order", label: "Escribe el pedido para la cocina", text: "Escribe este pedido de pastel como una nota corta para nuestra cocina.", quality: "good" },
          { id: "vague", label: "Encárgate del pastel", text: "Encárgate de lo del pastel.", quality: "weak" },
        ],
      },
      {
        id: "clues",
        label: "Pistas",
        pick: "many",
        pieces: [
          { id: "age", label: "Mia cumple 7 años", text: "Es para Mia, que cumple 7 años.", quality: "good" },
          { id: "nuts", label: "Es alérgica a las nueces", text: "Mia es alérgica a las nueces.", quality: "good" },
          { id: "flavor", label: "Pastel de chocolate", text: "Lo quiere de chocolate.", quality: "good" },
          { id: "pickup", label: "Lo recogen el sábado a las 3 p. m.", text: "Lo recogen el sábado a las 3 p. m.", quality: "good" },
        ],
      },
      {
        id: "chatter",
        label: "Plática",
        pick: "many",
        pieces: [
          { id: "sister", label: "Su hermana manda saludos", text: "Su hermana manda saludos.", quality: "weak", tip: "Qué lindo, pero la cocina no lo necesita." },
          { id: "croissants", label: "Le encantaron los croissants", text: "Le encantaron nuestros croissants la semana pasada.", quality: "weak", tip: "Un cumplido precioso, pero no cambia el pastel." },
        ],
      },
      {
        id: "shape",
        label: "Cómo responde Pipo",
        pick: "one",
        pieces: [
          { id: "lines", label: "3 o 4 líneas cortas", text: "Que sean 3 o 4 líneas cortas que la cocina pueda seguir.", quality: "good" },
          { id: "anyhow", label: "Escríbelo como quieras", text: "Escríbelo como quieras.", quality: "weak" },
        ],
      },
    ],
    flaws: [
      {
        id: "no_nuts",
        when: "not_picked:nuts",
        signals: ["^(?![\\s\\S]*(sin nuez|sin nueces|libre de nueces|alerg|al[eé]rgica))"],
        hint: "No le dijiste a Pipo que Mia es alérgica a las nueces.",
        explain: "Pipo no sabía de la alergia, así que la nota de la cocina no avisa a nadie.",
      },
      {
        id: "no_age",
        when: "not_picked:age",
        signals: ["^(?![\\s\\S]*((?<![\\d])7(?![\\d])|siete))"],
        hint: "No le dijiste a Pipo cuántos años cumple Mia.",
        explain: "Pipo no sabía que Mia cumple 7, así que el pastel no lo dice.",
      },
      {
        id: "no_flavor",
        when: "not_picked:flavor",
        signals: ["^(?![\\s\\S]*chocolate)"],
        hint: "No le dijiste a Pipo el sabor.",
        explain: "Pipo no sabía que a Mia le encanta el chocolate, así que adivinó el sabor.",
      },
      {
        id: "no_pickup",
        when: "not_picked:pickup",
        signals: ["^(?![\\s\\S]*((?<![\\d])3(?![\\d])\\s?(p\\.?\\s?m\\.?|:00|de la tarde)|15:00))"],
        hint: "No le dijiste a Pipo cuándo lo recogen.",
        explain: "Pipo no sabía la hora, así que la cocina no sabe para cuándo es.",
      },
    ],
    lesson: "Los clientes escriben mucho. Pasa los datos que importan, sobre todo las alergias.",
  },
};

export const CLUE_HUNTS: Record<Lang, readonly ClueHunt[]> = {
  en: [grandmaEn, cakeEn],
  es: [grandmaEs, cakeEs],
};
