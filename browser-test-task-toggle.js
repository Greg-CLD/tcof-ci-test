/**
 * Success Factor Task Toggle Browser Test
 * 
 * This script uses Playwright to run a headless browser test that:
 * 1. Logs in as a test user
 * 2. Creates a new project
 * 3. Navigates to the checklist page
 * 4. Toggles a Success Factor task
 * 5. Verifies task state persistence
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'greg@confluity.co.uk', 
  password: 'tcof123'
};

async function runTest() {
  console.log('=== SUCCESS FACTOR TASK TOGGLE TEST ===');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down operations for visibility
  });
  
  const context = await browser.newContext();
  
  // Enable request/response logging
  context.on('request', request => {
    if (request.url().includes('/api/projects/') && request.url().includes('/tasks')) {
      console.log(`REQUEST: ${request.method()} ${request.url()}`);
      if (request.method() === 'PUT') {
        console.log(`Request Body: ${request.postData()}`);
      }
    }
  });
  
  context.on('response', async response => {
    if (response.url().includes('/api/projects/') && response.url().includes('/tasks')) {
      const status = response.status();
      const url = response.url();
      console.log(`RESPONSE: ${status} ${url}`);
      
      try {
        if (response.headers()['content-type']?.includes('application/json')) {
          const json = await response.json();
          console.log('Response Body:', JSON.stringify(json, null, 2));
        }
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    }
  });
  
  // Create a new page
  const page = await context.newPage();
  
  // Log all console messages
  page.on('console', msg => {
    console.log(`BROWSER: ${msg.type()}: ${msg.text()}`);
  });
  
  try {
    // Step 1: Login
    console.log('\n=== STEP 1: LOGIN ===');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL('**/dashboard');
    console.log('Login successful!');
    
    // Step 2: Create a new project
    console.log('\n=== STEP 2: CREATE NEW PROJECT ===');
    await page.goto(`${BASE_URL}/projects/new`);
    
    const projectName = `Test Project ${Date.now()}`;
    await page.fill('input[name="projectName"]', projectName);
    await page.click('button[type="submit"]');
    
    // Wait for project creation and redirection
    await page.waitForNavigation();
    
    // Extract the project ID from the URL
    const url = page.url();
    const projectId = url.split('/projects/')[1].split('/')[0];
    console.log(`Created project "${projectName}" with ID: ${projectId}`);
    
    // Save project data for database queries
    fs.writeFileSync('current-project.json', JSON.stringify({
      id: projectId,
      name: projectName,
      timestamp: new Date().toISOString()
    }));
    
    // Step 3: Navigate to the project's checklist page
    console.log('\n=== STEP 3: NAVIGATE TO CHECKLIST ===');
    await page.goto(`${BASE_URL}/projects/${projectId}/checklist`);
    
    // Wait for checklist to load
    try {
      // Wait for the container that holds tasks
      await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
      console.log('Checklist page loaded successfully');
    } catch (e) {
      console.log('Could not find checklist container, trying alternative selector');
      // Try an alternative approach - wait for general page content
      await page.waitForSelector('div.card', { timeout: 10000 });
    }
    
    // Wait a bit more for tasks to load
    await page.waitForTimeout(2000);
    
    // Get all tasks from the API
    console.log('\n=== STEP 4: GET TASKS BEFORE TOGGLE ===');
    
    // Use the browser's fetch to get tasks
    const tasksBefore = await page.evaluate(async (projectId) => {
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
    
    console.log(`Retrieved ${tasksBefore.length} tasks in total`);
    
    // Find Success Factor tasks
    const successFactorTasks = tasksBefore.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found in this project');
    }
    
    // Select a task to toggle
    const taskToToggle = successFactorTasks[0];
    console.log('\n=== SELECTED TASK TO TOGGLE ===');
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Source ID: ${taskToToggle.sourceId || 'N/A'}`);
    console.log(`Current state: ${taskToToggle.completed}`);
    
    // Save task state before toggle
    fs.writeFileSync('task-before-toggle.json', JSON.stringify(taskToToggle, null, 2));
    const newCompletionState = !taskToToggle.completed;
    
    // Step 5: Toggle the task
    console.log('\n=== STEP 5: TOGGLE TASK ===');
    
    // Look for the specific task by its text content
    const taskText = taskToToggle.text;
    
    // Create a promise to capture the network request
    const putRequestPromise = page.waitForRequest(request => 
      request.url().includes(`/api/projects/${projectId}/tasks/${taskToToggle.id}`) && 
      request.method() === 'PUT'
    );
    
    // Create a promise to capture the network response
    const putResponsePromise = page.waitForResponse(response => 
      response.url().includes(`/api/projects/${projectId}/tasks/${taskToToggle.id}`) && 
      response.request().method() === 'PUT'
    );
    
    // Log all text on the page for debugging
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page Text Snippet:', pageText.substring(0, 300) + '...');
    
    // Try to find the task by its text
    console.log(`Looking for task with text: "${taskText}"`);
    
    // Try several selector strategies
    let foundTask = false;
    
    // Strategy 1: Look for exact text match
    try {
      const taskElement = await page.waitForSelector(`text="${taskText}"`, { timeout: 5000 });
      if (taskElement) {
        console.log('Found task by exact text match');
        foundTask = true;
        
        // Find the nearest checkbox
        const checkbox = await page.locator(`text="${taskText}" >> xpath=ancestor::div[contains(@class, "task")]//input[@type="checkbox"]`).first();
        
        if (await checkbox.count() > 0) {
          console.log('Found checkbox, clicking it');
          await checkbox.click();
          console.log('Clicked checkbox to toggle task');
        } else {
          console.log('Could not find checkbox near task text');
        }
      }
    } catch (e) {
      console.log('Could not find task by exact text match');
    }
    
    // Strategy 2: If not found, look for any checkbox
    if (!foundTask) {
      try {
        console.log('Trying to find any checkbox in the checklist');
        const checkbox = await page.locator('input[type="checkbox"]').first();
        
        if (await checkbox.count() > 0) {
          console.log('Found a checkbox, clicking it');
          await checkbox.click();
          console.log('Clicked checkbox to toggle some task');
        } else {
          throw new Error('No checkboxes found on the page');
        }
      } catch (e) {
        console.error('Could not find any checkboxes:', e);
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'checklist-page.png' });
        console.log('Saved screenshot to checklist-page.png');
        
        // As a fallback, try direct API request
        console.log('Falling back to direct API request to toggle task');
        
        await page.evaluate(async (projectId, taskId, newState) => {
          const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ completed: newState })
          });
          
          return response.ok;
        }, projectId, taskToToggle.id, newCompletionState);
        
        console.log('Sent direct API request to toggle task');
      }
    }
    
    // Wait a bit for the toggle to complete
    await page.waitForTimeout(2000);
    
    // Step 6: Get tasks after toggle
    console.log('\n=== STEP 6: GET TASKS AFTER TOGGLE ===');
    
    // Use the browser's fetch to get tasks again
    const tasksAfter = await page.evaluate(async (projectId) => {
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
    
    console.log(`Retrieved ${tasksAfter.length} tasks after toggle`);
    
    // Find the toggled task
    const toggledTask = tasksAfter.find(task => task.id === taskToToggle.id);
    
    if (!toggledTask) {
      console.error(`Task with ID ${taskToToggle.id} not found after toggle!`);
    } else {
      console.log('\n=== TOGGLED TASK AFTER TOGGLE ===');
      console.log(`ID: ${toggledTask.id}`);
      console.log(`Text: ${toggledTask.text}`);
      console.log(`Origin: ${toggledTask.origin}`);
      console.log(`Source ID: ${toggledTask.sourceId || 'N/A'}`);
      console.log(`New state: ${toggledTask.completed}`);
      
      // Save task state after toggle
      fs.writeFileSync('task-after-toggle.json', JSON.stringify(toggledTask, null, 2));
      
      // Check if toggle was successful
      const toggleSuccessful = toggledTask.completed === newCompletionState;
      
      if (toggleSuccessful) {
        console.log('\n✅ SUCCESS: Task toggle was successful in API response!');
      } else {
        console.log('\n❌ FAILURE: Task toggle did not register in API response!');
        console.log(`  - Original state: ${taskToToggle.completed}`);
        console.log(`  - Expected new state: ${newCompletionState}`);
        console.log(`  - Actual state: ${toggledTask.completed}`);
      }
    }
    
    // Step 7: Reload the page and check persistence
    console.log('\n=== STEP 7: RELOAD PAGE AND CHECK PERSISTENCE ===');
    await page.reload();
    
    // Wait for page to load again
    await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
    
    // Get tasks after reload
    const tasksAfterReload = await page.evaluate(async (projectId) => {
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
    
    console.log(`Retrieved ${tasksAfterReload.length} tasks after page reload`);
    
    // Find the toggled task again
    const taskAfterReload = tasksAfterReload.find(task => task.id === taskToToggle.id);
    
    if (!taskAfterReload) {
      console.error(`Task with ID ${taskToToggle.id} not found after page reload!`);
    } else {
      console.log('\n=== TASK AFTER PAGE RELOAD ===');
      console.log(`ID: ${taskAfterReload.id}`);
      console.log(`Text: ${taskAfterReload.text}`);
      console.log(`Origin: ${taskAfterReload.origin}`);
      console.log(`Source ID: ${taskAfterReload.sourceId || 'N/A'}`);
      console.log(`State after reload: ${taskAfterReload.completed}`);
      
      // Save task state after reload
      fs.writeFileSync('task-after-reload.json', JSON.stringify(taskAfterReload, null, 2));
      
      // Check if the state persisted through page reload
      const persistenceSuccessful = taskAfterReload.completed === newCompletionState;
      
      if (persistenceSuccessful) {
        console.log('\n✅ SUCCESS: Task toggle persisted after page reload!');
      } else {
        console.log('\n❌ FAILURE: Task state did not persist after page reload!');
        console.log(`  - Original state: ${taskToToggle.completed}`);
        console.log(`  - Expected state: ${newCompletionState}`);
        console.log(`  - Actual state after reload: ${taskAfterReload.completed}`);
      }
    }
    
    // Final summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Project ID: ${projectId}`);
    console.log(`Task ID: ${taskToToggle.id}`);
    console.log(`Original State: ${taskToToggle.completed}`);
    console.log(`Target State: ${newCompletionState}`);
    
    if (toggledTask) {
      console.log(`State After Toggle: ${toggledTask.completed}`);
      console.log(`Toggle Success: ${toggledTask.completed === newCompletionState}`);
    } else {
      console.log(`Toggle Success: FAILED (task not found after toggle)`);
    }
    
    if (taskAfterReload) {
      console.log(`State After Reload: ${taskAfterReload.completed}`);
      console.log(`Persistence Success: ${taskAfterReload.completed === newCompletionState}`);
    } else {
      console.log(`Persistence Success: FAILED (task not found after reload)`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close browser
    await browser.close();
  }
}

// Run the test
runTest();