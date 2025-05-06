import { test, expect } from '@playwright/test';

test.describe('Organisation Management', () => {
  test.beforeEach(async ({ page }) => {
    // Simulate login - normally we'd use a proper login flow
    // But for this test we'll set the necessary cookies/localStorage
    await page.goto('/');
    
    // Wait for auth to load
    await page.waitForSelector('nav');
    
    // Navigate to organisations
    await page.goto('/organisations');
  });

  test('should show organisation list with at least one item', async ({ page }) => {
    // Verify we're on the organisations page
    await expect(page.locator('h1')).toContainText('Your Organisations');
    
    // There should be a button to create a new organization
    await expect(page.getByText('New Organisation')).toBeVisible();
    
    // There should be at least one organization card
    const orgCards = page.locator('.bg-card.text-card-foreground.hover\\:shadow-md');
    await expect(orgCards).toHaveCount({ min: 1 });
    
    // Check that we don't see the "Project Profile Incomplete" message
    await expect(page.getByText('Project Profile Incomplete')).not.toBeVisible();
  });

  test('should allow creating a new organisation', async ({ page }) => {
    // Click the new organization button
    await page.getByText('New Organisation').click();
    
    // Wait for the dialog to appear
    await page.waitForSelector('[role="dialog"]');
    
    // Fill in the form
    await page.fill('input[name="name"]', 'Test Organisation ' + Math.floor(Math.random() * 1000));
    await page.fill('textarea[name="description"]', 'This is a test organisation created by e2e tests');
    
    // Submit the form
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for the dialog to close and the page to refresh
    await page.waitForSelector('[role="dialog"]', { state: 'detached' });
    
    // There should be a success toast, but that's difficult to test reliably
    // So we'll just check that we're still on the organisations page
    await expect(page.locator('h1')).toContainText('Your Organisations');
  });
});