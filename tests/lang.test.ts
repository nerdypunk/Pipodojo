// A first visit picks the language from the browser's main language only: Spanish gets Spanish,
// English or anything else gets English. A choice the player made is remembered and wins.
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialLang } from "../src/i18n/index.tsx";

function browser(languages: string[], saved: string | null = null) {
  vi.stubGlobal("navigator", { languages, language: languages[0] });
  vi.stubGlobal("localStorage", { getItem: () => saved });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("first-visit language", () => {
  it.each([
    [["es-HN", "es"], "es"],
    [["es-419"], "es"],
    [["es-US", "en-US"], "es"],
    [["en-US", "es-HN"], "en"],
    [["en-GB"], "en"],
    [["pt-BR", "es"], "en"],
    [[], "en"],
  ])("%j opens in %s", (languages, lang) => {
    browser(languages);
    expect(initialLang()).toBe(lang);
  });

  it("keeps the player's own choice over the browser's language", () => {
    browser(["es-HN"], "en");
    expect(initialLang()).toBe("en");
  });
});
