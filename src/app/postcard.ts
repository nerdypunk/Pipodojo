// Paints the end-of-path postcard through /api/image (Muse Image). Never fails: if painting is
// slow, broken or used up, the player gets a ready-made postcard instead.

export type Postcard =
  /** `startedAt` (Date.now()) drives the live "painting for 7 s" counter. */
  | { status: "painting"; startedAt: number }
  /**
   * `painted` is false when the ready-made fallback is shown instead. A painted postcard also
   * carries how it was made, shown to the player: the Meta model that painted it, how long it
   * took, and the prompt Pipo wrote for it from the player's own lessons.
   */
  | { status: "ready"; src: string; painted: boolean; model?: string; ms?: number; scene?: string };

export const FALLBACK_POSTCARD = `${import.meta.env.BASE_URL}postcard-fallback.webp`;

/** Muse Image usually takes about 15 seconds. */
const PAINT_TIMEOUT_MS = 30_000;

/** Cost control: paintings allowed per page session (one per finished path, plus replays). */
const MAX_PAINTINGS_PER_SESSION = 3;
let paintingsUsed = 0;

/** The image comes back as base64; its first bytes tell the format. */
function mimeOf(b64: string): string {
  if (b64.startsWith("UklGR")) return "image/webp";
  if (b64.startsWith("/9j/")) return "image/jpeg";
  return "image/png";
}

export async function paintPostcard(scene: string): Promise<Extract<Postcard, { status: "ready" }>> {
  const fallback = { status: "ready", src: FALLBACK_POSTCARD, painted: false } as const;
  if (paintingsUsed >= MAX_PAINTINGS_PER_SESSION) return fallback;
  paintingsUsed++;
  const started = performance.now();
  try {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scene }),
      signal: AbortSignal.timeout(PAINT_TIMEOUT_MS),
    });
    if (!res.ok) return fallback;
    const { image, model } = (await res.json()) as { image?: unknown; model?: unknown };
    if (typeof image !== "string" || !image) return fallback;
    return {
      status: "ready",
      src: `data:${mimeOf(image)};base64,${image}`,
      painted: true,
      ms: Math.round(performance.now() - started),
      scene,
      ...(typeof model === "string" ? { model } : {}),
    };
  } catch {
    return fallback;
  }
}

/** File name for Save, matching the picture's format. */
export function postcardFileName(src: string): string {
  const ext = src.startsWith("data:image/png") ? "png" : src.startsWith("data:image/jpeg") ? "jpg" : "webp";
  return `pipo-postcard.${ext}`;
}
