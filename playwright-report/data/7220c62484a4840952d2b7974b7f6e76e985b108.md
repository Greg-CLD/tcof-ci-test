# Test info

- Name: Task ownership workflow
- Location: /home/runner/workspace/tests/e2e/task-ownership.spec.ts:20:1

# Error details

```
Error: browserType.launch: Executable doesn't exist at /home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1169/chrome-linux/headless_shell
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
   2 |
   3 | // Extend the Window interface to allow our custom property
   4 | declare global {
   5 |   interface Window {
   6 |     __capturedMailto?: string;
   7 |   }
   8 | }
   9 |
   10 | /**
   11 |  * Task Ownership E2E Test
   12 |  * 
   13 |  * This test verifies the Task Ownership functionality:
   14 |  * 1. Login as demo user
   15 |  * 2. Create a project & task with no owner
   16 |  * 3. Visit checklist → see warning icon
   17 |  * 4. Set owner; icon disappears on reload
   18 |  * 5. Click "Send via Email"; verify mailto link contains task text
   19 |  */
>  20 | test('Task ownership workflow', async ({ page }) => {
      | ^ Error: browserType.launch: Executable doesn't exist at /home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1169/chrome-linux/headless_shell
   21 |   // 1. Log in as demo user
   22 |   await page.goto('/login');
   23 |   await page.fill('[data-testid="username-input"]', 'demo@example.com');
   24 |   await page.fill('[data-testid="password-input"]', 'password123');
   25 |   await page.click('[data-testid="login-button"]');
   26 |   
   27 |   // Verify login was successful - check for Dashboard element
   28 |   await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
   29 |   
   30 |   // 2. Create a new project
   31 |   await page.click('[data-testid="new-project-button"]');
   32 |   const projectName = `Test Project ${new Date().toISOString()}`;
   33 |   await page.fill('[data-testid="project-name-input"]', projectName);
   34 |   await page.selectOption('[data-testid="project-sector-select"]', 'education');
   35 |   await page.selectOption('[data-testid="project-org-type-select"]', 'education');
   36 |   await page.selectOption('[data-testid="project-team-size-select"]', 'small');
   37 |   await page.selectOption('[data-testid="project-stage-select"]', 'identify');
   38 |   await page.click('[data-testid="create-project-button"]');
   39 |   
   40 |   // Navigate to checklist
   41 |   await page.click('[data-testid="checklist-link"]');
   42 |   
   43 |   // Create a task with no owner
   44 |   await page.click('[data-testid="add-task-button"]');
   45 |   const taskText = `Test Task ${new Date().toISOString()}`;
   46 |   await page.fill('[data-testid="task-text-input"]', taskText);
   47 |   await page.click('[data-testid="save-task-button"]');
   48 |   
   49 |   // 3. Verify the warning icon appears for the unassigned task
   50 |   const warningIcon = page.locator('.task-card:has-text("' + taskText + '")').locator('.warning-icon');
   51 |   await expect(warningIcon).toBeVisible();
   52 |   
   53 |   // Verify tooltip on hover
   54 |   await warningIcon.hover();
   55 |   await expect(page.locator('text=Assign an owner to this task')).toBeVisible();
   56 |   
   57 |   // 4. Set owner for the task
   58 |   await page.click('.task-card:has-text("' + taskText + '")');
   59 |   await page.fill('[data-testid="task-owner-input"]', 'John Doe');
   60 |   await page.click('[data-testid="save-task-button"]');
   61 |   
   62 |   // Verify warning icon disappears after setting owner
   63 |   await expect(warningIcon).not.toBeVisible();
   64 |   
   65 |   // Reload the page and verify warning icon is still gone
   66 |   await page.reload();
   67 |   await expect(page.locator('.task-card:has-text("' + taskText + '")').locator('.warning-icon')).not.toBeVisible();
   68 |   
   69 |   // 5. Verify "Send via Email" functionality
   70 |   await page.click('.task-card:has-text("' + taskText + '")');
   71 |   
   72 |   // Mock window.location.href to capture mailto URL
   73 |   await page.evaluate(() => {
   74 |     const originalLocation = window.location;
   75 |     // @ts-ignore - This is necessary for the test
   76 |     delete window.location;
   77 |     window.location = { ...originalLocation };
   78 |     
   79 |     // Override the href setter to capture the mailto URL
   80 |     let capturedMailto = '';
   81 |     Object.defineProperty(window.location, 'href', {
   82 |       set: function(url) {
   83 |         if (url.startsWith('mailto:')) {
   84 |           capturedMailto = url;
   85 |           // Store it for later access
   86 |           window.__capturedMailto = url;
   87 |           return;
   88 |         }
   89 |         originalLocation.href = url;
   90 |       },
   91 |       get: function() {
   92 |         return originalLocation.href;
   93 |       }
   94 |     });
   95 |   });
   96 |   
   97 |   // Click the email button
   98 |   await page.click('[data-testid="send-via-email-button"]');
   99 |   
  100 |   // Check the captured mailto URL
  101 |   const mailtoUrl = await page.evaluate(() => {
  102 |     return window.__capturedMailto || '';
  103 |   });
  104 |   
  105 |   expect(mailtoUrl).toContain('subject=Task%20Assignment');
  106 |   expect(mailtoUrl).toContain(encodeURIComponent(taskText));
  107 |   expect(mailtoUrl).toContain('John%20Doe');
  108 | });
```