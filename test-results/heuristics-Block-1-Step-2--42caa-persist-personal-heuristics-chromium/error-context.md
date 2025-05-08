# Test info

- Name: Block 1 Step 2 - Personal Heuristics >> should add, save and persist personal heuristics
- Location: /home/runner/workspace/tests/e2e/heuristics.spec.ts:17:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /home/runner/workspace/.cache/ms-playwright/chromium-1169/chrome-linux/chrome
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import { dbHelper } from './helpers/db-helper';
   3 |
   4 | // Test project ID to use for tests - using an existing valid project ID
   5 | const TEST_PROJECT_ID = 3;
   6 |
   7 | // Test data
   8 | const TEST_HEURISTIC = 'Test Heuristic for E2E Testing';
   9 |
  10 | test.describe('Block 1 Step 2 - Personal Heuristics', () => {
  11 |   test.beforeEach(async ({ page }) => {
  12 |     // Login first
  13 |     await page.goto('/');
  14 |     // We're already logged in based on the logs, so we can proceed
  15 |   });
  16 |   
> 17 |   test('should add, save and persist personal heuristics', async ({ page }) => {
     |   ^ Error: browserType.launch: Executable doesn't exist at /home/runner/workspace/.cache/ms-playwright/chromium-1169/chrome-linux/chrome
  18 |     // Navigate to the Block 1 Step 2 page
  19 |     await page.goto(`/make-a-plan/${TEST_PROJECT_ID}/block-1/step-2`);
  20 |     
  21 |     // Wait for the page to load
  22 |     await page.waitForSelector('h2:has-text("Custom Heuristics Builder")');
  23 |     
  24 |     // Add a new personal heuristic
  25 |     await page.fill('input[placeholder="Enter a custom heuristic..."]', TEST_HEURISTIC);
  26 |     
  27 |     // Click the Add Heuristic button
  28 |     await page.click('button:has-text("Add Heuristic")');
  29 |     
  30 |     // Wait for the confirmation toast
  31 |     await page.waitForSelector('div[role="status"]:has-text("Adding heuristic")');
  32 |     
  33 |     // Verify the heuristic appears in the UI
  34 |     await expect(page.locator(`li:has-text("${TEST_HEURISTIC}")`)).toBeVisible();
  35 |     
  36 |     // Save the heuristics
  37 |     await page.click('button:has-text("Save Heuristics")');
  38 |     
  39 |     // Wait for the save confirmation toast
  40 |     await page.waitForSelector('div[role="status"]:has-text("Heuristics saved")');
  41 |     
  42 |     // Refresh the page to check persistence
  43 |     await page.reload();
  44 |     
  45 |     // Wait for the page to load again
  46 |     await page.waitForSelector('h2:has-text("Custom Heuristics Builder")');
  47 |     
  48 |     // Verify the heuristic still appears in the UI
  49 |     await expect(page.locator(`li:has-text("${TEST_HEURISTIC}")`)).toBeVisible();
  50 |     
  51 |     // Query the database to verify the data was persisted
  52 |     const heuristics = await dbHelper.getPersonalHeuristics(TEST_PROJECT_ID);
  53 |     
  54 |     // Convert heuristic objects to their name strings for simple comparison
  55 |     const heuristicNames = heuristics.map(h => {
  56 |       if (typeof h === 'string') return h;
  57 |       if (h && typeof h === 'object' && 'name' in h && typeof h.name === 'string') {
  58 |         return h.name;
  59 |       }
  60 |       return '';
  61 |     });
  62 |     
  63 |     // Verify our test heuristic is in the returned data
  64 |     expect(heuristicNames).toContain(TEST_HEURISTIC);
  65 |     
  66 |     // Remove the heuristic to clean up
  67 |     const heuristicItem = page.locator(`li:has-text("${TEST_HEURISTIC}")`);
  68 |     await heuristicItem.locator('button[aria-label="Remove heuristic"]').click();
  69 |     
  70 |     // Wait for the removal confirmation toast
  71 |     await page.waitForSelector('div[role="status"]:has-text("Removing heuristic")');
  72 |     
  73 |     // Save the updated heuristics
  74 |     await page.click('button:has-text("Save Heuristics")');
  75 |     
  76 |     // Wait for the save confirmation toast
  77 |     await page.waitForSelector('div[role="status"]:has-text("Heuristics saved")');
  78 |     
  79 |     // Verify the heuristic is no longer in the UI
  80 |     await expect(page.locator(`li:has-text("${TEST_HEURISTIC}")`)).not.toBeVisible();
  81 |   });
  82 | });
```