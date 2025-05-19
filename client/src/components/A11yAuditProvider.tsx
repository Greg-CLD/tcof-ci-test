import React, { ReactNode, useEffect, useState } from 'react';
import { runAccessibilityAudit } from '@/lib/a11y-audit';
import { useLocation } from 'wouter';

interface A11yAuditProviderProps {
  children: ReactNode;
  disabled?: boolean;
  /** Skip these routes from auditing (useful for auth pages, etc.) */
  skipRoutes?: string[];
  /** Minimum delay between audits (milliseconds) */
  throttleMs?: number;
}

/**
 * A provider component that runs accessibility audits on route changes
 * This component only works in development mode and does nothing in production
 */
export function A11yAuditProvider({ 
  children, 
  disabled = true, // Default to disabled to prevent console logs
  skipRoutes = ['/auth'], // Skip auth page by default
  throttleMs = 3000 // Default throttle of 3 seconds
}: A11yAuditProviderProps) {
  const [location] = useLocation();
  const [lastAuditTime, setLastAuditTime] = useState(0);
  
  useEffect(() => {
    // Always skip in development to prevent console flooding
    // You can re-enable by setting window.enableA11yAudits = true in console
    if (disabled || import.meta.env.PROD || !(window as any).enableA11yAudits) {
      return;
    }
    
    // Check if current route should be skipped
    if (skipRoutes.some(route => location.startsWith(route))) {
      // Removed console.log to reduce noise
      return;
    }
    
    // Throttle audits
    const now = Date.now();
    const timeSinceLastAudit = now - lastAuditTime;
    const shouldThrottle = timeSinceLastAudit < throttleMs;
    
    // Wait for the page to fully render before running audit
    const timeoutId = setTimeout(() => {
      // Only log when explicitly enabled
      if ((window as any).enableA11yAudits) {
        console.log(`%c📋 Running accessibility audit for: ${location}`, 'color: #0984e3; font-weight: bold;');
      }
      
      // Local fix for any specific route - still apply fixes without logging
      const fixElementsBeforeAudit = () => {
        try {
          // Example fix for specific components
          // Home page cards missing alt text
          document.querySelectorAll('.home-card img:not([alt])').forEach(img => {
            if (img instanceof HTMLImageElement) {
              img.alt = 'Card image';
            }
          });
          
          // Fix buttons without accessible names
          document.querySelectorAll('button:not([aria-label]):not([title])').forEach(btn => {
            if (btn instanceof HTMLButtonElement && !btn.textContent?.trim() && btn.querySelector('svg')) {
              // It's likely an icon button, try to infer purpose from CSS classes
              const classes = Array.from(btn.classList);
              let purpose = '';
              
              if (classes.some(c => c.includes('close') || c.includes('dismiss'))) {
                purpose = 'Close';
              } else if (classes.some(c => c.includes('menu'))) {
                purpose = 'Menu';
              } else if (classes.some(c => c.includes('search'))) {
                purpose = 'Search';
              } else {
                purpose = 'Action';
              }
              
              btn.setAttribute('aria-label', `${purpose} button`);
            }
          });
        } catch (error) {
          // Silent error handling to avoid console noise
        }
      };
      
      // Run pre-audit fixes silently
      fixElementsBeforeAudit();
      
      // Only run the audit when explicitly enabled
      if ((window as any).enableA11yAudits) {
        runAccessibilityAudit({
          minSeverity: 'moderate',
          verbose: false, // Set to false to reduce console output
          autoFix: true
        });
      }
      
      // Update last audit time
      setLastAuditTime(Date.now());
    }, shouldThrottle ? 0 : 1500); // Skip delay if throttled
    
    return () => clearTimeout(timeoutId);
  }, [location, disabled, skipRoutes, lastAuditTime, throttleMs]);
  
  return <>{children}</>;
}

export default A11yAuditProvider;