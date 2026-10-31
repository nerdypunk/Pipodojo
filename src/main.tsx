import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito/wght.css";
import "./index.css";
import { App } from "./app/App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
