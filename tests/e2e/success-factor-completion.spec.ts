
import { test, expect } from '@playwright/test';

test('Success factor task completion persists after refresh', async ({ page }) => {
  // Create test project and navigate to checklist
  await page.goto('/checklist');
  
  // Find and complete a success factor task
  const factorTask = page.locator('[data-origin="factor"]').first();
  await factorTask.click();
  
  // Verify task shows as completed
  await expect(factorTask).toBeChecked();
  
  // Refresh page
  await page.reload();
  
  // Verify task remains completed 
  await expect(factorTask).toBeChecked();
});
