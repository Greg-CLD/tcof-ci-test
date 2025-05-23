import { test, expect, Page } from '@playwright/test';

// Test credentials - uses existing account
const TEST_USER = {
  username: 'greg@confluity.co.uk',
  password: 'tcof123'
};

// Define the Task interface for type safety
interface Task {
  id: string;
  text: string;
  completed: boolean;
  projectId: string;
  origin: string;
  sourceId?: string;
}

/**
 * Test: Success Factor Task Toggle Persistence
 * 
 * This test verifies that toggling a Success Factor task persists after page reload.
 * Steps:
 * 1. Log in to the application
 * 2. Create a new project
 * 3. Navigate to the checklist page (ensure=true to create Success Factor tasks)
 * 4. Toggle a Success Factor task
 * 5. Reload the page
 * 6. Verify the task state persists after reload
 * 
 * Expected result: The test should fail if task state doesn't persist after reload
 */
test('Success Factor task toggle should persist after page reload', async ({ page }) => {
  // Setup request/response logging for debugging
  page.on('request', request => {
    if (request.url().includes('/tasks')) {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
      if (request.method() === 'PUT') {
        console.log(`[REQUEST BODY] ${request.postData()}`);
      }
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/tasks')) {
      const status = response.status();
      const url = response.url();
      console.log(`[RESPONSE] ${status} ${url}`);
      
      try {
        if (response.headers()['content-type']?.includes('application/json')) {
          const responseBody = await response.json();
          console.log(`[RESPONSE BODY] ${JSON.stringify(responseBody)}`);
        }
      } catch (error) {
        console.log(`[ERROR] Could not parse response: ${error}`);
      }
    }
  });
  
  // Store test data
  const testData = {
    projectId: '',
    projectName: `SF Test Project ${Date.now()}`,
    taskId: '',
    initialTaskState: false,
    toggledTaskState: true
  };
  
  // Step 1: Login to the application
  console.log('STEP 1: Login to application');
  await page.goto('/login');
  await page.fill('input[name="username"]', TEST_USER.username);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login (redirect to dashboard)
  await page.waitForURL('**/dashboard');
  console.log('Login successful!');
  
  // Step 2: Create a new project
  console.log('STEP 2: Create new project');
  await page.goto('/projects/new');
  await page.fill('input[name="projectName"]', testData.projectName);
  await page.click('button[type="submit"]');
  
  // Wait for project creation and extract project ID from URL
  await page.waitForNavigation();
  const url = page.url();
  testData.projectId = url.split('/projects/')[1].split('/')[0];
  console.log(`Created project with ID: ${testData.projectId}`);
  
  // Step 3: Navigate to the project's checklist page
  console.log('STEP 3: Navigate to checklist page');
  await page.goto(`/projects/${testData.projectId}/checklist`);
  
  // Wait for checklist to load by looking for task elements
  try {
    await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
    console.log('Checklist page loaded successfully');
  } catch (error) {
    console.log('Could not find checklist container, trying alternative selector');
    await page.waitForSelector('div.card', { timeout: 10000 });
  }
  
  // Wait for API requests to complete
  await page.waitForTimeout(2000);
  
  // Step 4: Get all tasks and find Success Factor tasks
  console.log('STEP 4: Get all tasks and find Success Factor tasks');
  
  // Use browser's fetch API to get tasks with ensure=true parameter
  const tasks = await page.evaluate(async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}/tasks?ensure=true`);
    if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.status}`);
    return await response.json();
  }, testData.projectId);
  
  console.log(`Retrieved ${tasks.length} tasks for the project`);
  
  // Filter for Success Factor tasks
  const successFactorTasks = tasks.filter((task: Task) => 
    task.origin === 'factor' || task.origin === 'success-factor'
  );
  
  console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
  expect(successFactorTasks.length).toBeGreaterThan(0, 'No Success Factor tasks found');
  
  // Select first Success Factor task to toggle
  const taskToToggle = successFactorTasks[0];
  testData.taskId = taskToToggle.id;
  testData.initialTaskState = !!taskToToggle.completed;
  testData.toggledTaskState = !testData.initialTaskState;
  
  console.log('Selected Success Factor task to toggle:');
  console.log(`ID: ${taskToToggle.id}`);
  console.log(`Text: ${taskToToggle.text}`);
  console.log(`Origin: ${taskToToggle.origin}`);
  console.log(`Initial state: ${testData.initialTaskState}`);
  
  // Step 5: Toggle the task
  console.log('STEP 5: Toggle the task');
  
  // Create promises to capture network traffic
  const responsePromise = page.waitForResponse(
    response => response.url().includes(`/api/projects/${testData.projectId}/tasks/${testData.taskId}`) && 
                response.request().method() === 'PUT'
  );
  
  // Find the checkbox for the task and click it
  // First, look for the task by text content
  let taskElement;
  try {
    taskElement = await page.waitForSelector(`text="${taskToToggle.text}"`, { timeout: 5000 });
    console.log('Found task by text content');
  } catch (error) {
    console.log('Could not find task by text content, trying alternative approach');
    
    // Try to find any checkbox if specific task not found
    taskElement = await page.locator('input[type="checkbox"]').first();
    console.log('Using first checkbox as fallback');
  }
  
  // Click the checkbox to toggle the task
  if (taskElement) {
    const checkbox = await page.locator('input[type="checkbox"]').first();
    await checkbox.click();
    console.log('Clicked checkbox to toggle task');
  } else {
    // If UI approach fails, toggle via API call
    console.log('Toggling task via API call');
    await page.evaluate(async (projectId: string, taskId: string, newState: boolean) => {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ completed: newState })
      });
      return await response.json();
    }, testData.projectId, testData.taskId, testData.toggledTaskState);
  }
  
  // Wait for the PUT response
  const response = await responsePromise;
  console.log(`Toggle response status: ${response.status()}`);
  
  // Step 6: Get tasks after toggle to verify the update
  console.log('STEP 6: Verify task state after toggle');
  const tasksAfterToggle = await page.evaluate(async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.status}`);
    return await response.json();
  }, testData.projectId);
  
  // Find the toggled task
  const toggledTask = tasksAfterToggle.find((task: Task) => task.id === testData.taskId);
  expect(toggledTask).toBeTruthy('Task not found after toggle');
  
  console.log(`Task state after toggle: ${toggledTask?.completed}`);
  expect(toggledTask?.completed).toBe(testData.toggledTaskState, 
    `Task state not updated to ${testData.toggledTaskState}`);
  
  // Step 7: Reload the page and check if the task state persists
  console.log('STEP 7: Reload page and check persistence');
  await page.reload();
  
  // Wait for the page to reload and tasks to load
  await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 })
    .catch(() => page.waitForSelector('div.card', { timeout: 10000 }));
  
  // Wait for API requests to complete
  await page.waitForTimeout(2000);
  
  // Get tasks after reload
  const tasksAfterReload = await page.evaluate(async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.status}`);
    return await response.json();
  }, testData.projectId);
  
  // Find the toggled task after reload
  const taskAfterReload = tasksAfterReload.find((task: Task) => task.id === testData.taskId);
  expect(taskAfterReload).toBeTruthy('Task not found after page reload');
  
  console.log(`Task state after reload: ${taskAfterReload?.completed}`);
  
  // This assertion should fail if the bug exists - task state should not persist after reload
  expect(taskAfterReload?.completed).toBe(testData.toggledTaskState, 
    'Task toggle state did not persist after page reload');
  
  // Cleanup - not strictly necessary for the test but good practice
  await page.screenshot({ path: `./test-artifacts/factor-toggle-persistence-${Date.now()}.png` });
});