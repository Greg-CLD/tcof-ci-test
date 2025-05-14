
import { test, expect } from '@playwright/test';

test.describe('Success Factors Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console log capture
    page.on('console', msg => {
      console.log(`Browser console: ${msg.text()}`);
    });
  });

  test('should log detailed console messages', async ({ page }) => {
    // Intercept network requests
    await page.route('/api/success_factors', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: '1', title: 'Factor 1', description: 'Description 1' },
          { id: '2', title: 'Factor 2', description: 'Description 2' }
        ])
      });
    });

    await page.goto('/success-factors');
    
    // Verify console logs
    const logs = await page.evaluate(() => {
      return new Promise(resolve => {
        const logs = [];
        const oldLog = console.log;
        console.log = (...args) => {
          logs.push(args.join(' '));
          oldLog.apply(console, args);
        };
        setTimeout(() => {
          console.log = oldLog;
          resolve(logs);
        }, 1000);
      });
    });

    expect(logs).toContain(expect.stringContaining('Query key:'));
    expect(logs).toContain(expect.stringContaining('Fetching…'));
    expect(logs).toContain(expect.stringContaining('Data:'));
  });

  test('should display 5 success factors', async ({ page }) => {
    await page.route('/api/success_factors', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(Array.from({ length: 5 }, (_, i) => ({
          id: String(i + 1),
          title: `Factor ${i + 1}`,
          description: `Description ${i + 1}`
        })))
      });
    });

    await page.goto('/success-factors');
    await expect(page.locator('.success-factor-item')).toHaveCount(5);
  });

  test('should show empty state message', async ({ page }) => {
    await page.route('/api/success_factors', route => {
      route.fulfill({ status: 200, body: '[]' });
    });

    await page.goto('/success-factors');
    await expect(page.getByText('No success factors available')).toBeVisible();
  });

  test('should show error on failed request', async ({ page }) => {
    await page.route('/api/success_factors', route => {
      route.fulfill({ status: 500 });
    });

    await page.goto('/success-factors');
    await expect(page.getByText('Failed to load success factors')).toBeVisible();
  });

  test('should refetch on retry button click', async ({ page }) => {
    let requestCount = 0;
    await page.route('/api/success_factors', route => {
      requestCount++;
      route.fulfill({ 
        status: requestCount === 1 ? 500 : 200,
        body: requestCount === 1 ? '' : JSON.stringify([{ id: '1', title: 'Retried Factor' }])
      });
    });

    await page.goto('/success-factors');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Retried Factor')).toBeVisible();
    expect(requestCount).toBe(2);
  });

  test('should make fresh network calls with staleTime 0', async ({ page }) => {
    let requestCount = 0;
    await page.route('/api/success_factors', route => {
      requestCount++;
      route.fulfill({
        status: 200,
        body: JSON.stringify([{ id: '1', title: `Factor Call ${requestCount}` }])
      });
    });

    await page.goto('/success-factors');
    await page.reload();
    expect(requestCount).toBe(2);
  });

  test('should only call correct endpoint', async ({ page }) => {
    const requests = [];
    page.on('request', request => {
      requests.push(request.url());
    });

    await page.goto('/success-factors');
    
    const apiCalls = requests.filter(url => url.includes('/api/'));
    expect(apiCalls.every(url => url.includes('/api/success_factors'))).toBeTruthy();
  });
});
