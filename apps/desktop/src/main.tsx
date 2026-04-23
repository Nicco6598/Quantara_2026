import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./theme/app.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Quantara root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
