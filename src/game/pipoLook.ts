// The player's own Pipo: a head, a body and a color scheme, all drawn in code (no API cost).
// The look also feeds the end-of-path postcard prompt, so Muse Image draws *your* Pipo.

export type PipoHead = "classic" | "dome" | "boxy";
export type PipoBody = "hover" | "wheels" | "rocket";
export type PipoColor = "sunset" | "mint" | "bubblegum" | "sky";

export interface PipoLook {
  head: PipoHead;
  body: PipoBody;
  color: PipoColor;
}

export const DEFAULT_LOOK: PipoLook = { head: "classic", body: "hover", color: "sunset" };

export const HEADS: readonly { id: PipoHead; label: string; es: string; ja: string; describe: string }[] = [
  { id: "classic", label: "Classic", es: "Clásica", ja: "クラシック", describe: "a rounded head with ear pods" },
  { id: "dome", label: "Dome", es: "Domo", ja: "ドーム", describe: "a round glass-dome head" },
  { id: "boxy", label: "Boxy", es: "Cuadrada", ja: "ボックス", describe: "a square head with little bolts" },
];

export const BODIES: readonly { id: PipoBody; label: string; es: string; ja: string; describe: string }[] = [
  { id: "hover", label: "Hover", es: "Flotante", ja: "ホバー", describe: "a small hovering body with a glowing core" },
  { id: "wheels", label: "Wheels", es: "Rueda", ja: "タイヤ", describe: "a body with one big wheel underneath, hovering off the ground" },
  { id: "rocket", label: "Rocket", es: "Cohete", ja: "ロケット", describe: "a body with a little rocket flame underneath" },
];

export interface Palette {
  /** Shell gradient: light, mid, dark. */
  shell: readonly [string, string, string];
  /** Ear pods, arms, antenna. */
  accent: string;
  describe: string;
}

export const COLORS: readonly { id: PipoColor; label: string; es: string; ja: string; palette: Palette }[] = [
  { id: "sunset", label: "Sunset", es: "Atardecer", ja: "サンセット", palette: { shell: ["#ffb36b", "#ff7a1a", "#d9530a"], accent: "#3b2d96", describe: "orange" } },
  { id: "mint", label: "Mint", es: "Menta", ja: "ミント", palette: { shell: ["#86efac", "#22c55e", "#15803d"], accent: "#1e3a8a", describe: "mint green" } },
  { id: "bubblegum", label: "Bubblegum", es: "Chicle", ja: "バブルガム", palette: { shell: ["#f9a8d4", "#ec4899", "#be185d"], accent: "#3b2d96", describe: "bubblegum pink" } },
  { id: "sky", label: "Sky", es: "Cielo", ja: "スカイ", palette: { shell: ["#93c5fd", "#3b82f6", "#1d4ed8"], accent: "#312e81", describe: "sky blue" } },
];

export function paletteOf(color: PipoColor): Palette {
  return (COLORS.find((c) => c.id === color) ?? COLORS[0]!).palette;
}

/** Plain words for the image prompt, e.g. "a cute, sleek orange robot with a round glass-dome head, ...". */
export function describeLook(look: PipoLook): string {
  const head = HEADS.find((h) => h.id === look.head)?.describe ?? HEADS[0]!.describe;
  const body = BODIES.find((b) => b.id === look.body)?.describe ?? BODIES[0]!.describe;
  return `a cute, sleek ${paletteOf(look.color).describe} robot named Pipo with ${head}, a dark glass visor with glowing LED eyes, and ${body}`;
}

/** Reads a stored look, falling back to the default for anything unknown. */
export function parseLook(raw: unknown): PipoLook {
  const v = (raw ?? {}) as Partial<Record<keyof PipoLook, unknown>>;
  const pick = <T extends string>(value: unknown, options: readonly { id: T }[], fallback: T): T =>
    options.some((o) => o.id === value) ? (value as T) : fallback;
  return {
    head: pick(v.head, HEADS, DEFAULT_LOOK.head),
    body: pick(v.body, BODIES, DEFAULT_LOOK.body),
    color: pick(v.color, COLORS, DEFAULT_LOOK.color),
  };
}
