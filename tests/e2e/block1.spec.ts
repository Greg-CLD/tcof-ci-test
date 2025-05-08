import { test, expect } from '@playwright/test';
import { dbHelper } from './helpers/db-helper';

// Test project ID to use for tests - using an existing valid project ID
const TEST_PROJECT_ID = 3;

// Test constants
const RESONANCE_EMOJI_INDEX = 2; // 3rd emoji (index 2)

test.describe('Block 1 - Success Factor Ratings', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    // We're already logged in based on the logs, so we can proceed
  });
  
  test('should save and persist resonance ratings', async ({ page }) => {
    // Navigate to the Block 1 page
    await page.goto(`/make-a-plan/${TEST_PROJECT_ID}/block-1`);
    
    // Wait for the page to load - the success factors should be visible
    await page.waitForSelector('h1:has-text("Block 1")');
    
    // Get the list of success factor cards
    const factorCards = page.locator('.border.rounded-lg.mb-4');
    const count = await factorCards.count();
    expect(count).toBeGreaterThan(0);
    
    // Get the first success factor card
    const firstFactorCard = factorCards.first();
    
    // Extract the factor ID (will be in a data attribute or can be determined from context)
    // For our test, we'll use a known factor ID
    const factorId = "sf-1"; // This is a placeholder - adjust as needed
    
    // Find the resonance emojis section in the first card
    const resonanceSection = firstFactorCard.locator('.flex.flex-wrap.gap-2').first();
    
    // Click the 3rd resonance emoji (index 2)
    const emojis = resonanceSection.locator('button');
    await expect(emojis).toHaveCount(5); // There should be 5 emoji options
    await emojis.nth(RESONANCE_EMOJI_INDEX).click();
    
    // The emoji should now have the selected state
    await expect(emojis.nth(RESONANCE_EMOJI_INDEX)).toHaveClass(/selected/);
    
    // Click Save All button
    await page.locator('button:has-text("Save All")').click();
    
    // Wait for the save confirmation toast
    await page.waitForSelector('div[role="status"]:has-text("Success")');
    
    // Refresh the page to check persistence
    await page.reload();
    
    // Wait for the page to load again
    await page.waitForSelector('h1:has-text("Block 1")');
    
    // Get the first factor card again
    const firstFactorCardAfterReload = page.locator('.border.rounded-lg.mb-4').first();
    
    // Find the resonance emojis section
    const resonanceSectionAfterReload = firstFactorCardAfterReload.locator('.flex.flex-wrap.gap-2').first();
    
    // Check that the 3rd emoji is still selected
    const emojisAfterReload = resonanceSectionAfterReload.locator('button');
    await expect(emojisAfterReload.nth(RESONANCE_EMOJI_INDEX)).toHaveClass(/selected/);
    
    // Query the database to verify the data was persisted
    const ratings = await dbHelper.getSuccessFactorRatings(TEST_PROJECT_ID);
    
    // Find the rating for our factor
    const factorRating = ratings.find(rating => rating.factorId === factorId);
    
    // Verify the rating matches what we selected (index 2 = resonance value 3)
    expect(factorRating).toBeTruthy();
    if (factorRating) {
      expect(factorRating.resonance).toBe(RESONANCE_EMOJI_INDEX + 1);
    }
  });
});