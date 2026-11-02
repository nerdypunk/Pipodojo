import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito/wght.css";
import "./index.css";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import flagsFont from "country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2?url";
import { App } from "./app/App.tsx";
import { startAnalytics } from "./app/analytics.ts";

// Windows can't draw flag emoji (the leaderboard's 🇭🇳 shows as "HN"). Only there, load a small
// flags-only font, served from our own site; phones and Macs keep their own flags.
polyfillCountryFlagEmojis("Twemoji Country Flags", flagsFont);

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startAnalytics();
