import { test, expect } from '@playwright/test';

/**
 * Task Ownership E2E Test
 * 
 * This test verifies the Task Ownership functionality:
 * 1. Login as demo user
 * 2. Create a project & task with no owner
 * 3. Visit checklist → see warning icon
 * 4. Set owner; icon disappears on reload
 * 5. Click "Send via Email"; verify mailto link contains task text
 */
test('Task ownership workflow', async ({ page }) => {
  // 1. Log in as demo user
  await page.goto('/login');
  await page.fill('[data-testid="username-input"]', 'demo@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  
  // Verify login was successful - check for Dashboard element
  await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  
  // 2. Create a new project
  await page.click('[data-testid="new-project-button"]');
  const projectName = `Test Project ${new Date().toISOString()}`;
  await page.fill('[data-testid="project-name-input"]', projectName);
  await page.selectOption('[data-testid="project-sector-select"]', 'education');
  await page.selectOption('[data-testid="project-org-type-select"]', 'education');
  await page.selectOption('[data-testid="project-team-size-select"]', 'small');
  await page.selectOption('[data-testid="project-stage-select"]', 'identify');
  await page.click('[data-testid="create-project-button"]');
  
  // Navigate to checklist
  await page.click('[data-testid="checklist-link"]');
  
  // Create a task with no owner
  await page.click('[data-testid="add-task-button"]');
  const taskText = `Test Task ${new Date().toISOString()}`;
  await page.fill('[data-testid="task-text-input"]', taskText);
  await page.click('[data-testid="save-task-button"]');
  
  // 3. Verify the warning icon appears for the unassigned task
  const warningIcon = page.locator('.task-card:has-text("' + taskText + '")').locator('.warning-icon');
  await expect(warningIcon).toBeVisible();
  
  // Verify tooltip on hover
  await warningIcon.hover();
  await expect(page.locator('text=Assign an owner to this task')).toBeVisible();
  
  // 4. Set owner for the task
  await page.click('.task-card:has-text("' + taskText + '")');
  await page.fill('[data-testid="task-owner-input"]', 'John Doe');
  await page.click('[data-testid="save-task-button"]');
  
  // Verify warning icon disappears after setting owner
  await expect(warningIcon).not.toBeVisible();
  
  // Reload the page and verify warning icon is still gone
  await page.reload();
  await expect(page.locator('.task-card:has-text("' + taskText + '")').locator('.warning-icon')).not.toBeVisible();
  
  // 5. Verify "Send via Email" functionality
  await page.click('.task-card:has-text("' + taskText + '")');
  
  // Mock window.location.href to capture mailto URL
  await page.evaluate(() => {
    const originalLocation = window.location;
    // @ts-ignore - This is necessary for the test
    delete window.location;
    window.location = { ...originalLocation };
    
    // Override the href setter to capture the mailto URL
    let capturedMailto = '';
    Object.defineProperty(window.location, 'href', {
      set: function(url) {
        if (url.startsWith('mailto:')) {
          capturedMailto = url;
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
  
  // Click the email button
  await page.click('[data-testid="send-via-email-button"]');
  
  // Check the captured mailto URL
  const mailtoUrl = await page.evaluate(() => {
    // @ts-ignore - Accessing the property we set above
    return window.__capturedMailto || '';
  });
  
  expect(mailtoUrl).toContain('subject=Task%20Assignment');
  expect(mailtoUrl).toContain(encodeURIComponent(taskText));
  expect(mailtoUrl).toContain('John%20Doe');
});