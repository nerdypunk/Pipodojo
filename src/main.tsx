import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito/wght.css";
import "@fontsource/silkscreen/700.css";
import "./index.css";
import { App } from "./app/App.tsx";
import { startAnalytics } from "./app/analytics.ts";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startAnalytics();
