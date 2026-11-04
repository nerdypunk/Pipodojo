// The end-of-path share card: a 1080x1350 image (Instagram portrait size) drawn on a canvas.
// Big brag headline, what your agent did, the Muse Image postcard, your streak, stars, badge and country.
// Everything is drawn here in the browser, so it costs nothing and works offline.
import { flagOf } from "../game/countries.ts";
import { wrapLines } from "../lib/utils.ts";
import type { Strings } from "../i18n/en.ts";

export interface ShareInfo {
  /** e.g. "My AI agent just handled a whole school week 🎒" */
  brag: string;
  pathName: string;
  stars: number;
  maxStars: number;
  lessons: number;
  /** Days in a row. */
  streak: number;
  /** The player's country, e.g. { code: "HN", name: "Honduras" }; null leaves it off. */
  country: { code: string; name: string } | null;
  /** The postcard picture (data URL or same-site file); null draws a placeholder. */
  postcard: string | null;
  /** True when Meta's Muse Image painted it live (not the ready-made fallback): the card says so. */
  painted: boolean;
  /** Shown in the footer, e.g. "pipodojo.pages.dev". */
  site: string;
  /** The card's words, in the player's language. */
  words: Strings["card"];
}

const W = 1080;
const H = 1350;
const FONT = '"Nunito Variable", "M PLUS Rounded 1c", ui-rounded, "Hiragino Maru Gothic ProN", "Yu Gothic UI", "Meiryo", system-ui, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Breaks text into lines that fit `width` (between characters in Japanese). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  return wrapLines(text, width, (s) => ctx.measureText(s).width);
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, color: string, size = 34, alignRight = false) {
  ctx.font = `900 ${size}px ${FONT}`;
  const w = ctx.measureText(text).width + size * 1.2;
  const h = size * 1.75;
  const left = alignRight ? x - w : x;
  ctx.fillStyle = fill;
  roundRect(ctx, left, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, left + size * 0.6, y + h / 2 + 2);
  ctx.textBaseline = "alphabetic";
  return w;
}

const GAP = 18;

/** Width of a pill drawn by pill(). */
function pillWidth(ctx: CanvasRenderingContext2D, text: string, size: number) {
  ctx.font = `900 ${size}px ${FONT}`;
  return ctx.measureText(text).width + size * 1.2;
}

/**
 * Some systems (Windows) draw a flag emoji as two plain letters. Draws one off-screen and looks
 * for colour: a real flag has some, plain letters drawn in black don't.
 */
let flagsWork: boolean | null = null;
function canDrawFlags(): boolean {
  if (flagsWork !== null) return flagsWork;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return (flagsWork = false);
  g.fillStyle = "#000";
  g.font = "28px sans-serif";
  g.textBaseline = "top";
  g.fillText(flagOf("HN"), 0, 0);
  const px = g.getImageData(0, 0, 32, 32).data;
  flagsWork = false;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3]! > 0 && Math.abs(px[i]! - px[i + 2]!) > 40) flagsWork = true;
  return flagsWork;
}

/**
 * The bottom row: stars, lessons and the player's flag and country, at the biggest size that fits
 * the card (long names like "Bosnia y Herzegovina" make the row a little smaller).
 */
function statsRow(ctx: CanvasRenderingContext2D, info: ShareInfo): { pills: string[]; size: number } {
  const w = info.words;
  const stats = [w.stars(info.stars, info.maxStars), w.lessons(info.lessons)];
  if (!info.country) return { pills: stats, size: 32 };
  const pills = [...stats, `${canDrawFlags() ? flagOf(info.country.code) : "📍"} ${info.country.name}`];
  for (const size of [32, 30, 28, 26, 24]) {
    const total = pills.reduce((sum, text) => sum + pillWidth(ctx, text, size), 0) + GAP * (pills.length - 1);
    if (total <= W - 144) return { pills, size };
  }
  return { pills: stats, size: 32 };
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

export async function drawShareCard(info: ShareInfo): Promise<Blob> {
  // A canvas can't wait for a font, so load every piece the card's words need first (in Japanese,
  // only the slices holding these characters).
  const say = info.words;
  const words = [
    info.brag,
    say.line1,
    say.line2,
    say.streak(info.streak),
    say.paintedBy,
    say.pro(info.pathName),
    say.stars(info.stars, info.maxStars),
    say.lessons(info.lessons),
    info.country?.name ?? "",
    say.footer(info.site),
  ].join(" ");
  await Promise.all([document.fonts.load(`900 64px ${FONT}`, words), document.fonts.load(`700 32px ${FONT}`, words)]).catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background: the Pipodojo purple, with soft glows
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2d2470");
  bg.addColorStop(0.55, "#5a46e0");
  bg.addColorStop(1, "#8c7dfb");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [
    [180, 200, 420, "rgba(156,194,255,0.35)"],
    [960, 980, 480, "rgba(255,122,26,0.18)"],
    [900, 160, 300, "rgba(255,255,255,0.12)"],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Top: the name and the streak
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 54px ${FONT}`;
  ctx.fillText("Pipodojo", 72, 118);
  const w = info.words;
  pill(ctx, w.streak(info.streak), W - 72, 66, "#ff7a1a", "#ffffff", 36, true);

  // The brag
  ctx.font = `900 80px ${FONT}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(w.line1, 72, 250);
  ctx.fillStyle = "#ffd166";
  ctx.fillText(w.line2, 72, 338);
  ctx.font = `700 40px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  wrap(ctx, info.brag, W - 144)
    .slice(0, 2)
    .forEach((line, i) => ctx.fillText(line, 72, 410 + i * 52));

  // The postcard, like a photo pinned at a slight angle
  const size = 600;
  const cx = W / 2;
  const cy = 820;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.04);
  ctx.shadowColor = "rgba(20,14,60,0.45)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, -size / 2 - 18, -size / 2 - 18, size + 36, size + 36, 40);
  ctx.fill();
  ctx.shadowColor = "transparent";
  const img = info.postcard ? await loadImage(info.postcard) : null;
  roundRect(ctx, -size / 2, -size / 2, size, size, 26);
  ctx.clip();
  if (img) {
    const s = Math.max(size / img.width, size / img.height);
    ctx.drawImage(img, -(img.width * s) / 2, -(img.height * s) / 2, img.width * s, img.height * s);
  } else {
    ctx.fillStyle = "#e8e6ff";
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.font = `200px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("🏅", 0, 70);
    ctx.textAlign = "left";
  }
  // Credit the Meta model that painted it, on the photo itself
  if (img && info.painted) pill(ctx, w.paintedBy, -size / 2 + 22, -size / 2 + 22, "rgba(27,22,64,0.82)", "#ffffff", 26);
  ctx.restore();

  // A badge sticker over the corner of the postcard
  ctx.save();
  ctx.translate(cx + size / 2 - 40, cy + size / 2 - 10);
  ctx.rotate(0.08);
  ctx.font = `900 34px ${FONT}`;
  const badge = w.pro(info.pathName);
  const bw = ctx.measureText(badge).width + 56;
  ctx.shadowColor = "rgba(20,14,60,0.35)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffd166";
  roundRect(ctx, -bw, -38, bw, 76, 38);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#26233a";
  ctx.textBaseline = "middle";
  ctx.fillText(badge, -bw + 28, 2);
  ctx.restore();

  // Stats (and the player's country) in one row, then the footer
  let x = 72;
  const row = statsRow(ctx, info);
  for (const text of row.pills) x += pill(ctx, text, x, 1176 + (32 - row.size) * 0.875, "rgba(255,255,255,0.92)", "#4936bd", row.size) + GAP;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(w.footer(info.site), 72, 1300);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No image"))), "image/jpeg", 0.92));
}
