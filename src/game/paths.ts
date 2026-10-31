// Each persona has three paths of three lessons. A path is playable once its lessons exist in
// /missions (matched by the lesson's "path" id); the rest show their lesson names as coming soon.
import type { Persona } from "../engine/types.ts";

export interface PathCard {
  id: string;
  persona: Persona;
  name: string;
  emoji: string;
  blurb: string;
  /** Lesson names, shown on the card (and as "coming soon" until the lessons are built). */
  lessons: readonly string[];
  /** Card art tint, from the purple-blue family. */
  tint: string;
}

export const PATHS: readonly PathCard[] = [
  // Busy parent
  {
    id: "parent-barbecue",
    persona: "parent",
    name: "Saturday barbecue",
    emoji: "🍔",
    blurb: "Friends are coming over. Pipo plans the food, sends the invites and does the shopping.",
    lessons: ["Plan the menu", "Invite your friends", "Order the groceries"],
    tint: "from-brand-400 to-brand-700",
  },
  {
    id: "parent-school",
    persona: "parent",
    name: "School week",
    emoji: "🎒",
    blurb: "A busy week at school. Pipo plans lunches, answers the teacher and fills the calendar.",
    lessons: ["Plan the week's lunches", "Reply about the field trip", "Add school events to the calendar"],
    tint: "from-sky-400 to-brand-600",
  },
  {
    id: "parent-daytrip",
    persona: "parent",
    name: "Family day trip",
    emoji: "🚗",
    blurb: "A rainy Sunday. Pipo picks a spot, books the tickets and tells Grandma the plan.",
    lessons: ["Pick a spot for Sunday", "Book the tickets", "Tell Grandma the plan"],
    tint: "from-amber-300 to-brand-600",
  },
  // Student
  {
    id: "student-exams",
    persona: "student",
    name: "Exam week",
    emoji: "📚",
    blurb: "Exams are close. Pipo makes a study plan, books study time and quizzes you.",
    lessons: ["Make a study plan", "Book study sessions", "Quiz me"],
    tint: "from-sky-400 to-brand-600",
  },
  {
    id: "student-project",
    persona: "student",
    name: "Group project",
    emoji: "🧩",
    blurb: "Four people, one project. Pipo splits the work, messages the group and emails the professor.",
    lessons: ["Split the tasks", "Message the group", "Email the professor"],
    tint: "from-brand-400 to-fuchsia-500",
  },
  {
    id: "student-job",
    persona: "student",
    name: "First job",
    emoji: "💼",
    blurb: "Time to earn a little. Pipo polishes your CV, emails Bloom Café and helps you practise.",
    lessons: ["Polish your CV", "Email about the job", "Practise the interview"],
    tint: "from-emerald-300 to-brand-600",
  },
  // Café owner
  {
    id: "business-sale",
    persona: "business",
    name: "Weekend sale",
    emoji: "🏷️",
    blurb: "Half-price pastries this weekend. Pipo writes the post, emails regulars and restocks.",
    lessons: ["Write the sale post", "Email your regulars", "Restock the shelves"],
    tint: "from-fuchsia-400 to-brand-700",
  },
  {
    id: "business-review",
    persona: "business",
    name: "Unhappy customer",
    emoji: "💬",
    blurb: "A one-star review. Pipo replies kindly, sorts out a refund and plans a warm welcome back.",
    lessons: ["Reply to the review", "Sort out a refund", "Follow up next week"],
    tint: "from-rose-300 to-brand-600",
  },
  {
    id: "business-staff",
    persona: "business",
    name: "Staff week",
    emoji: "🗓️",
    blurb: "Busy days at the café. Pipo plans shifts, messages the team and fills the calendar.",
    lessons: ["Plan the shifts", "Message the team", "Put shifts on the calendar"],
    tint: "from-sky-300 to-brand-700",
  },
  // Young coder (Pipo Code on the laptop)
  {
    id: "kid-site",
    persona: "kid",
    name: "My first website",
    emoji: "🌐",
    blurb: "A website about Nugget the hamster. Pipo Code plans it, builds it and fixes a bug.",
    lessons: ["Plan your website", "Build the home page", "Fix a bug"],
    tint: "from-amber-300 to-orange-500",
  },
  {
    id: "kid-game",
    persona: "kid",
    name: "Make a game",
    emoji: "🎮",
    blurb: "Candy Climb, an obstacle course in BlockStudio. Design it, build a level, add a shop.",
    lessons: ["Design your game", "Build the first level", "Add a shop"],
    tint: "from-fuchsia-400 to-violet-600",
  },
  {
    id: "kid-homework",
    persona: "kid",
    name: "Homework helper",
    emoji: "📊",
    blurb: "Pipo Code helps you learn, then makes a chart and a diagram for your homework.",
    lessons: ["Learn, don't copy", "Make a chart", "Draw a diagram"],
    tint: "from-emerald-300 to-sky-500",
  },
];

export const pathsOf = (persona: Persona) => PATHS.filter((p) => p.persona === persona);
export const pathById = (id: string) => PATHS.find((p) => p.id === id);
