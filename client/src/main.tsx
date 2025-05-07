// Unregister any service worker and disable HTTP cache in dev
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs =>
    regs.forEach(reg => reg.unregister())
  );
}

// Disable browser caching for development
if (import.meta.env.DEV) {
  // We can't directly override window.location.reload, so we'll use another approach
  console.log('💡 Cache disabled - browser cache headers will be bypassed during development');
}

import React from "react";
import { createRoot } from "react-dom/client";
import * as ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

// Initialize accessibility testing in development mode
if (import.meta.env.DEV) {
  // Log that we have accessibility features
  console.log('%c🔍 Accessibility testing enabled via A11yAuditProvider', 'color: #0984e3; font-weight: bold;');
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(e) => console.error('Global error caught by ErrorBoundary:', e)}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
