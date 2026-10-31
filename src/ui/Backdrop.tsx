import { MeshGradient } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";

const COLORS = ["#d9d4ff", "#7d6cf5", "#9cc2ff", "#efe4ff", "#5b6ff0"];

/** Slow-moving mesh gradient behind every screen. Holds still for reduced motion. */
export function Backdrop() {
  const [still, setStill] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

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
