import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito/wght.css";
// Page transitions. The full bundle: the per-family files lack the shape variables they use.
import "transition-style/transition.min.css";
import "./index.css";
import { App } from "./app/App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
