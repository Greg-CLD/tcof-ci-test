import { test, expect } from '@playwright/test';
import { dbHelper } from './helpers/db-helper';

// Test project ID to use for tests
const TEST_PROJECT_ID = 123;

// Test data
const TEST_HEURISTIC = 'Test Heuristic for E2E Testing';

test.describe('Block 1 Step 2 - Personal Heuristics', () => {
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
    await page.waitForSelector('div[role="status"]:has-text("Heuristic added")');
    
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
    
    // Verify our test heuristic is in the returned data
    expect(heuristics).toContain(TEST_HEURISTIC);
    
    // Remove the heuristic to clean up
    await page.click(`li:has-text("${TEST_HEURISTIC}") button[aria-label="Remove heuristic"]`);
    
    // Wait for the removal confirmation toast
    await page.waitForSelector('div[role="status"]:has-text("Heuristic removed")');
    
    // Save the updated heuristics (empty now)
    await page.click('button:has-text("Save Heuristics")');
    
    // Wait for the save confirmation toast
    await page.waitForSelector('div[role="status"]:has-text("Heuristics saved")');
    
    // Verify the heuristic is no longer in the UI
    await expect(page.locator(`li:has-text("${TEST_HEURISTIC}")`)).not.toBeVisible();
  });
});