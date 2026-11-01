// "Which prompt wins?" (a Lab prototype): each round takes a real lesson and puts its best prompt
// against the same prompt with one flaw (a fact left out, or a weak piece swapped in). The player
// guesses which gets Pipo's better answer, then both run live and the rules score them.

export interface VersusRound {
  missionId: string;
  /** The flaw the weaker message has (see the lesson's flaws). */
  flaw: string;
  /** Which side shows the best message, so it isn't always the same one. */
  bestSide: "A" | "B";
}

export const VERSUS_ROUNDS: readonly VersusRound[] = [
  { missionId: "parent-01-dinner", flaw: "no_vegetarian", bestSide: "B" },
  { missionId: "cafe-01-sale-post", flaw: "no_discount", bestSide: "A" },
  { missionId: "cafe-04-review", flaw: "blame", bestSide: "B" },
  { missionId: "student-03-quiz", flaw: "no_focus", bestSide: "A" },
];
