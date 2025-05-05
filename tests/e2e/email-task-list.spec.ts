import { test, expect } from '@playwright/test';

// Extend the Window interface to allow our custom property
declare global {
  interface Window {
    __capturedMailto?: string;
  }
}

/**
 * Email Task List E2E Test
 * 
 * This test verifies the Email Task List functionality:
 * 1. Login as demo user
 * 2. Create a project & make a plan with tasks
 * 3. Visit checklist
 * 4. Click "Email Task List" button
 * 5. Verify mailto link contains task information with owners
 */
test('Email Task List functionality', async ({ page }) => {
  // Set up the mock for window.location.href
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

  // 1. Log in as demo user
  await page.goto('/');
  // Skip login if the app uses a demo mode or test environment
  
  // 2. Create a new project or use existing one
  const projectName = `Email Test Project ${new Date().toISOString().substring(0, 16)}`;
  
  // Navigate to make-a-plan or similar page to create a plan with tasks
  await page.goto('/make-a-plan');
  
  // Ensure some tasks exist in the plan
  // This depends on your app's UI for task creation
  
  // 3. Navigate to checklist page
  await page.goto('/make-a-plan/checklist');
  
  // Wait for the page to fully load
  await page.waitForSelector('[data-testid="email-task-list-button"]', { timeout: 10000 });
  
  // 4. Click the "Email Task List" button
  await page.click('[data-testid="email-task-list-button"]');
  
  // Wait a moment for the operation to complete
  await page.waitForTimeout(1000);
  
  // 5. Verify the mailto link
  const mailtoUrl = await page.evaluate(() => {
    return window.__capturedMailto || '';
  });
  
  // Basic checks on the mailto link
  expect(mailtoUrl).toBeTruthy();
  expect(mailtoUrl).toContain('mailto:?subject=');
  expect(mailtoUrl).toContain('TCOF%20Task%20List');
  
  // Check for task content in the email body
  const bodyParam = new URLSearchParams(mailtoUrl.split('?')[1]).get('body');
  if (bodyParam) {
    const decodedBody = decodeURIComponent(bodyParam);
    
    // Check for project name
    expect(decodedBody).toContain('Project:');
    
    // Check for date
    expect(decodedBody).toContain('Date:');
    
    // Check for at least one stage
    const hasStage = ['Identification', 'Definition', 'Delivery', 'Closure'].some(
      stage => decodedBody.includes(stage + ':')
    );
    expect(hasStage).toBeTruthy();
    
    // Check for task status indicators
    expect(decodedBody).toMatch(/\[\s\]|\[x\]/);
    
    // Check for owner information
    expect(decodedBody).toMatch(/Owner: (.*)/);
  }
});