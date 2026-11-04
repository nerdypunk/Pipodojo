// Shared by the front page and its footer.

export const CONTACT_EMAIL = "hello@pipodojo.com";
export const REPO_URL = "https://github.com/nerdypunk/Pipodojo";
/** The page's dark, behind everything. */
export const NIGHT = "#1b1640";

export type SectionId = "about" | "teachers" | "researchers" | "contact";

/** Scrolls to a section of the front page (straight there with reduced motion). */
export function scrollToSection(id: SectionId) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
}
