
import { test, expect } from '@playwright/test';

test('Happy path - Navigate to Project Tool', async ({ page }) => {
  // Log in (assuming helper function `login` exists for signing in user)
  await page.goto('/auth'); // replace with actual login path if different
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Visit project page
  const orgId = 'org-test';  // replace with actual org ID
  const projectId = 'project-test'; // replace with actual project ID
  await page.goto(`/organisations/${orgId}/projects/${projectId}`);

  // Click on "Get Your Bearings" button
  await page.click('text=Get Your Bearings');

  // Assert redirected URL and successful HTTP status
  await expect(page).toHaveURL(`/tools/goal-mapping/${projectId}`);
  await page.waitForResponse(response => response.status() === 200);
});

