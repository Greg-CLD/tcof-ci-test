import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize accessibility testing in development mode
if (import.meta.env.DEV) {
  // Load axe-core for React dynamically to avoid including in production build
  import('@axe-core/react').then(({ default: axe }) => {
    // Initialize axe-core with React and set a delay to allow the app to render
    axe(React, ReactDOM, 1000, {
      // Set configuration options for axe-core
      rules: [
        // Examples of rule configurations:
        { id: 'color-contrast', enabled: true },
        { id: 'aria-allowed-attr', enabled: true },
        { id: 'aria-roles', enabled: true }
      ]
    });
    console.log('%c🔍 Accessibility testing enabled with @axe-core/react', 'color: #0984e3; font-weight: bold;');
  }).catch(err => {
    console.error('Error initializing accessibility tests:', err);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
