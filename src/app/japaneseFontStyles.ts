// The Japanese font's weights, in one module so the build ships them as one stylesheet: the five
// weights repeat the same character ranges, so together they compress to less than half.
// Loaded only through japaneseFont.ts, when the game is in Japanese.
// Weights: normal, medium, bold (also used for semibold), extra bold, black.
import "@fontsource/m-plus-rounded-1c/400.css";
import "@fontsource/m-plus-rounded-1c/500.css";
import "@fontsource/m-plus-rounded-1c/700.css";
import "@fontsource/m-plus-rounded-1c/800.css";
import "@fontsource/m-plus-rounded-1c/900.css";
