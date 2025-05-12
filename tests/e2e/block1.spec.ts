import { test, expect } from '@playwright/test';

// Unique identifiers to help avoid conflicts in test runs
const TEST_TIMESTAMP = Date.now();
const TEST_PROJECT_NAME = `E2E Test Project ${TEST_TIMESTAMP}`;
const TEST_HEURISTIC_NAME = `Test Heuristic ${TEST_TIMESTAMP}`;
const TEST_HEURISTIC_DESC = `Test Description ${TEST_TIMESTAMP}`;

test.describe('Block1 End-to-End Tests', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/api/login');

    // Wait for redirection to complete (should end up on login page or directly redirected if session exists)
    await page.waitForNavigation();

    // Ensure we're logged in by checking for a profile element
    // If not on homepage after redirection, we need to log in
    if (!(await page.isVisible('text="Create Project"')) && !(await page.isVisible('text="View Project"'))) {
      // Fill in login form - replace with your test user credentials
      await page.fill('input[name="username"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete
      await page.waitForNavigation();
    }

    // Verify we're logged in
    await expect(page).toHaveURL(/.*\/projects*/);
  });
  
  test('should create a project, add a rating and heuristic, and verify persistence', async ({ page }) => {
    // Step 1: Create a new project if needed
    await page.goto('/projects');
    await page.waitForSelector('h1');

    // Check if we need to create a project
    const createProjectButton = page.locator('text="Create Project"').first();
    if (await createProjectButton.isVisible()) {
      await createProjectButton.click();
      
      // Fill out project creation form
      await page.fill('input[name="name"]', TEST_PROJECT_NAME);
      await page.fill('textarea[name="description"]', 'E2E Test Project Description');
      await page.click('button[type="submit"]');
      
      // Wait for project creation
      await page.waitForNavigation();
    }

    // Step 2: Find and navigate to the make-a-plan page for a project
    const projectCards = page.locator('.project-card, [data-testid="project-card"]');
    const projectCount = await projectCards.count();
    
    // If we have projects, navigate to the first one's make-a-plan page
    if (projectCount > 0) {
      await projectCards.first().click();
      await page.waitForNavigation();
      
      // Now navigate to make-a-plan
      await page.click('text="Make a Plan"');
      await page.waitForNavigation();
      
      // Click to enter Block1
      await page.click('text="Discover Success Factors"');
      await page.waitForNavigation();
      
      // Step 3: Rate a success factor
      // Click on the "Rate Success Factors" tab if needed
      if (await page.isVisible('text="Rate Success Factors"')) {
        await page.click('text="Rate Success Factors"');
      }
      
      // Wait for the table to load
      await page.waitForSelector('table');
      
      // Find and click on a rating button (e.g., "Highly Resonant" which is likely rating 4 or 5)
      // We're targeting the first factor in the table
      const ratingButton = page.locator('table tr').first().locator('button').nth(4); // Choose the 5th button (index 4)
      await ratingButton.click();
      
      // Save the ratings
      await page.click('button:has-text("Confirm & Save")');
      
      // Wait for save confirmation
      await page.waitForSelector('text=Ratings saved');
      
      // Step 4: Add a personal heuristic
      // Navigate to Personal Heuristics tab
      await page.click('text="Personal Heuristics"');
      
      // Fill in the form for a new heuristic
      await page.fill('input[placeholder="Add a heuristic name"]', TEST_HEURISTIC_NAME);
      await page.fill('textarea[placeholder="Add a description"]', TEST_HEURISTIC_DESC);
      
      // Add the heuristic
      await page.click('button:has-text("Add Heuristic")');
      
      // Save the heuristics
      await page.click('button:has-text("Save Progress")');
      
      // Wait for save confirmation
      await page.waitForSelector('text=All changes saved');
      
      // Step 5: Refresh the page to verify persistence
      await page.reload();
      
      // Wait for the page to load
      await page.waitForSelector('h1');
      
      // Go to Personal Heuristics tab
      await page.click('text="Personal Heuristics"');
      
      // Verify our heuristic is still there
      await expect(page.locator(`text="${TEST_HEURISTIC_NAME}"`)).toBeVisible();
      await expect(page.locator(`text="${TEST_HEURISTIC_DESC}"`)).toBeVisible();
      
      // Go to Rate Success Factors tab
      await page.click('text="Rate Success Factors"');
      
      // Verify we still have the rating (by checking if the button we clicked has the selected state)
      // This assumes the button we clicked earlier has a specific class when selected
      await expect(ratingButton).toHaveClass(/selected|active|bg-tcof-teal/);
    } else {
      // Skip test if no projects are available
      test.skip(!projectCount, 'No projects available for testing');
    }
  });
  
  test('should add and delete a personal heuristic', async ({ page }) => {
    // Navigate to an existing project's make-a-plan page
    await page.goto('/projects');
    const projectCards = page.locator('.project-card, [data-testid="project-card"]');
    const projectCount = await projectCards.count();
    
    if (projectCount > 0) {
      await projectCards.first().click();
      await page.click('text="Make a Plan"');
      await page.click('text="Discover Success Factors"');
      
      // Go to Personal Heuristics tab
      await page.click('text="Personal Heuristics"');
      
      // Add a heuristic
      const deleteTestName = `Delete Test Heuristic ${TEST_TIMESTAMP}`;
      await page.fill('input[placeholder="Add a heuristic name"]', deleteTestName);
      await page.fill('textarea[placeholder="Add a description"]', 'This will be deleted');
      await page.click('button:has-text("Add Heuristic")');
      
      // Save the heuristic
      await page.click('button:has-text("Save Progress")');
      await page.waitForSelector('text=All changes saved');
      
      // Verify it was added
      await expect(page.locator(`text="${deleteTestName}"`)).toBeVisible();
      
      // Delete the heuristic
      const deleteButton = page.locator(`text="${deleteTestName}"`).locator('xpath=../..').locator('button');
      await deleteButton.click();
      
      // Confirm the deletion
      await page.waitForTimeout(1000); // Wait for any animations
      
      // Save again
      await page.click('button:has-text("Save Progress")');
      await page.waitForSelector('text=All changes saved');
      
      // Refresh and verify it's gone
      await page.reload();
      await page.waitForSelector('h1');
      await page.click('text="Personal Heuristics"');
      
      // Verify the heuristic is no longer there
      await expect(page.locator(`text="${deleteTestName}"`)).not.toBeVisible();
    } else {
      test.skip(!projectCount, 'No projects available for testing');
    }
  });
});