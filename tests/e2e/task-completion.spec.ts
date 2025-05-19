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

// Import debug flags - when used on client side, they would come from shared/constants.debug
const DEBUG_TASK_VALIDATION = true; // Enable for E2E test runs
const DEBUG_TASK_PERSISTENCE = true; // Enable for E2E test runs

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
    // Validate the initial checklist page state
    await expect(page.locator('[data-testid="checklist-page"]')).toBeVisible();
    if (DEBUG_TASK_VALIDATION) {
      console.log('[DEBUG_TASK_VALIDATION] Checklist page loaded successfully');
    }
    
    // Filter for success factor tasks to make it easier to find one
    await page.selectOption('[data-testid="task-filter-select"]', 'success-factor');
    
    // Verify filter is applied correctly
    await expect(page.locator('[data-testid="task-filter-select"]')).toHaveValue('success-factor');
    if (DEBUG_TASK_VALIDATION) {
      console.log('[DEBUG_TASK_VALIDATION] Filter applied successfully: success-factor');
    }
    
    // Wait for the filtered task list to load
    await page.waitForSelector('[data-testid="task-item"]');
    
    // Count tasks to ensure we have some to test with
    const taskCount = await page.locator('[data-testid="task-item"]').count();
    if (DEBUG_TASK_VALIDATION) {
      console.log(`[DEBUG_TASK_VALIDATION] Found ${taskCount} success factor tasks`);
    }
    expect(taskCount).toBeGreaterThan(0);
    
    // Get the first uncompleted success factor task
    const uncompletedTask = page.locator('[data-testid="task-item"]:not([data-completed="true"])').first();
    
    // Store the task name and verify we can extract it properly
    const taskName = await uncompletedTask.locator('[data-testid="task-name"]').textContent();
    const taskId = await uncompletedTask.getAttribute('data-task-id');
    
    // Check if we found a task with valid properties
    expect(taskName).toBeTruthy();
    if (DEBUG_TASK_VALIDATION) {
      console.log(`[DEBUG_TASK_VALIDATION] Selected task for testing:`);
      console.log(`[DEBUG_TASK_VALIDATION]  - Name: ${taskName}`);
      console.log(`[DEBUG_TASK_VALIDATION]  - ID: ${taskId}`);
      console.log(`[DEBUG_TASK_VALIDATION]  - Initial completion state: false`);
    }
    
    // Mark the task as complete by clicking the checkbox
    await uncompletedTask.locator('[data-testid="task-checkbox"]').click();
    
    // Verify the task is now marked as completed in the UI
    await expect(page.locator(`[data-testid="task-item"]:has-text("${taskName}")`)).toHaveAttribute('data-completed', 'true');
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`[DEBUG_TASK_PERSISTENCE] Task marked as completed in UI`);
    }
    
    // Wait a moment for the update to be processed and saved to the database
    await page.waitForTimeout(1000);
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`[DEBUG_TASK_PERSISTENCE] Waiting for persistence operation to complete`);
    }
    
    // Reload the page to test persistence
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`[DEBUG_TASK_PERSISTENCE] Reloading page to verify persistence`);
    }
    await page.reload();
    
    // Wait for the page to reload and tasks to appear
    await page.waitForSelector('[data-testid="checklist-page"]');
    if (DEBUG_TASK_VALIDATION) {
      console.log('[DEBUG_TASK_VALIDATION] Page reloaded successfully');
    }
    
    // Apply the same filter again
    await page.selectOption('[data-testid="task-filter-select"]', 'success-factor');
    await expect(page.locator('[data-testid="task-filter-select"]')).toHaveValue('success-factor');
    if (DEBUG_TASK_VALIDATION) {
      console.log('[DEBUG_TASK_VALIDATION] Filter re-applied after reload: success-factor');
    }
    
    // Find the same task by name
    const taskAfterReload = page.locator(`[data-testid="task-item"]:has-text("${taskName}")`);
    
    // Verify the task still exists after reload
    await expect(taskAfterReload).toBeVisible();
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`[DEBUG_TASK_PERSISTENCE] Task found after reload`);
    }
    
    // Check if the task's ID matches what we had before reload
    const reloadedTaskId = await taskAfterReload.getAttribute('data-task-id');
    if (DEBUG_TASK_VALIDATION) {
      console.log(`[DEBUG_TASK_VALIDATION] Checking task identity consistency after reload:`);
      console.log(`[DEBUG_TASK_VALIDATION]  - Name matches: ${await taskAfterReload.locator('[data-testid="task-name"]').textContent() === taskName}`);
      console.log(`[DEBUG_TASK_VALIDATION]  - ID consistent: ${reloadedTaskId === taskId}`);
    }
    expect(reloadedTaskId).toBe(taskId);
    
    // Verify the task is still marked as completed after reload
    await expect(taskAfterReload).toHaveAttribute('data-completed', 'true');
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`[DEBUG_TASK_PERSISTENCE] Task completion status persisted after reload: true`);
    }
    
    // Verify the checkbox is checked
    await expect(taskAfterReload.locator('[data-testid="task-checkbox"]')).toBeChecked();
    
    // Bonus: Uncheck the task to clean up after test
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`[DEBUG_TASK_PERSISTENCE] Cleaning up - resetting task to uncompleted state`);
    }
    await taskAfterReload.locator('[data-testid="task-checkbox"]').click();
    
    // Verify it was unchecked
    await expect(taskAfterReload).toHaveAttribute('data-completed', 'false');
    await expect(taskAfterReload.locator('[data-testid="task-checkbox"]')).not.toBeChecked();
    if (DEBUG_TASK_PERSISTENCE) {
      console.log(`[DEBUG_TASK_PERSISTENCE] Task reset successful, completion status is now: false`);
    }
  });
});