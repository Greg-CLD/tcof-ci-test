/**
 * E2E test for task completion persistence in the Checklist
 * 
 * Tests that:
 * 1. Navigate to the checklist page
 * 2. Mark a SuccessFactor task as complete via the UI
 * 3. Confirm the completion status in the UI
 * 4. Reload the page and verify the completion status persists
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Task Completion Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
    
    // Navigate to the checklist page of the test project
    await page.goto('/projects/bc55c1a2-0cdf-4108-aa9e-44b44baea3b8/checklist');
    
    // Wait for the checklist page to load
    await page.waitForSelector('[data-testid="checklist-page"]');
  });
  
  test('should persist completion status for SuccessFactor tasks after page reload', async ({ page }) => {
    // Filter for success factor tasks to make it easier to find one
    await page.selectOption('[data-testid="task-filter-select"]', 'success-factor');
    
    // Wait for the filtered task list to load
    await page.waitForSelector('[data-testid="task-item"]');
    
    // Get the first uncompleted success factor task
    const uncompletedTask = page.locator('[data-testid="task-item"]:not([data-completed="true"])').first();
    
    // Store the task name for verification later
    const taskName = await uncompletedTask.locator('[data-testid="task-name"]').textContent();
    
    // Check if we found a task
    expect(taskName).toBeTruthy();
    console.log(`Testing with task: ${taskName}`);
    
    // Mark the task as complete by clicking the checkbox
    await uncompletedTask.locator('[data-testid="task-checkbox"]').click();
    
    // Verify the task is now marked as completed in the UI
    await expect(page.locator(`[data-testid="task-item"]:has-text("${taskName}")`)).toHaveAttribute('data-completed', 'true');
    
    // Wait a moment for the update to be processed
    await page.waitForTimeout(1000);
    
    // Reload the page
    await page.reload();
    
    // Wait for the page to reload and tasks to appear
    await page.waitForSelector('[data-testid="checklist-page"]');
    
    // Apply the same filter again
    await page.selectOption('[data-testid="task-filter-select"]', 'success-factor');
    
    // Find the same task by name
    const taskAfterReload = page.locator(`[data-testid="task-item"]:has-text("${taskName}")`);
    
    // Verify the task still exists
    await expect(taskAfterReload).toBeVisible();
    
    // Verify the task is still marked as completed
    await expect(taskAfterReload).toHaveAttribute('data-completed', 'true');
    
    // Verify the checkbox is checked
    await expect(taskAfterReload.locator('[data-testid="task-checkbox"]')).toBeChecked();
    
    // Bonus: Uncheck the task to clean up after test
    await taskAfterReload.locator('[data-testid="task-checkbox"]').click();
    
    // Verify it was unchecked
    await expect(taskAfterReload).toHaveAttribute('data-completed', 'false');
    await expect(taskAfterReload.locator('[data-testid="task-checkbox"]')).not.toBeChecked();
  });
});