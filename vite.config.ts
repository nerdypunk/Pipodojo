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
  test: {
    include: ["tests/**/*.test.{ts,js}"],
  },
});
