import { test, expect } from '@playwright/test';
import { dbHelper } from './helpers/db-helper';

// Test project ID to use for tests
const TEST_PROJECT_ID = 123;

// Test constants
const RESONANCE_EMOJI_INDEX = 2; // 3rd emoji (index 2)

test.describe('Block 1 - Success Factor Ratings', () => {
  test('should save and persist resonance ratings', async ({ page }) => {
    // Navigate to the Block 1 page
    await page.goto(`/make-a-plan/${TEST_PROJECT_ID}/block-1`);
    
    // Wait for the page to load - the factor list should be visible
    await page.waitForSelector('.success-factor-item');
    
    // Get the first success factor item
    const firstFactorItem = await page.locator('.success-factor-item').first();
    
    // Get the factor ID from the data attribute
    const factorId = await firstFactorItem.getAttribute('data-factor-id');
    expect(factorId).toBeTruthy();
    
    // Click the 3rd resonance emoji for the first factor
    const emojisContainer = await firstFactorItem.locator('.resonance-emojis');
    const thirdEmoji = await emojisContainer.locator('button').nth(RESONANCE_EMOJI_INDEX);
    await thirdEmoji.click();
    
    // The emoji should now have the selected state
    await expect(thirdEmoji).toHaveClass(/selected/);
    
    // Click Save Progress button
    await page.locator('button:has-text("Save Progress")').click();
    
    // Wait for the save confirmation toast
    await page.waitForSelector('div[role="status"]:has-text("Success factors")');
    
    // Refresh the page to check persistence
    await page.reload();
    
    // Wait for the page to load again
    await page.waitForSelector('.success-factor-item');
    
    // Get the first factor item again
    const firstFactorItemAfterReload = await page.locator('.success-factor-item').first();
    
    // Check that the 3rd emoji is still selected
    const thirdEmojiAfterReload = await firstFactorItemAfterReload
      .locator('.resonance-emojis button')
      .nth(RESONANCE_EMOJI_INDEX);
    
    await expect(thirdEmojiAfterReload).toHaveClass(/selected/);
    
    // Query the database to verify the data was persisted
    const ratings = await dbHelper.getSuccessFactorRatings(TEST_PROJECT_ID);
    
    // Find the rating for our factor
    const factorRating = ratings.find(rating => rating.factorId === factorId);
    
    // Verify the rating matches what we selected (index 2 = resonance value 3)
    expect(factorRating).toBeTruthy();
    expect(factorRating?.resonance).toBe(RESONANCE_EMOJI_INDEX + 1);
  });
});