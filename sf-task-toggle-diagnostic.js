/**
 * Success Factor Task Toggle Diagnostic Test
 * 
 * This script performs a comprehensive end-to-end test of Success Factor task toggling:
 * 1. Creates a new project via the UI
 * 2. Queries the database for tasks BEFORE toggle
 * 3. Toggles a Success Factor task and captures all network traffic
 * 4. Queries the database for tasks AFTER toggle
 * 5. Reloads the page to verify UI state persistence
 */

const { chromium } = require('@playwright/test');
const { Pool } = require('pg');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'greg@confluity.co.uk', 
  password: 'tcof123'
};

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Function to query tasks from database
async function queryTasks(projectId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, source_id, origin, completed, text
      FROM project_tasks
      WHERE project_id = $1
      ORDER BY id
    `, [projectId]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function runTest() {
  console.log('=== SUCCESS FACTOR TASK TOGGLE DIAGNOSTIC TEST ===');
  
  // Test data collection
  const testData = {
    projectId: null,
    projectName: null,
    tasksBefore: null,
    toggledTaskId: null,
    putRequest: null,
    putResponse: null,
    tasksAfter: null,
    taskAfterReload: null,
    success: false
  };
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Slow down operations for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set up network request/response logging
  page.on('request', request => {
    if (request.url().includes('/api/projects/') && request.url().includes('/tasks')) {
      const url = request.url();
      const method = request.method();
      console.log(`REQUEST: ${method} ${url}`);
      
      if (method === 'PUT') {
        try {
          const data = JSON.parse(request.postData() || '{}');
          console.log('PUT Request Payload:', JSON.stringify(data, null, 2));
          
          testData.putRequest = {
            url,
            method,
            body: data
          };
        } catch (e) {
          console.log('Could not parse request body');
        }
      }
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/projects/') && response.url().includes('/tasks')) {
      const url = response.url();
      const status = response.status();
      console.log(`RESPONSE: ${status} ${url}`);
      
      if (response.request().method() === 'PUT') {
        try {
          const data = await response.json();
          console.log('PUT Response:', JSON.stringify(data, null, 2));
          
          testData.putResponse = {
            url,
            status,
            body: data
          };
        } catch (e) {
          console.log('Could not parse response as JSON');
          const text = await response.text().catch(() => 'Could not read response text');
          console.log('Response Text:', text);
          
          testData.putResponse = {
            url,
            status,
            body: text
          };
        }
      }
    }
  });
  
  try {
    // STEP 1: LOGIN
    console.log('\n=== STEP 1: LOGIN ===');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL('**/dashboard');
    console.log('Login successful');
    
    // STEP 2: CREATE NEW PROJECT
    console.log('\n=== STEP 2: CREATE NEW PROJECT ===');
    await page.goto(`${BASE_URL}/projects/new`);
    
    const projectName = `SF Toggle Test ${Date.now()}`;
    await page.fill('input[name="projectName"]', projectName);
    await page.click('button[type="submit"]');
    
    // Wait for project creation and redirection
    await page.waitForNavigation();
    
    // Extract the project ID from the URL
    const url = page.url();
    const projectId = url.split('/projects/')[1].split('/')[0];
    console.log(`Created project "${projectName}" with ID: ${projectId}`);
    
    // Save project info
    testData.projectId = projectId;
    testData.projectName = projectName;
    
    // STEP 3: NAVIGATE TO CHECKLIST PAGE
    console.log('\n=== STEP 3: NAVIGATE TO CHECKLIST ===');
    await page.goto(`${BASE_URL}/projects/${projectId}/checklist`);
    
    // Wait for the checklist to load
    try {
      await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
      console.log('Checklist page loaded');
    } catch (e) {
      console.log('Checklist container not found, trying alternative wait strategy');
      await page.waitForSelector('div.card', { timeout: 10000 });
    }
    
    // Give time for all tasks to load
    await page.waitForTimeout(2000);
    
    // STEP 4: GET TASKS FROM DATABASE BEFORE TOGGLE
    console.log('\n=== STEP 4: DATABASE QUERY BEFORE TOGGLE ===');
    const tasksBefore = await queryTasks(projectId);
    console.log(`Found ${tasksBefore.length} tasks in database BEFORE toggle`);
    
    // Print task details in a table format
    console.log('\nTasks in database before toggle:');
    console.table(tasksBefore.map(t => ({
      id: t.id,
      sourceId: t.source_id || 'none',
      origin: t.origin,
      completed: t.completed
    })));
    
    // Save tasks before toggle
    testData.tasksBefore = tasksBefore;
    
    // STEP 5: GET TASKS FROM API (with ensure=true)
    console.log('\n=== STEP 5: GET TASKS FROM API (ensure=true) ===');
    const apiTasksBefore = await page.evaluate(async (projectId) => {
      const response = await fetch(`/api/projects/${projectId}/tasks?ensure=true`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      return await response.json();
    }, projectId);
    
    console.log(`API returned ${apiTasksBefore.length} tasks with ensure=true`);
    
    // Find Success Factor tasks
    const successFactorTasks = apiTasksBefore.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks in API response`);
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found. Test cannot continue.');
    }
    
    // Select the first Success Factor task to toggle
    const taskToToggle = successFactorTasks[0];
    testData.toggledTaskId = taskToToggle.id;
    
    console.log('\nSelected Success Factor task to toggle:');
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Source ID: ${taskToToggle.sourceId || 'none'}`);
    console.log(`Current completion state: ${taskToToggle.completed}`);
    
    // STEP 6: TOGGLE THE TASK
    console.log('\n=== STEP 6: TOGGLE TASK ===');
    const newCompletionState = !taskToToggle.completed;
    console.log(`Toggling completion from ${taskToToggle.completed} to ${newCompletionState}`);
    
    // Find the checkbox for this task
    let foundTask = false;
    
    // Strategy 1: Look for text and then the nearest checkbox
    try {
      console.log(`Looking for task text: "${taskToToggle.text}"`);
      // Use XPath to find the text and then navigate to the nearest checkbox
      const taskTextLocator = page.locator(`//*[contains(text(), "${taskToToggle.text}")]`);
      
      // Wait for the task text to be visible
      await taskTextLocator.waitFor({ state: 'visible', timeout: 5000 });
      console.log('Found task text in the UI');
      
      // Find the nearest checkbox by walking up the DOM and then finding a checkbox
      const checkboxXPath = `xpath=//*[contains(text(), "${taskToToggle.text}")]/ancestor::div[contains(@class, "task") or contains(@class, "card")]//input[@type="checkbox"]`;
      const checkbox = page.locator(checkboxXPath).first();
      
      if (await checkbox.count() > 0) {
        foundTask = true;
        console.log('Found checkbox, clicking it...');
        await checkbox.click();
      } else {
        console.log('Could not find checkbox near task text');
      }
    } catch (e) {
      console.log('Could not find task by text content:', e.message);
    }
    
    // Strategy 2: Fall back to finding any checkbox if specific task not found
    if (!foundTask) {
      try {
        console.log('Trying alternative strategy: Find any checkbox in the UI');
        const checkbox = page.locator('input[type="checkbox"]').first();
        
        if (await checkbox.count() > 0) {
          console.log('Found a checkbox, clicking it...');
          await checkbox.click();
        } else {
          throw new Error('No checkboxes found on the page');
        }
      } catch (e) {
        console.error('Could not find any checkboxes:', e.message);
        
        // Save screenshot for debugging
        await page.screenshot({ path: 'checklist-page.png' });
        console.log('Saved screenshot to checklist-page.png');
        
        // Fall back to direct API call as last resort
        console.log('FALLBACK: Making direct API call to toggle task');
        
        const toggleResult = await page.evaluate(async (projectId, taskId, newState) => {
          const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ completed: newState })
          });
          
          let responseData;
          try {
            responseData = await response.json();
          } catch (e) {
            responseData = await response.text();
          }
          
          return {
            status: response.status,
            ok: response.ok,
            body: responseData
          };
        }, projectId, taskToToggle.id, newCompletionState);
        
        console.log('Direct API toggle result:', toggleResult);
      }
    }
    
    // Wait for any request/response to complete
    await page.waitForTimeout(2000);
    
    // STEP 7: GET TASKS FROM DATABASE AFTER TOGGLE
    console.log('\n=== STEP 7: DATABASE QUERY AFTER TOGGLE ===');
    const tasksAfter = await queryTasks(projectId);
    console.log(`Found ${tasksAfter.length} tasks in database AFTER toggle`);
    
    // Print tasks after toggle
    console.log('\nTasks in database after toggle:');
    console.table(tasksAfter.map(t => ({
      id: t.id,
      sourceId: t.source_id || 'none',
      origin: t.origin,
      completed: t.completed
    })));
    
    // Save tasks after toggle
    testData.tasksAfter = tasksAfter;
    
    // Find the toggled task in the database
    const dbToggledTask = tasksAfter.find(t => t.id === taskToToggle.id);
    
    if (dbToggledTask) {
      console.log('\nToggled task in database:');
      console.log(`ID: ${dbToggledTask.id}`);
      console.log(`Source ID: ${dbToggledTask.source_id || 'none'}`);
      console.log(`Origin: ${dbToggledTask.origin}`);
      console.log(`Completion state: ${dbToggledTask.completed}`);
      
      // Check if the database state matches the expected new state
      const dbToggleSuccessful = dbToggledTask.completed === newCompletionState;
      
      if (dbToggleSuccessful) {
        console.log('✅ SUCCESS: Task toggle persisted to database');
      } else {
        console.log('❌ FAILURE: Task toggle not persisted to database');
        console.log(`Expected: ${newCompletionState}, Actual: ${dbToggledTask.completed}`);
      }
    } else {
      console.log('❌ ERROR: Task not found in database after toggle!');
    }
    
    // STEP 8: GET TASKS FROM API AFTER TOGGLE
    console.log('\n=== STEP 8: GET TASKS FROM API AFTER TOGGLE ===');
    const apiTasksAfter = await page.evaluate(async (projectId) => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      return await response.json();
    }, projectId);
    
    console.log(`API returned ${apiTasksAfter.length} tasks after toggle`);
    
    // Find the toggled task in the API response
    const apiToggledTask = apiTasksAfter.find(t => t.id === taskToToggle.id);
    
    if (apiToggledTask) {
      console.log('\nToggled task in API response:');
      console.log(`ID: ${apiToggledTask.id}`);
      console.log(`Text: ${apiToggledTask.text}`);
      console.log(`Origin: ${apiToggledTask.origin}`);
      console.log(`Source ID: ${apiToggledTask.sourceId || 'none'}`);
      console.log(`Completion state: ${apiToggledTask.completed}`);
      
      // Check if the API state matches the expected new state
      const apiToggleSuccessful = apiToggledTask.completed === newCompletionState;
      
      if (apiToggleSuccessful) {
        console.log('✅ SUCCESS: Task toggle reflected in API response');
      } else {
        console.log('❌ FAILURE: Task toggle not reflected in API response');
        console.log(`Expected: ${newCompletionState}, Actual: ${apiToggledTask.completed}`);
      }
    } else {
      console.log('❌ ERROR: Task not found in API response after toggle!');
    }
    
    // STEP 9: RELOAD PAGE AND CHECK PERSISTENCE
    console.log('\n=== STEP 9: RELOAD PAGE AND CHECK PERSISTENCE ===');
    await page.reload();
    
    // Wait for the checklist to load again
    await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
    
    // Get tasks after reload
    const apiTasksAfterReload = await page.evaluate(async (projectId) => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      return await response.json();
    }, projectId);
    
    console.log(`API returned ${apiTasksAfterReload.length} tasks after page reload`);
    
    // Find the toggled task in the after-reload API response
    const taskAfterReload = apiTasksAfterReload.find(t => t.id === taskToToggle.id);
    testData.taskAfterReload = taskAfterReload;
    
    if (taskAfterReload) {
      console.log('\nTask state after page reload:');
      console.log(`ID: ${taskAfterReload.id}`);
      console.log(`Text: ${taskAfterReload.text}`);
      console.log(`Origin: ${taskAfterReload.origin}`);
      console.log(`Source ID: ${taskAfterReload.sourceId || 'none'}`);
      console.log(`Completion state: ${taskAfterReload.completed}`);
      
      // Check if the state persisted through page reload
      const persistenceSuccessful = taskAfterReload.completed === newCompletionState;
      testData.success = persistenceSuccessful;
      
      if (persistenceSuccessful) {
        console.log('✅ SUCCESS: Task toggle persisted after page reload');
      } else {
        console.log('❌ FAILURE: Task toggle did not persist after page reload');
        console.log(`Expected: ${newCompletionState}, Actual: ${taskAfterReload.completed}`);
      }
    } else {
      console.log('❌ ERROR: Task not found after page reload!');
    }
    
    // STEP 10: FINAL DIAGNOSIS
    console.log('\n=== STEP 10: DIAGNOSTIC SUMMARY ===');
    
    // Compare database states before and after
    const dbTaskBefore = tasksBefore.find(t => t.id === taskToToggle.id);
    const dbTaskAfter = tasksAfter.find(t => t.id === taskToToggle.id);
    
    console.log('DATABASE STATE COMPARISON:');
    console.log(`Before toggle: ${dbTaskBefore ? `completed=${dbTaskBefore.completed}` : 'Task not found'}`);
    console.log(`After toggle: ${dbTaskAfter ? `completed=${dbTaskAfter.completed}` : 'Task not found'}`);
    
    // Compare API responses
    console.log('\nAPI RESPONSE COMPARISON:');
    console.log(`Initial state: ${taskToToggle.completed}`);
    console.log(`After toggle: ${apiToggledTask ? apiToggledTask.completed : 'Task not found'}`);
    console.log(`After reload: ${taskAfterReload ? taskAfterReload.completed : 'Task not found'}`);
    
    // Identify the failure point (if any)
    let failurePoint = null;
    
    if (testData.putResponse && testData.putResponse.status !== 200) {
      failurePoint = 'API_ERROR';
    } else if (!dbTaskAfter) {
      failurePoint = 'DATABASE_MISSING';
    } else if (dbTaskAfter.completed !== newCompletionState) {
      failurePoint = 'DATABASE_UPDATE_FAILED';
    } else if (!apiToggledTask) {
      failurePoint = 'API_RESPONSE_MISSING';
    } else if (apiToggledTask.completed !== newCompletionState) {
      failurePoint = 'API_STATE_INCORRECT';
    } else if (!taskAfterReload) {
      failurePoint = 'RELOAD_TASK_MISSING';
    } else if (taskAfterReload.completed !== newCompletionState) {
      failurePoint = 'PERSISTENCE_FAILED';
    }
    
    if (failurePoint) {
      console.log('\n❌ IDENTIFIED FAILURE POINT:', failurePoint);
      
      switch(failurePoint) {
        case 'API_ERROR':
          console.log('The API returned an error when attempting to toggle the task.');
          console.log(`Status: ${testData.putResponse.status}`);
          console.log('Response:', testData.putResponse.body);
          break;
          
        case 'DATABASE_MISSING':
          console.log('The task disappeared from the database after the toggle attempt.');
          break;
          
        case 'DATABASE_UPDATE_FAILED':
          console.log('The database update did not change the task completion state.');
          console.log(`Expected: ${newCompletionState}, Actual: ${dbTaskAfter.completed}`);
          break;
          
        case 'API_RESPONSE_MISSING':
          console.log('The task was missing from the API response after toggle.');
          break;
          
        case 'API_STATE_INCORRECT':
          console.log('The API returned the wrong completion state after toggle.');
          console.log(`Expected: ${newCompletionState}, Actual: ${apiToggledTask.completed}`);
          break;
          
        case 'RELOAD_TASK_MISSING':
          console.log('The task was missing from the API response after page reload.');
          break;
          
        case 'PERSISTENCE_FAILED':
          console.log('The task state was not persisted after page reload.');
          console.log(`Expected: ${newCompletionState}, Actual: ${taskAfterReload.completed}`);
          break;
      }
      
      console.log('\nPROBABLE ROOT CAUSE:');
      
      if (failurePoint === 'API_ERROR') {
        console.log('The API endpoint is returning an error when toggling the task.');
        console.log('Check server-side validation, authentication, or task ID resolution.');
      } else if (failurePoint === 'DATABASE_MISSING' || failurePoint === 'DATABASE_UPDATE_FAILED') {
        console.log('The database update is failing or being rolled back.');
        console.log('Check database transaction logic, constraints, or error handling.');
      } else if (failurePoint === 'API_RESPONSE_MISSING' || failurePoint === 'API_STATE_INCORRECT') {
        console.log('The API is processing the update incorrectly or returning stale data.');
        console.log('Check caching, response mapping, or query optimization.');
      } else {
        console.log('The persistence mechanism is failing between requests.');
        console.log('Check for race conditions, state reset, or session issues.');
      }
    } else {
      console.log('\n✅ SUCCESS: No failure point detected. Task toggle worked correctly.');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error(error);
  } finally {
    // Clean up
    await browser.close();
    pool.end();
  }
}

// Run the test
runTest();