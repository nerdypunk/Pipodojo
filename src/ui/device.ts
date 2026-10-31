// Phones and tablets: touch screens, usually with much weaker graphics than a computer. They get
// the same look with the moving GPU effects (shader backgrounds, animated borders, sparkle
// canvases, frosted-glass blur) swapped for still ones, so scrolling and tapping stay smooth.
// Decided once at load; a device doesn't turn into a phone mid-game.

export const TOUCH = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
