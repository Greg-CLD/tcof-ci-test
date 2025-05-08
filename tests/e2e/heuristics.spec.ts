import { test, expect } from '@playwright/test';
import { dbHelper } from './helpers/db-helper';

// Test project ID to use for tests - using an existing valid project ID
const TEST_PROJECT_ID = 3;

// Test data
const TEST_HEURISTIC = 'Test Heuristic for E2E Testing';

test.describe('Block 1 Step 2 - Personal Heuristics', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    // We're already logged in based on the logs, so we can proceed
  });
  
  test('should add, save and persist personal heuristics', async ({ page }) => {
    // Navigate to the Block 1 Step 2 page
    await page.goto(`/make-a-plan/${TEST_PROJECT_ID}/block-1/step-2`);
    
    // Wait for the page to load
    await page.waitForSelector('h2:has-text("Custom Heuristics Builder")');
    
    // Add a new personal heuristic
    await page.fill('input[placeholder="Enter a custom heuristic..."]', TEST_HEURISTIC);
    
    // Click the Add Heuristic button
    await page.click('button:has-text("Add Heuristic")');
    
    // Wait for the confirmation toast
    await page.waitForSelector('div[role="status"]:has-text("Adding heuristic")');
    
    // Verify the heuristic appears in the UI
    await expect(page.locator(`li:has-text("${TEST_HEURISTIC}")`)).toBeVisible();
    
    // Save the heuristics
    await page.click('button:has-text("Save Heuristics")');
    
    // Wait for the save confirmation toast
    await page.waitForSelector('div[role="status"]:has-text("Heuristics saved")');
    
    // Refresh the page to check persistence
    await page.reload();
    
    // Wait for the page to load again
    await page.waitForSelector('h2:has-text("Custom Heuristics Builder")');
    
    // Verify the heuristic still appears in the UI
    await expect(page.locator(`li:has-text("${TEST_HEURISTIC}")`)).toBeVisible();
    
    // Query the database to verify the data was persisted
    const heuristics = await dbHelper.getPersonalHeuristics(TEST_PROJECT_ID);
    
    // Convert heuristic objects to their name strings for simple comparison
    const heuristicNames = heuristics.map(h => {
      if (typeof h === 'string') return h;
      if (h && typeof h === 'object' && 'name' in h && typeof h.name === 'string') {
        return h.name;
      }
      return '';
    });
    
    // Verify our test heuristic is in the returned data
    expect(heuristicNames).toContain(TEST_HEURISTIC);
    
    // Remove the heuristic to clean up
    const heuristicItem = page.locator(`li:has-text("${TEST_HEURISTIC}")`);
    await heuristicItem.locator('button[aria-label="Remove heuristic"]').click();
    
    // Wait for the removal confirmation toast
    await page.waitForSelector('div[role="status"]:has-text("Removing heuristic")');
    
    // Save the updated heuristics
    await page.click('button:has-text("Save Heuristics")');
    
    // Wait for the save confirmation toast
    await page.waitForSelector('div[role="status"]:has-text("Heuristics saved")');
    
    // Verify the heuristic is no longer in the UI
    await expect(page.locator(`li:has-text("${TEST_HEURISTIC}")`)).not.toBeVisible();
  });
});