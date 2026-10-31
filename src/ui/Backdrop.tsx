import { MeshGradient } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";
import { TOUCH } from "./device.ts";

const COLORS = ["#d9d4ff", "#7d6cf5", "#9cc2ff", "#efe4ff", "#5b6ff0"];

/** The same colors as soft CSS blobs, for phones: no WebGL, nothing redrawn while you scroll. */
const STILL_GRADIENT = [
  "radial-gradient(70% 45% at 12% 8%, #efe4ff 0%, rgb(239 228 255 / 0) 70%)",
  "radial-gradient(65% 40% at 92% 22%, #9cc2ff 0%, rgb(156 194 255 / 0) 70%)",
  "radial-gradient(80% 50% at 85% 88%, #7d6cf5 0%, rgb(125 108 245 / 0) 70%)",
  "radial-gradient(70% 45% at 8% 72%, #5b6ff0 0%, rgb(91 111 240 / 0) 70%)",
  "#d9d4ff",
].join(", ");

/** Slow-moving mesh gradient behind every screen. Holds still for reduced motion and on phones. */
export function Backdrop() {
  const [still, setStill] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (TOUCH) return <div className="fixed inset-0 -z-10" style={{ background: STILL_GRADIENT }} aria-hidden="true" />;

  return (
    <div className="fixed inset-0 -z-10 bg-brand-100" aria-hidden="true">
      <MeshGradient
        className="h-full w-full"
        colors={COLORS}
        distortion={0.8}
        swirl={0.15}
        speed={still ? 0 : 0.15}
        maxPixelCount={1920 * 1080}
      />
    </div>
  );
}
