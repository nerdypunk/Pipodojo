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
    blurb: "A busy week at school. Pipo answers the teacher, fills the calendar and plans lunches.",
    lessons: ["Reply about the field trip", "Add school events to the calendar", "Plan the week's lunches"],
    tint: "from-sky-400 to-brand-600",
  },
  {
    id: "parent-daytrip",
    persona: "parent",
    name: "Family day trip",
    emoji: "🚗",
    blurb: "A free Sunday. Pipo picks a spot for any weather, books the tickets and packs the bag.",
    lessons: ["Pick a spot for Sunday", "Book the tickets", "Make the packing list"],
    tint: "from-amber-300 to-brand-600",
  },
  // Student
  {
    id: "student-exams",
    persona: "student",
    name: "Exam week",
    emoji: "📚",
    blurb: "Exams are close. Pipo makes a study plan, shrinks your notes and quizzes you.",
    lessons: ["Make a study plan", "Summarise your notes", "Quiz me"],
    tint: "from-sky-400 to-brand-600",
  },
  {
    id: "student-project",
    persona: "student",
    name: "Group project",
    emoji: "🧩",
    blurb: "Four people, one project. Pipo splits the work, messages the group and sets deadlines.",
    lessons: ["Split the tasks", "Message the group", "Put deadlines on the calendar"],
    tint: "from-brand-400 to-fuchsia-500",
  },
  {
    id: "student-job",
    persona: "student",
    name: "First job",
    emoji: "💼",
    blurb: "Time to earn a little. Pipo polishes your CV, emails a café and helps you practise.",
    lessons: ["Polish your CV", "Email about the job", "Practise the interview"],
    tint: "from-emerald-300 to-brand-600",
  },
  // Café owner
  {
    id: "business-sale",
    persona: "business",
    name: "Weekend sale",
    emoji: "🏷️",
    blurb: "Half-price pastries on Saturday. Pipo writes the post, emails regulars and restocks.",
    lessons: ["Write the sale post", "Email your regulars", "Restock the shelves"],
    tint: "from-fuchsia-400 to-brand-700",
  },
  {
    id: "business-review",
    persona: "business",
    name: "Unhappy customer",
    emoji: "💬",
    blurb: "A one-star review. Pipo replies kindly, checks with you before a refund and follows up.",
    lessons: ["Reply to the review", "Sort out a refund", "Follow up next week"],
    tint: "from-rose-300 to-brand-600",
  },
  {
    id: "business-staff",
    persona: "business",
    name: "Staff week",
    emoji: "🗓️",
    blurb: "A new week at the café. Pipo plans shifts, messages the team and orders supplies.",
    lessons: ["Plan the shifts", "Message the team", "Order supplies"],
    tint: "from-sky-300 to-brand-700",
  },
];

export const pathsOf = (persona: Persona) => PATHS.filter((p) => p.persona === persona);
export const pathById = (id: string) => PATHS.find((p) => p.id === id);
