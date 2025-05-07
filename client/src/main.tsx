if (import.meta.env.DEV) {
  // Always unregister any service workers in development mode to avoid caching issues
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      console.log(`🧹 Unregistering ${registrations.length} service worker(s) to prevent caching issues`);
      for (const registration of registrations) {
        registration.unregister().then(
          (wasUnregistered) => wasUnregistered ? 
            console.log('Successfully unregistered service worker') : 
            console.log('Service worker not unregistered')
        );
      }
    }).catch(err => console.error('Error unregistering service workers:', err));
  }
  
  // Listen for special HMR force reload events
  window.addEventListener('hmr:force-reload', () => {
    console.log('🔄 HMR forcing hard refresh without cache');
    
    // Clear application cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          console.log(`Clearing cache: ${cacheName}`);
          caches.delete(cacheName);
        });
      });
    }
    
    // Force reload without cache by adding a timestamp parameter
    const url = new URL(window.location.href);
    url.searchParams.set('t', Date.now().toString());
    window.location.href = url.toString();
  });
  
  // Ensure no cache is used when making fetch requests in development
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    // If this is an API request, add cache-busting headers
    if (typeof input === 'string' && input.includes('/api/')) {
      const newInit: RequestInit = {
        ...init,
        cache: 'no-store',
        headers: {
          ...init?.headers,
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Pragma': 'no-cache'
        }
      };
      
      // Add timestamp to GET requests for cache busting
      if (!init?.method || init.method === 'GET') {
        const separator = input.includes('?') ? '&' : '?';
        input = `${input}${separator}_t=${Date.now()}`;
      }
      
      return originalFetch(input, newInit);
    } else if (input instanceof Request && input.url.includes('/api/')) {
      // Create a new request with the same properties but with cache headers
      const newRequest = new Request(input, {
        cache: 'no-store',
        headers: {
          ...Object.fromEntries(input.headers.entries()),
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Pragma': 'no-cache'
        }
      });
      
      return originalFetch(newRequest);
    }
    
    // For non-API requests, use the original arguments
    return originalFetch(input, init);
  };
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
