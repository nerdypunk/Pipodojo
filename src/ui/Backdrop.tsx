import { MeshGradient } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";
import { TOUCH } from "./device.ts";

const COLORS = ["#d9d4ff", "#7d6cf5", "#9cc2ff", "#efe4ff", "#5b6ff0"];
/** The grown-ups' night: deep indigo with a purple glow low on the right, like a city at night. */
const NIGHT_COLORS = ["#0b0a24", "#1a1650", "#2b1d6b", "#0e1640", "#4a1f78"];

/** The same colors as soft CSS blobs, for phones: no WebGL, nothing redrawn while you scroll. */
const STILL_GRADIENT = [
  "radial-gradient(70% 45% at 12% 8%, #efe4ff 0%, rgb(239 228 255 / 0) 70%)",
  "radial-gradient(65% 40% at 92% 22%, #9cc2ff 0%, rgb(156 194 255 / 0) 70%)",
  "radial-gradient(80% 50% at 85% 88%, #7d6cf5 0%, rgb(125 108 245 / 0) 70%)",
  "radial-gradient(70% 45% at 8% 72%, #5b6ff0 0%, rgb(91 111 240 / 0) 70%)",
  "#d9d4ff",
].join(", ");
const NIGHT_GRADIENT = [
  "radial-gradient(70% 55% at 88% 92%, #4a1f78 0%, rgb(74 31 120 / 0) 70%)",
  "radial-gradient(60% 45% at 15% 10%, #24206a 0%, rgb(36 32 106 / 0) 70%)",
  "radial-gradient(90% 70% at 50% 45%, #15134a 0%, rgb(21 19 74 / 0) 75%)",
  "#0b0a24",
].join(", ");

/** Faint stars over the night sky: [left %, top %, size px], fixed so they never jump around. */
const STARS: readonly [number, number, number][] = [
  [4, 6, 2], [11, 18, 1], [17, 4, 1.5], [26, 12, 1], [33, 7, 2], [41, 20, 1], [47, 4, 1.5], [55, 14, 1], [62, 6, 2], [69, 22, 1],
  [76, 9, 1.5], [83, 3, 1], [90, 16, 2], [96, 8, 1], [8, 32, 1], [21, 40, 1.5], [93, 34, 1], [72, 38, 1], [3, 58, 1.5], [97, 60, 1],
];

/**
 * Slow-moving mesh gradient behind every screen. Holds still for reduced motion and on phones, and
 * while `paused` (something covers it, like the front page's hero): at speed 0 it stops drawing.
 * `night` swaps in the grown-ups' night sky, with a scatter of stars.
 */
export function Backdrop({ paused = false, night = false }: { paused?: boolean; night?: boolean }) {
  const [still, setStill] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const stars = night && (
    <div className="absolute inset-0" aria-hidden="true">
      {STARS.map(([x, y, s], i) => (
        <span
          key={i}
          className="twinkle absolute rounded-full bg-white motion-reduce:animate-none"
          style={{ left: `${x}%`, top: `${y}%`, width: s * 1.5, height: s * 1.5, opacity: 0.6, animationDelay: `${(i * 0.37) % 3.6}s` }}
        />
      ))}
    </div>
  );

  if (TOUCH) {
    return (
      <div className="fixed inset-0 -z-10" style={{ background: night ? NIGHT_GRADIENT : STILL_GRADIENT }} aria-hidden="true">
        {stars}
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 -z-10 ${night ? "bg-[#0b0a24]" : "bg-brand-100"}`} aria-hidden="true">
      <MeshGradient
        // A new key swaps the shader's colors cleanly when the theme changes.
        key={night ? "night" : "day"}
        className="h-full w-full"
        colors={night ? NIGHT_COLORS : COLORS}
        distortion={0.8}
        swirl={0.15}
        speed={still || paused ? 0 : night ? 0.08 : 0.15}
        maxPixelCount={1920 * 1080}
      />
      {stars}
    </div>
  );
}
