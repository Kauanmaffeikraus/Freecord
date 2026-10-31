import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import InGameOverlay from "./components/overlay/InGameOverlay";
import "./styles.css";

const isOverlay = typeof window !== "undefined" && window.location.hash === "#overlay";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isOverlay ? <InGameOverlay /> : <App />}
  </React.StrictMode>
);

