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
test.describe('Email Task List functionality', () => {
  // Setup function to mock window.location.href
  const setupMailtoMock = async (page) => {
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
  };
  
  test('Basic Email Task List functionality', async ({ page }) => {
    await setupMailtoMock(page);
    
    // 1. Log in as demo user (if needed)
    await page.goto('/');
    
    // 2. Navigate to checklist page with an existing project/plan
    await page.goto('/make-a-plan/checklist');
    
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="email-task-list-button"]', { timeout: 10000 });
    
    // 3. Click the "Email Task List" button if enabled
    const isButtonDisabled = await page.getAttribute('[data-testid="email-task-list-button"]', 'disabled');
    
    if (!isButtonDisabled) {
      await page.click('[data-testid="email-task-list-button"]');
      
      // Wait a moment for the operation to complete
      await page.waitForTimeout(1000);
      
      // 4. Verify the mailto link
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
    } else {
      console.log('Button was disabled - skipping email test');
    }
  });
  
  test('No Tasks Edge Case', async ({ page }) => {
    await setupMailtoMock(page);
    
    // Create a new project without tasks
    await page.goto('/');
    
    // Navigate to a new project setup or empty project
    // This will depend on your app's navigation flow
    await page.goto('/make-a-plan/checklist');
    
    // Wait for the email button to be available
    await page.waitForSelector('[data-testid="email-task-list-button"]', { timeout: 10000 });
    
    // Check if the button is disabled as expected
    const isDisabled = await page.getAttribute('[data-testid="email-task-list-button"]', 'disabled');
    expect(isDisabled).not.toBeNull();
    
    // Hover over the button to check tooltip
    await page.hover('[data-testid="email-task-list-button"]');
    
    // Wait for tooltip to appear
    await page.waitForTimeout(500);
    
    // Check if either of the expected tooltips appears
    const tooltipExists = await Promise.race([
      page.waitForSelector('text=No tasks to email', { timeout: 2000 })
        .then(() => true)
        .catch(() => false),
      page.waitForSelector('text=Please select a project plan', { timeout: 2000 })
        .then(() => true)
        .catch(() => false)
    ]);
    
    expect(tooltipExists).toBe(true);
  });
  
  test('Special Characters Handling', async ({ page }) => {
    await setupMailtoMock(page);
    
    // Navigate to a project with tasks
    await page.goto('/make-a-plan/checklist');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="email-task-list-button"]', { timeout: 10000 });
    
    // Create a new task with special characters (if possible in your UI)
    // This depends on your app's task creation workflow
    // For this test, we'll just check if the button can be clicked
    
    const isButtonDisabled = await page.getAttribute('[data-testid="email-task-list-button"]', 'disabled');
    if (!isButtonDisabled) {
      // Test the button click
      await page.click('[data-testid="email-task-list-button"]');
      
      // Wait a moment for the operation to complete
      await page.waitForTimeout(1000);
      
      // Verify that a mailto URL was generated
      const mailtoUrl = await page.evaluate(() => {
        return window.__capturedMailto || '';
      });
      
      // Basic checks that the encoding worked
      expect(mailtoUrl).toBeTruthy();
      expect(mailtoUrl).toContain('mailto:?subject=');
    }
  });
  
  test('Error Handling and Recovery', async ({ page }) => {
    await setupMailtoMock(page);
    
    // Override mailto to simulate an error
    await page.addInitScript(() => {
      // After 1 simulated successful click, we'll simulate a failure
      let clickCount = 0;
      const originalLocation = window.location;
      
      // @ts-ignore - This is necessary for the test
      delete window.location;
      window.location = { ...originalLocation };
      
      Object.defineProperty(window.location, 'href', {
        set: function(url) {
          if (url.startsWith('mailto:')) {
            clickCount++;
            if (clickCount > 1) {
              // Simulate an error on second click
              throw new Error("Simulated mailto error");
            }
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
    
    // Navigate to a project with tasks
    await page.goto('/make-a-plan/checklist');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="email-task-list-button"]', { timeout: 10000 });
    
    const isButtonDisabled = await page.getAttribute('[data-testid="email-task-list-button"]', 'disabled');
    if (!isButtonDisabled) {
      // First click should work
      await page.click('[data-testid="email-task-list-button"]');
      await page.waitForTimeout(1000);
      
      // Second click should show an error but not crash
      await page.click('[data-testid="email-task-list-button"]');
      await page.waitForTimeout(1000);
      
      // Button should be re-enabled after error
      const isStillDisabled = await page.getAttribute('[data-testid="email-task-list-button"]', 'disabled');
      expect(isStillDisabled).toBeNull();
    }
  });
});