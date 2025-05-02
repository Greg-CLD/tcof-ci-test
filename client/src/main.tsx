import React from "react";
import { createRoot } from "react-dom/client";
import * as ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

// Initialize accessibility testing in development mode
if (import.meta.env.DEV) {
  // Log that we have accessibility features
  console.log('%c🔍 Accessibility testing enabled via A11yAuditProvider', 'color: #0984e3; font-weight: bold;');
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
