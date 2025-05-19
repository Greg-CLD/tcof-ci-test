/**
 * E2E test for custom task persistence in the Checklist
 * 
 * Tests that:
 * 1. Create a custom task via UI
 * 2. Confirm it appears and is filterable
 * 3. Reload and check persistence
 * 4. Delete via UI and confirm it is removed after reload
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Custom Task Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
    
    // Navigate to the checklist page of the test project
    await page.goto('/projects/bc55c1a2-0cdf-4108-aa9e-44b44baea3b8/checklist');
    
    // Wait for the checklist page to load
    await page.waitForSelector('[data-testid="checklist-page"]');
  });
  
  test('should create, persist, and delete custom tasks correctly', async ({ page }) => {
    // Generate a unique task name to avoid conflicts with existing tasks
    const customTaskName = `Test Custom Task ${Date.now()}`;
    
    // Step 1: Create a new custom task
    // Click the "Add Custom Task" button
    await page.click('[data-testid="add-custom-task-button"]');
    
    // Fill in the task creation form
    await page.fill('[data-testid="task-name-input"]', customTaskName);
    await page.selectOption('[data-testid="task-stage-select"]', 'identification');
    
    // Submit the form
    await page.click('[data-testid="create-task-submit"]');
    
    // Step 2: Confirm the task appears in the UI
    // Wait for the task to appear in the list
    const taskElement = page.locator(`text=${customTaskName}`);
    await expect(taskElement).toBeVisible();
    
    // Confirm it's correctly identified as a custom task
    // Check if the custom task indicator is present
    const customIndicator = taskElement.locator('xpath=./ancestor::li//[data-testid="custom-task-indicator"]');
    await expect(customIndicator).toBeVisible();
    
    // Test filtering - select only custom tasks
    await page.selectOption('[data-testid="task-filter-select"]', 'custom');
    
    // Verify our task is still visible after filtering
    await expect(taskElement).toBeVisible();
    
    // Step 3: Reload the page and check persistence
    await page.reload();
    
    // Wait for the page to reload
    await page.waitForSelector('[data-testid="checklist-page"]');
    
    // Apply the custom filter again
    await page.selectOption('[data-testid="task-filter-select"]', 'custom');
    
    // Verify our task is still there after reload
    const taskElementAfterReload = page.locator(`text=${customTaskName}`);
    await expect(taskElementAfterReload).toBeVisible();
    
    // Step 4: Delete the task
    // Click the delete button on our task
    await taskElementAfterReload.locator('[data-testid="delete-task-button"]').click();
    
    // Confirm the deletion in the modal
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify the task is no longer visible
    await expect(taskElementAfterReload).not.toBeVisible({timeout: 5000});
    
    // Reload the page again
    await page.reload();
    
    // Wait for the page to reload
    await page.waitForSelector('[data-testid="checklist-page"]');
    
    // Apply the custom filter again
    await page.selectOption('[data-testid="task-filter-select"]', 'custom');
    
    // Verify the task is still not visible after reload
    await expect(page.locator(`text=${customTaskName}`)).not.toBeVisible({timeout: 5000});
  });
});