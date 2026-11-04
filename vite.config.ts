/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";

/**
 * The Japanese font (src/app/japaneseFont.ts) lists every slice twice, as .woff2 and as an old .woff
 * backup. Every browser that can load a font in slices reads .woff2, so the backups are dropped:
 * half the files and a much smaller stylesheet.
 */
function woff2Only(): Plugin {
  return {
    name: "pipodojo:woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!/@fontsource[\\/]m-plus-rounded-1c[\\/].*\.css$/.test(id.split("?")[0]!)) return null;
      return { code: code.replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, ""), map: null };
    },
  };
}

export default defineConfig({
  plugins: [woff2Only(), react(), tailwindcss()],
  // "@/..." points at src (used by the shadcn/smoothui components).
  resolve: {
    alias: {
      // The swup theme packages only export their JS plugin; point straight at their CSS
      // (we drive the theme classes ourselves, see src/ui/PageTransition.tsx).
      "@swup/overlay-theme/src/index.css": fileURLToPath(
        new URL("./node_modules/@swup/overlay-theme/src/index.css", import.meta.url),
      ),
      "@swup/slide-theme/src/index.css": fileURLToPath(
        new URL("./node_modules/@swup/slide-theme/src/index.css", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // In dev, /api/* goes to the Worker served by wrangler (see scripts/dev.mjs).
    proxy: {
      "/api": "http://127.0.0.1:8788",
    },
  },
  // Pre-bundle these so dev never re-optimizes mid-session (that once loaded two copies of React).
  optimizeDeps: {
    include: ["@egjs/flicking", "@egjs/flicking-plugins", "motion/react"],
  },
  test: {
    include: ["tests/**/*.test.{ts,js}"],
  },
});
