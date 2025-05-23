# Test info

- Name: Success Factor task toggle should persist after page reload
- Location: /home/runner/workspace/tests/e2e/factor-toggle.spec.ts:33:1

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
   1 | import { test, expect, Page } from '@playwright/test';
   2 |
   3 | // Test credentials - uses existing account
   4 | const TEST_USER = {
   5 |   username: 'greg@confluity.co.uk',
   6 |   password: 'tcof123'
   7 | };
   8 |
   9 | // Define the Task interface for type safety
   10 | interface Task {
   11 |   id: string;
   12 |   text: string;
   13 |   completed: boolean;
   14 |   projectId: string;
   15 |   origin: string;
   16 |   sourceId?: string;
   17 | }
   18 |
   19 | /**
   20 |  * Test: Success Factor Task Toggle Persistence
   21 |  * 
   22 |  * This test verifies that toggling a Success Factor task persists after page reload.
   23 |  * Steps:
   24 |  * 1. Log in to the application
   25 |  * 2. Create a new project
   26 |  * 3. Navigate to the checklist page (ensure=true to create Success Factor tasks)
   27 |  * 4. Toggle a Success Factor task
   28 |  * 5. Reload the page
   29 |  * 6. Verify the task state persists after reload
   30 |  * 
   31 |  * Expected result: The test should fail if task state doesn't persist after reload
   32 |  */
>  33 | test('Success Factor task toggle should persist after page reload', async ({ page }) => {
      | ^ Error: browserType.launch: Executable doesn't exist at /home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1169/chrome-linux/headless_shell
   34 |   // Setup request/response logging for debugging
   35 |   page.on('request', request => {
   36 |     if (request.url().includes('/tasks')) {
   37 |       console.log(`[REQUEST] ${request.method()} ${request.url()}`);
   38 |       if (request.method() === 'PUT') {
   39 |         console.log(`[REQUEST BODY] ${request.postData()}`);
   40 |       }
   41 |     }
   42 |   });
   43 |   
   44 |   page.on('response', async response => {
   45 |     if (response.url().includes('/tasks')) {
   46 |       const status = response.status();
   47 |       const url = response.url();
   48 |       console.log(`[RESPONSE] ${status} ${url}`);
   49 |       
   50 |       try {
   51 |         if (response.headers()['content-type']?.includes('application/json')) {
   52 |           const responseBody = await response.json();
   53 |           console.log(`[RESPONSE BODY] ${JSON.stringify(responseBody)}`);
   54 |         }
   55 |       } catch (error) {
   56 |         console.log(`[ERROR] Could not parse response: ${error}`);
   57 |       }
   58 |     }
   59 |   });
   60 |   
   61 |   // Store test data
   62 |   const testData = {
   63 |     projectId: '',
   64 |     projectName: `SF Test Project ${Date.now()}`,
   65 |     taskId: '',
   66 |     initialTaskState: false,
   67 |     toggledTaskState: true
   68 |   };
   69 |   
   70 |   // Step 1: Login to the application
   71 |   console.log('STEP 1: Login to application');
   72 |   await page.goto('/login');
   73 |   await page.fill('input[name="username"]', TEST_USER.username);
   74 |   await page.fill('input[name="password"]', TEST_USER.password);
   75 |   await page.click('button[type="submit"]');
   76 |   
   77 |   // Wait for successful login (redirect to dashboard)
   78 |   await page.waitForURL('**/dashboard');
   79 |   console.log('Login successful!');
   80 |   
   81 |   // Step 2: Create a new project
   82 |   console.log('STEP 2: Create new project');
   83 |   await page.goto('/projects/new');
   84 |   await page.fill('input[name="projectName"]', testData.projectName);
   85 |   await page.click('button[type="submit"]');
   86 |   
   87 |   // Wait for project creation and extract project ID from URL
   88 |   await page.waitForNavigation();
   89 |   const url = page.url();
   90 |   testData.projectId = url.split('/projects/')[1].split('/')[0];
   91 |   console.log(`Created project with ID: ${testData.projectId}`);
   92 |   
   93 |   // Step 3: Navigate to the project's checklist page
   94 |   console.log('STEP 3: Navigate to checklist page');
   95 |   await page.goto(`/projects/${testData.projectId}/checklist`);
   96 |   
   97 |   // Wait for checklist to load by looking for task elements
   98 |   try {
   99 |     await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
  100 |     console.log('Checklist page loaded successfully');
  101 |   } catch (error) {
  102 |     console.log('Could not find checklist container, trying alternative selector');
  103 |     await page.waitForSelector('div.card', { timeout: 10000 });
  104 |   }
  105 |   
  106 |   // Wait for API requests to complete
  107 |   await page.waitForTimeout(2000);
  108 |   
  109 |   // Step 4: Get all tasks and find Success Factor tasks
  110 |   console.log('STEP 4: Get all tasks and find Success Factor tasks');
  111 |   
  112 |   // Use browser's fetch API to get tasks with ensure=true parameter
  113 |   const tasks = await page.evaluate(async (projectId: string) => {
  114 |     const response = await fetch(`/api/projects/${projectId}/tasks?ensure=true`);
  115 |     if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.status}`);
  116 |     return await response.json();
  117 |   }, testData.projectId);
  118 |   
  119 |   console.log(`Retrieved ${tasks.length} tasks for the project`);
  120 |   
  121 |   // Filter for Success Factor tasks
  122 |   const successFactorTasks = tasks.filter((task: Task) => 
  123 |     task.origin === 'factor' || task.origin === 'success-factor'
  124 |   );
  125 |   
  126 |   console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
  127 |   expect(successFactorTasks.length).toBeGreaterThan(0, 'No Success Factor tasks found');
  128 |   
  129 |   // Select first Success Factor task to toggle
  130 |   const taskToToggle = successFactorTasks[0];
  131 |   testData.taskId = taskToToggle.id;
  132 |   testData.initialTaskState = !!taskToToggle.completed;
  133 |   testData.toggledTaskState = !testData.initialTaskState;
```