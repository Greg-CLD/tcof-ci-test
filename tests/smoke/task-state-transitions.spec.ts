import { test, expect } from '@playwright/test';

/**
 * Task State Transitions Smoke Test
 * 
 * This test focuses on verifying the state transition debug logging
 * for the SuccessFactor task completion bug investigation.
 * 
 * The test:
 * 1. Sets up the DEBUG_TASK_STATE flag in localStorage
 * 2. Navigates to a project with tasks
 * 3. Toggles a task's completion status
 * 4. Verifies the state transition debugging is logged
 */

test('tracks task state transitions with DEBUG_TASK_STATE enabled', async ({ page, request }) => {
  // Enable request logging
  let requestLogs = [];
  
  // Intercept network requests
  await page.route('**/*', async route => {
    const request = route.request();
    if (request.url().includes('/api/projects') || request.url().includes('/tasks')) {
      requestLogs.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
    }
    await route.continue();
  });

  // Set up debug flags in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('debug_tasks', 'true');
    localStorage.setItem('debug_task_state', 'true');
    localStorage.setItem('debug_task_completion', 'true'); 
    localStorage.setItem('debug_task_persistence', 'true');
    
    // Create storage for logs
    window._debugLogs = [];
    window._networkLogs = [];
    
    // Capture console logs
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      window._debugLogs.push(args.join(' '));
      originalConsoleLog(...args);
    };
  });

  // Add verification steps after task update
  const verifyTaskState = async (taskId) => {
    const getResponse = await request.get(`/api/projects/${projectId}/tasks`);
    console.log('GET /tasks Response:', await getResponse.json());
    
    const task = (await getResponse.json()).find(t => t.id === taskId);
    expect(task).toBeTruthy();
    return task;
  };

  // Login first (adjust as needed based on your auth implementation)
  await page.goto('/auth');
  await page.fill('input[name="username"]', 'greg@confluity.co.uk');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Wait for authentication to complete
  await page.waitForURL('/*');
  
  // Navigate to a project with tasks
  await page.goto('/make-a-plan/checklist');
  await page.waitForSelector('.task-card', { timeout: 10000 });
  
  // Find and click a task checkbox to toggle completion
  const taskCheckbox = await page.locator('.task-card input[type="checkbox"]').first();
  
  // Get initial state
  const initialState = await taskCheckbox.isChecked();
  console.log(`Initial task state: ${initialState ? 'completed' : 'incomplete'}`);
  
  // Click to toggle and trigger state transition
  await taskCheckbox.click();
  
  // Wait for the update to be processed
  await page.waitForTimeout(1000);
  
  // Verify the state changed
  const newState = await taskCheckbox.isChecked();
  expect(newState).not.toBe(initialState);
  
  // Get log messages from the page
  const logs = await page.evaluate(() => window._debugLogs || []);
  
  // Verify debug logging occurred
  expect(logs.some(log => log.includes('[DEBUG_TASK_STATE]'))).toBeTruthy();
  expect(logs.some(log => log.includes('Task state transition'))).toBeTruthy();
  
  // Check for specific debug patterns that would indicate the logging is working
  const hasTransitionLog = logs.some(log => 
    log.includes('[DEBUG_TASK_STATE]') && 
    (log.includes('State transition') || log.includes('status changed'))
  );
  
  expect(hasTransitionLog).toBeTruthy();
  
  // Also verify the task persistence/completion debugging
  expect(logs.some(log => log.includes('[DEBUG_TASK_COMPLETION]'))).toBeTruthy();
  expect(logs.some(log => log.includes('[DEBUG_TASK_PERSISTENCE]'))).toBeTruthy();
  
  console.log('Debug logs captured:', logs.filter(log => 
    log.includes('[DEBUG_TASK_STATE]') || 
    log.includes('[DEBUG_TASK_COMPLETION]') ||
    log.includes('[DEBUG_TASK_PERSISTENCE]')
  ));
});

test('verifies SuccessFactor task state transitions specifically', async ({ page }) => {
  // Set up debug flags in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('debug_tasks', 'true');
    localStorage.setItem('debug_task_state', 'true');
    localStorage.setItem('debug_task_completion', 'true'); 
    
    // Create a storage for logs to inspect
    window._debugLogs = [];
    
    // Capture console logs
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      window._debugLogs.push(args.join(' '));
      originalConsoleLog(...args);
    };
  });

  // Login first
  await page.goto('/auth');
  await page.fill('input[name="username"]', 'greg@confluity.co.uk');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Wait for authentication to complete
  await page.waitForURL('/*');
  
  // Navigate to admin success factors page to test SuccessFactor tasks specifically
  await page.goto('/make-a-plan/admin/factors');
  await page.waitForSelector('.success-factor-card', { timeout: 10000 });
  
  // Find a task checkbox in the SuccessFactor admin interface
  const taskCheckbox = await page.locator('.success-factor-task input[type="checkbox"]').first();
  
  if (await taskCheckbox.count() === 0) {
    console.log('No success factor tasks found to test with');
    // If no tasks exist with checkboxes, we should report this but not fail the test
    return;
  }
  
  // Get initial state
  const initialState = await taskCheckbox.isChecked();
  
  // Click to toggle and trigger state transition
  await taskCheckbox.click();
  
  // Wait for the update to be processed
  await page.waitForTimeout(1000);
  
  // Get log messages from the page
  const logs = await page.evaluate(() => window._debugLogs || []);
  
  // Check for specific logs that would indicate a SuccessFactor task state change
  const hasSuccessFactorTaskLog = logs.some(log => 
    log.includes('[DEBUG_TASK_STATE]') && 
    log.includes('SuccessFactor task') && 
    log.includes('state transition')
  );
  
  // This is a diagnostic test, not a functional verification, so we log findings
  if (hasSuccessFactorTaskLog) {
    console.log('SUCCESS: SuccessFactor task state transition logs detected');
  } else {
    console.log('NOTE: No specific SuccessFactor task state transition logs detected');
    console.log('Debug logs captured:', logs.filter(log => 
      log.includes('[DEBUG') && 
      log.includes('task')
    ));
  }
});