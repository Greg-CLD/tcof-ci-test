import React, { ReactNode, useEffect } from 'react';
import { runAccessibilityAudit } from '@/lib/a11y-audit';
import { useLocation } from 'wouter';

interface A11yAuditProviderProps {
  children: ReactNode;
  disabled?: boolean;
}

/**
 * A provider component that runs accessibility audits on route changes
 * This component only works in development mode and does nothing in production
 */
export function A11yAuditProvider({ children, disabled = false }: A11yAuditProviderProps) {
  const [location] = useLocation();
  
  useEffect(() => {
    // Skip if disabled or in production
    if (disabled || import.meta.env.PROD) {
      return;
    }
    
    // Wait for the page to fully render before running audit
    const timeoutId = setTimeout(() => {
      console.log(`%c📋 Running accessibility audit for: ${location}`, 'color: #0984e3; font-weight: bold;');
      runAccessibilityAudit({
        minSeverity: 'moderate',
        verbose: true,
        autoFix: true
      });
    }, 1500); // Wait for 1.5 seconds to ensure the page is fully rendered
    
    return () => clearTimeout(timeoutId);
  }, [location, disabled]);
  
  return <>{children}</>;
}

export default A11yAuditProvider;