/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // In dev, /api/* goes to the Pages Function served by wrangler (see scripts/dev.mjs).
    proxy: {
      "/api": "http://127.0.0.1:8788",
    },
  },
  // Pre-bundle the lazily loaded graphics libraries so dev never re-optimizes mid-session.
  optimizeDeps: {
    include: ["three", "vanta/dist/vanta.net.min"],
  },
  // three.js (Pipo's brain) is a ~600 kB chunk, but it's lazy-loaded on wide screens only.
  build: {
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ["tests/**/*.test.{ts,js}"],
  },
});
