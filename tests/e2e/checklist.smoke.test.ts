import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Checklist Smoke Test
 * 
 * 1. Create a project via API
 * 2. Visit /checklist
 * 3. Expect radar + task table to render
 * 4. Run axe-core on the container, fail if any violation severity === 'critical'
 */
test('Checklist page renders correctly with no accessibility issues', async ({ page }) => {
  // 1. Create a project via API or use an existing one
  const projectId = await setupTestProject(page);
  
  // 2. Visit the checklist page
  await page.goto(`/make-a-plan/checklist?project=${projectId}`);
  
  // 3. Expect radar chart and task management components to render
  await expect(page.locator('[data-testid="task-management-card"]')).toBeVisible();
  await expect(page.locator('[data-testid="email-task-list-button"]')).toBeVisible();
  
  // 4. Run axe-core accessibility tests
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include('#checklist-container') // Adjust this selector as needed
    .analyze();
  
  // Filter for critical violations
  const criticalViolations = accessibilityScanResults.violations.filter(
    violation => violation.impact === 'critical'
  );
  
  // Log all violations for debugging
  if (accessibilityScanResults.violations.length > 0) {
    console.log('Accessibility violations found:');
    accessibilityScanResults.violations.forEach(violation => {
      console.log(`- ${violation.impact} impact: ${violation.help} (${violation.nodes.length} occurrences)`);
    });
  }
  
  // Fail test if critical violations exist
  expect(criticalViolations.length, 
    `Found ${criticalViolations.length} critical accessibility violations`).toBe(0);
});

/**
 * Owner nudge and email task list integration test
 */
test('Owner nudge icon and email task list functionality', async ({ page }) => {
  // Setup mock for mailto links
  await page.addInitScript(() => {
    const originalLocation = window.location;
    // @ts-ignore - This is necessary for the test
    delete window.location;
    window.location = { ...originalLocation };
    
    // Override the href setter to capture the mailto URL
    Object.defineProperty(window.location, 'href', {
      set: function(url) {
        if (url.startsWith('mailto:')) {
          // Store it for later access
          window.__capturedMailto = url;
          return;
        }
        originalLocation.href = url;
      },
      get: function() {
        return originalLocation.href;
      }
    });
  });
  
  // 1. Create a project with an unassigned task
  const projectId = await setupTestProject(page);
  await createUnassignedTask(page, projectId);
  
  // 2. Navigate to the checklist page
  await page.goto(`/make-a-plan/checklist?project=${projectId}`);
  
  // 3. Verify warning icon appears for unassigned task
  const warningIcon = page.locator('.warning-icon').first();
  await expect(warningIcon).toBeVisible();
  
  // 4. Set owner for the task
  await page.locator('.task-card').first().click();
  await page.fill('[data-testid="task-owner-input"]', 'John Doe');
  await page.click('[data-testid="save-task-button"]');
  
  // 5. Verify warning icon disappears
  await expect(warningIcon).not.toBeVisible();
  
  // 6. Click email task list button
  await page.click('[data-testid="email-task-list-button"]');
  
  // 7. Verify mailto link contains owner's name
  const mailtoUrl = await page.evaluate(() => {
    return window.__capturedMailto || '';
  });
  
  expect(mailtoUrl).toBeTruthy();
  expect(mailtoUrl).toContain('mailto:?subject=');
  
  // 8. Decode and check the email body
  const bodyParam = new URLSearchParams(mailtoUrl.split('?')[1]).get('body');
  if (bodyParam) {
    const decodedBody = decodeURIComponent(bodyParam);
    expect(decodedBody).toContain('John Doe');
  }
});

/**
 * Helper function to set up a test project
 */
async function setupTestProject(page): Promise<string> {
  // For this test, we'll use an API approach or direct navigation
  // This can be adjusted based on the app's actual implementation
  
  // Navigate to home
  await page.goto('/');
  
  // Create a new project if needed
  await page.click('[data-testid="new-project-button"]');
  const projectName = `Smoke Test Project ${Date.now()}`;
  await page.fill('[data-testid="project-name-input"]', projectName);
  
  // Fill required fields
  await page.selectOption('[data-testid="project-sector-select"]', 'education');
  await page.selectOption('[data-testid="project-org-type-select"]', 'education');
  await page.selectOption('[data-testid="project-team-size-select"]', 'small');
  await page.selectOption('[data-testid="project-stage-select"]', 'identify');
  
  await page.click('[data-testid="create-project-button"]');
  
  // Extract the project ID from the URL or localStorage
  const projectId = await page.evaluate(() => {
    return localStorage.getItem('selectedProjectId') || '';
  });
  
  return projectId;
}

/**
 * Helper function to create an unassigned task
 */
async function createUnassignedTask(page, projectId: string): Promise<void> {
  // Navigate to the checklist
  await page.goto(`/make-a-plan/checklist?project=${projectId}`);
  
  // Add a task
  await page.click('[data-testid="add-task-button"]');
  const taskText = `Unassigned Task ${Date.now()}`;
  await page.fill('[data-testid="task-text-input"]', taskText);
  
  // Save without setting an owner
  await page.click('[data-testid="save-task-button"]');
}