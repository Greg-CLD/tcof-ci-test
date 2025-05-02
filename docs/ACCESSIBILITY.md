# Accessibility Audit System

This document describes the accessibility audit system implemented in the Confluity TCOF Toolkit application.

## Overview

The accessibility audit system is designed to help developers identify and fix accessibility issues during development. It uses [axe-core](https://github.com/dequelabs/axe-core) to analyze the application's DOM and report accessibility violations.

The system includes:
- Automatic scanning of pages as you navigate the application
- Real-time feedback in the browser console
- Automatic fixes for common issues
- Documentation for more complex issues that need manual intervention

## Important: Development Mode Only

This system is designed to run **only in development mode**. It will not be included in production builds, ensuring it has no impact on performance for end users.

## How to Use

1. Start the application in development mode
2. Navigate through the application as normal
3. Open your browser's console to see accessibility audit results
4. Fix issues as they are reported

## Automated Checks

The system automatically checks for:

- Missing alt text on images
- Color contrast issues
- Missing form labels
- ARIA attribute usage
- Heading hierarchy
- Landmark regions
- And many more issues

## Automatic Fixes

The system will attempt to automatically fix simple issues:

- Adding alt text to images
- Adding labels to form controls
- Adding aria-labels to icon buttons
- And other basic fixes

## Manual Fixes Required

Some issues require manual intervention. These will be reported in the console with links to documentation. Common issues include:

- Complex widgets that need proper ARIA roles and states
- Keyboard navigation issues
- Focus management for modals and dialogs
- Color contrast issues that require design changes

## TODO Reference

See the file `client/src/lib/a11y-todos.ts` for a reference of TODOs and more complex accessibility issues that should be addressed in the codebase.

## Configuration

The accessibility audit system can be configured via the `A11yAuditProvider` component in `App.tsx`:

```jsx
<A11yAuditProvider 
  disabled={false} // Set to true to disable audits completely
  skipRoutes={['/auth']} // Routes to skip from auditing
  throttleMs={3000} // Minimum delay between audits
>
  {/* Application content */}
</A11yAuditProvider>
```

## Best Practices

- Fix issues as they are reported rather than letting them accumulate
- Prioritize critical and serious issues first
- Reference the [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) for best practices
- Test with keyboard-only navigation regularly
- Consider testing with a screen reader for critical user flows

## Resources

- [axe-core Documentation](https://github.com/dequelabs/axe-core/tree/master/doc)
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Deque University](https://dequeuniversity.com/)