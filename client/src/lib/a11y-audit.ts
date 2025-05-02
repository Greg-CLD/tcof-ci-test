import axe from 'axe-core';
import React from 'react';

/**
 * Configuration options for the accessibility audit
 */
export interface AuditOptions {
  /** Only report issues of this level and above */
  minSeverity?: 'minor' | 'moderate' | 'serious' | 'critical';
  /** Show detailed audit information */
  verbose?: boolean;
  /** Automatically try to fix simple issues */
  autoFix?: boolean;
}

/**
 * Default configuration for accessibility audits
 */
const defaultOptions: AuditOptions = {
  minSeverity: 'moderate',
  verbose: false,
  autoFix: true
};

/**
 * Run an accessibility audit on the current page
 * @param options Configuration options for the audit
 */
export const runAccessibilityAudit = async (options: AuditOptions = defaultOptions): Promise<void> => {
  // Only run in development
  if (import.meta.env.PROD) {
    return;
  }

  // Merge options with defaults
  const config = { ...defaultOptions, ...options };
  
  try {
    const results = await axe.run(document.body, {
      rules: {
        // Add specific rule overrides here
        'color-contrast': { enabled: true },
        'document-title': { enabled: true },
        'html-has-lang': { enabled: true },
        'landmark-one-main': { enabled: true },
        'page-has-heading-one': { enabled: true }
      }
    });

    // Log overall accessibility issues count
    if (results.violations.length > 0) {
      // Filter violations by minimum severity
      const filteredViolations = results.violations.filter(violation => {
        const severityRanking = {
          minor: 1,
          moderate: 2,
          serious: 3,
          critical: 4
        };
        
        return severityRanking[violation.impact as keyof typeof severityRanking] >= 
               severityRanking[config.minSeverity as keyof typeof severityRanking];
      });
      
      if (filteredViolations.length > 0) {
        // Group by severity
        const violationsBySeverity: Record<string, number> = {};
        
        filteredViolations.forEach(violation => {
          if (!violationsBySeverity[violation.impact || 'unknown']) {
            violationsBySeverity[violation.impact || 'unknown'] = 0;
          }
          violationsBySeverity[violation.impact || 'unknown']++;
        });
        
        // Create summary message
        console.group('%c🔍 Accessibility Issues Detected', 'font-weight: bold; color: #d63031;');
        
        // Summary of issues by severity
        Object.entries(violationsBySeverity).forEach(([severity, count]) => {
          const colorMap: Record<string, string> = {
            critical: '#d63031',
            serious: '#e17055',
            moderate: '#fdcb6e',
            minor: '#74b9ff',
            unknown: '#b2bec3'
          };
          
          const severityColor = colorMap[severity] || '#b2bec3';
          
          console.log(
            `%c${severity}: %c${count} issues`,
            `font-weight: bold; color: ${severityColor}`,
            'font-weight: normal;'
          );
        });
        
        // Detailed issues
        if (config.verbose) {
          console.group('Detailed Issues:');
          filteredViolations.forEach(violation => {
            console.group(
              `%c${violation.impact?.toUpperCase() || 'ISSUE'}: %c${violation.help}`,
              `font-weight: bold; color: ${violation.impact === 'critical' 
                ? '#d63031' 
                : violation.impact === 'serious' 
                  ? '#e17055' 
                  : violation.impact === 'moderate' 
                    ? '#fdcb6e' 
                    : '#74b9ff'}`,
              'font-weight: normal;'
            );
            
            console.log('Description:', violation.description);
            console.log('Impact:', violation.impact);
            console.log('Help URL:', violation.helpUrl);
            
            // List affected elements
            if (violation.nodes.length > 0) {
              console.group('Affected Elements:');
              violation.nodes.forEach(node => {
                console.log(node.html);
                console.log('Element:', node.target);
                
                // If auto-fix is enabled, try to fix simple issues
                if (config.autoFix) {
                  tryToFix(violation.id, node);
                }
              });
              console.groupEnd();
            }
            
            console.groupEnd();
          });
          console.groupEnd();
        } else {
          // Just output a simple list of issues with suggestions
          filteredViolations.forEach(violation => {
            const severityIndicator = {
              critical: '🚨',
              serious: '⚠️',
              moderate: '⚠️',
              minor: 'ℹ️',
              unknown: 'ℹ️'
            }[violation.impact || 'unknown'];
            
            console.log(
              `%c${severityIndicator} ${violation.help}`,
              `font-weight: bold; color: ${violation.impact === 'critical' 
                ? '#d63031' 
                : violation.impact === 'serious' 
                  ? '#e17055' 
                  : violation.impact === 'moderate' 
                    ? '#fdcb6e' 
                    : '#74b9ff'}`
            );
            
            // Try to fix simple issues
            if (config.autoFix) {
              violation.nodes.forEach(node => {
                tryToFix(violation.id, node);
              });
            }
          });
        }
        
        console.log('To fix these issues, see documentation at: https://dequeuniversity.com/rules/axe/4.4');
        console.groupEnd();
      }
    } else {
      // No issues found
      console.log('%c✅ No accessibility issues detected', 'color: #00b894; font-weight: bold;');
    }
  } catch (error) {
    console.error('Error running accessibility audit:', error);
  }
};

/**
 * Attempt to automatically fix simple accessibility issues
 * @param ruleId The axe rule ID of the violation
 * @param node The affected node information
 */
function tryToFix(ruleId: string, node: any): void {
  try {
    // Find the elements that need fixing
    const elements = document.querySelectorAll(node.target.join(' '));
    
    if (elements.length === 0) {
      return;
    }
    
    elements.forEach(element => {
      // Handle different types of accessibility issues
      switch (ruleId) {
        case 'image-alt':
          // Fix missing alt attributes on images
          if (element instanceof HTMLImageElement && !element.alt) {
            const possibleText = element.getAttribute('src')?.split('/').pop()?.split('.')[0] || 'image';
            element.alt = `${possibleText} (auto-fixed)`;
            console.log(`%c🔧 Auto-fixed: Added alt text to image`, 'color: #00b894');
          }
          break;
        
        case 'button-name':
          // Fix buttons with no accessible name
          if (element instanceof HTMLButtonElement && !element.textContent?.trim()) {
            if (element.querySelector('svg, img')) {
              // It's likely an icon button
              const buttonType = element.getAttribute('type') || 'button';
              element.setAttribute('aria-label', `${buttonType} button (auto-fixed)`);
              console.log(`%c🔧 Auto-fixed: Added aria-label to button`, 'color: #00b894');
            }
          }
          break;
        
        case 'label':
        case 'label-title-only':
          // Fix form controls without labels
          if (element instanceof HTMLInputElement) {
            const id = element.id || `auto-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            if (!element.id) {
              element.id = id;
            }
            
            // Check if there's already a label
            const existingLabel = document.querySelector(`label[for="${id}"]`);
            if (!existingLabel) {
              // Create a label
              const label = document.createElement('label');
              label.setAttribute('for', id);
              
              // Try to find a sensible label from placeholder or name
              const labelText = element.placeholder || element.name || element.id || 'Form field';
              label.textContent = `${labelText.charAt(0).toUpperCase() + labelText.slice(1)} (auto-fixed)`;
              
              // Insert before the element
              element.parentNode?.insertBefore(label, element);
              console.log(`%c🔧 Auto-fixed: Added label to form control`, 'color: #00b894');
            }
          } else if (element instanceof HTMLSelectElement) {
            const id = element.id || `auto-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            if (!element.id) {
              element.id = id;
            }
            
            // Check if there's already a label
            const existingLabel = document.querySelector(`label[for="${id}"]`);
            if (!existingLabel) {
              // Create a label
              const label = document.createElement('label');
              label.setAttribute('for', id);
              
              // Try to find a sensible label from name
              const labelText = element.name || element.id || 'Select field';
              label.textContent = `${labelText.charAt(0).toUpperCase() + labelText.slice(1)} (auto-fixed)`;
              
              // Insert before the element
              element.parentNode?.insertBefore(label, element);
              console.log(`%c🔧 Auto-fixed: Added label to select control`, 'color: #00b894');
            }
          } else if (element instanceof HTMLTextAreaElement) {
            const id = element.id || `auto-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            if (!element.id) {
              element.id = id;
            }
            
            // Check if there's already a label
            const existingLabel = document.querySelector(`label[for="${id}"]`);
            if (!existingLabel) {
              // Create a label
              const label = document.createElement('label');
              label.setAttribute('for', id);
              
              // Try to find a sensible label from placeholder or name
              const labelText = element.placeholder || element.name || element.id || 'Text area';
              label.textContent = `${labelText.charAt(0).toUpperCase() + labelText.slice(1)} (auto-fixed)`;
              
              // Insert before the element
              element.parentNode?.insertBefore(label, element);
              console.log(`%c🔧 Auto-fixed: Added label to textarea`, 'color: #00b894');
            }
          }
          break;
        
        case 'color-contrast':
          // We can't easily fix contrast issues automatically, just log them
          console.log(`%c⚠️ Contrast issue detected: ${element.outerHTML}`, 'color: #fdcb6e');
          break;
          
        case 'heading-order':
          // We can't fix heading order easily
          console.log(`%c⚠️ Heading order issue: ${element.outerHTML}`, 'color: #fdcb6e');
          break;
        
        // Add more automatic fixes as needed
      }
    });
  } catch (error) {
    console.error('Error trying to fix accessibility issue:', error);
  }
}

/**
 * Create a HOC that wraps a component with accessibility audit
 * @param Component The component to wrap
 * @param options Accessibility audit options
 */
export function withAccessibilityAudit<P>(
  Component: React.ComponentType<P>,
  options: AuditOptions = defaultOptions
): React.ComponentType<P> {
  // Only wrap in development mode
  if (import.meta.env.PROD) {
    return Component;
  }
  
  // Return a wrapped component that runs the audit
  const AccessibilityAuditWrapper: React.FC<P> = (props) => {
    React.useEffect(() => {
      // Wait for component to fully render
      const timeoutId = setTimeout(() => {
        runAccessibilityAudit(options);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }, []);
    
    return React.createElement(Component, props);
  };
  
  return AccessibilityAuditWrapper;
}