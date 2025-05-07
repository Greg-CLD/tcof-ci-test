if (import.meta.env.DEV) {
  // Unregister service workers to avoid caching issues
  navigator.serviceWorker?.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
  
  // Add event listener for hmr message to force no-cache reload when needed
  window.addEventListener('hmr:force-reload', () => {
    console.log('🔄 HMR forcing hard refresh without cache');
    // Force reload with cache cleared
    window.location.reload();
  });
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
