// The rounded Japanese font, M PLUS Rounded 1c (SIL Open Font License), served from our own site.
// Its stylesheet is loaded only when the game is in Japanese, so English and Spanish players never
// fetch any of it. Each weight is cut into ~120 small .woff2 files by character (unicode-range), and
// the browser downloads only the pieces whose characters are on screen. Nunito still draws Latin
// letters and numbers, so this font only fills in kana and kanji.

let loading: Promise<unknown> | null = null;

/** Adds the Japanese font's stylesheet to the page (once). Never throws: the system font stays as backup. */
export function loadJapaneseFont(): Promise<unknown> {
  loading ??= import("./japaneseFontStyles.ts").catch(() => {
    loading = null;
  });
  return loading;
}
