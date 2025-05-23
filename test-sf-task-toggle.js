/**
 * Success Factor Task Toggle Test
 * 
 * This test creates a new project and verifies that toggling a Success Factor task
 * correctly persists its state in both the UI and database.
 */
import { test, expect } from '@playwright/test';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'greg@confluity.co.uk', 
  password: 'tcof123'
};

// Utilities for database queries
async function getProjectTasks(projectId) {
  console.log(`Querying database for tasks in project ${projectId}...`);
  const result = await db.execute(sql`
    SELECT id, source_id AS sourceId, origin, completed, text
    FROM project_tasks
    WHERE project_id = ${projectId}
    ORDER BY id
  `);
  return result.rows || [];
}

test('Success Factor task toggle persistence test', async ({ page }) => {
  // Enable verbose logging of requests and responses
  page.on('request', request => {
    if (request.url().includes('/api/projects/') && request.url().includes('/tasks')) {
      console.log(`[NETWORK] Request: ${request.method()} ${request.url()}`);
      if (request.method() === 'PUT') {
        console.log(`[NETWORK] Request payload:`, request.postData());
      }
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/projects/') && response.url().includes('/tasks')) {
      console.log(`[NETWORK] Response: ${response.status()} for ${response.url()}`);
      try {
        const data = await response.json();
        console.log('[NETWORK] Response body:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('[NETWORK] Could not parse response as JSON');
      }
    }
  });
  
  // Capture console logs from the browser
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  let projectId;
  let taskId;
  let tasksBefore;
  let tasksAfter;
  
  console.log('Step 1: Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="username"]', TEST_USER.username);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  
  // Wait for login to complete
  await page.waitForURL('**/dashboard');
  console.log('Login successful!');
  
  console.log('Step 2: Creating a new project...');
  await page.goto(`${BASE_URL}/projects/new`);
  
  // Fill out the project creation form
  const projectName = `Test Project ${Date.now()}`;
  await page.fill('input[name="projectName"]', projectName);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to new project page
  await page.waitForNavigation();
  
  // Extract project ID from URL
  const url = page.url();
  projectId = url.split('/projects/')[1].split('/')[0];
  console.log(`Created new project '${projectName}' with ID: ${projectId}`);
  
  console.log('Step 3: Navigating to project checklist...');
  await page.goto(`${BASE_URL}/projects/${projectId}/checklist`);
  
  // Wait for the checklist to load (a reasonable timeout)
  console.log('Waiting for checklist to load...');
  await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
  
  // Get all tasks from the database before toggle
  console.log('Step 4: Get tasks from database BEFORE toggle...');
  tasksBefore = await getProjectTasks(projectId);
  console.log(`Found ${tasksBefore.length} tasks in database before toggle:`);
  console.table(tasksBefore.map(t => ({
    id: t.id,
    sourceId: t.sourceId || 'none',
    origin: t.origin,
    completed: t.completed,
    text: t.text?.substring(0, 30) || 'No text'
  })));
  
  // Find Success Factor tasks
  const successFactorTasks = tasksBefore.filter(task => 
    task.origin === 'factor' || task.origin === 'success-factor'
  );
  
  if (successFactorTasks.length === 0) {
    console.error('No Success Factor tasks found in this project. Test cannot continue.');
    expect(successFactorTasks.length).toBeGreaterThan(0);
    return;
  }
  
  // Select the first Success Factor task to toggle
  const taskToToggle = successFactorTasks[0];
  taskId = taskToToggle.id;
  
  console.log('Step 5: Selected Success Factor task to toggle:');
  console.log({
    id: taskToToggle.id,
    sourceId: taskToToggle.sourceId || 'none',
    origin: taskToToggle.origin,
    currentState: taskToToggle.completed
  });
  
  // Find the task in the UI and toggle it
  console.log('Step 6: Toggling task in UI...');
  
  // Create a promise to capture the network request
  const putRequestPromise = page.waitForRequest(request => 
    request.url().includes(`/api/projects/${projectId}/tasks/${taskId}`) && 
    request.method() === 'PUT'
  );
  
  // Create a promise to capture the network response
  const putResponsePromise = page.waitForResponse(response => 
    response.url().includes(`/api/projects/${projectId}/tasks/${taskId}`) && 
    response.request().method() === 'PUT'
  );
  
  // Find the right checkbox to click - build a selector that finds the task text and then accesses the checkbox
  const checkboxLocator = page.locator(`text=${taskToToggle.text}`).first();
  await checkboxLocator.scrollIntoViewIfNeeded();
  
  // Wait for the element to be visible and interactable
  await checkboxLocator.waitFor({ state: 'visible' });
  console.log('Found task element in the UI');
  
  // Find the closest checkbox within the parent container
  const checkbox = page.locator(`//div[contains(text(), "${taskToToggle.text}")]/ancestor::div[contains(@class, "task-card")]//input[@type="checkbox"]`);
  await checkbox.waitFor({ state: 'visible' });
  
  // Check if we've successfully found a checkbox
  const isVisible = await checkbox.isVisible();
  console.log(`Checkbox for task "${taskToToggle.text}" is ${isVisible ? 'visible' : 'not visible'}`);
  
  if (isVisible) {
    // Click the checkbox to toggle the task
    await checkbox.click();
    console.log('Clicked the checkbox to toggle task');
    
    // Get the PUT request and response
    const putRequest = await putRequestPromise;
    const putResponse = await putResponsePromise;
    
    console.log('PUT Request URL:', putRequest.url());
    console.log('PUT Request Body:', putRequest.postDataJSON());
    
    const putResponseStatus = putResponse.status();
    console.log('PUT Response Status:', putResponseStatus);
    
    let putResponseBody;
    try {
      putResponseBody = await putResponse.json();
      console.log('PUT Response Body:', putResponseBody);
    } catch (e) {
      console.log('Could not parse PUT response as JSON');
      putResponseBody = await putResponse.text();
      console.log('PUT Response Text:', putResponseBody);
    }
    
    // Wait a bit for any client-side state updates to complete
    await page.waitForTimeout(1000);
    
    // Step 7: Verify database state after toggle
    console.log('Step 7: Get tasks from database AFTER toggle...');
    tasksAfter = await getProjectTasks(projectId);
    
    console.log(`Found ${tasksAfter.length} tasks in database after toggle:`);
    console.table(tasksAfter.map(t => ({
      id: t.id,
      sourceId: t.sourceId || 'none',
      origin: t.origin,
      completed: t.completed,
      text: t.text?.substring(0, 30) || 'No text'
    })));
    
    // Find the toggled task in the database
    const toggledTaskInDb = tasksAfter.find(t => t.id === taskId);
    
    if (!toggledTaskInDb) {
      console.error('Task disappeared from database after toggle!');
      expect(toggledTaskInDb).toBeDefined();
    } else {
      console.log('Toggled task in database:', toggledTaskInDb);
      
      // Get the actual completion state
      const newCompletionState = !taskToToggle.completed;
      const dbCompletionState = toggledTaskInDb.completed;
      
      // Check if the database state matches the expected new state
      const databaseToggleSuccessful = dbCompletionState === newCompletionState;
      console.log(`Database toggle successful: ${databaseToggleSuccessful}`);
      console.log(`  - Original state: ${taskToToggle.completed}`);
      console.log(`  - Expected new state: ${newCompletionState}`);
      console.log(`  - Actual DB state: ${dbCompletionState}`);
      
      // Step 8: Reload the page to test persistence
      console.log('Step 8: Reloading page to test persistence...');
      await page.reload();
      
      // Wait for the checklist to load again
      await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
      
      // Check if the UI shows the correct state after reload
      const checkboxAfterReload = page.locator(`//div[contains(text(), "${taskToToggle.text}")]/ancestor::div[contains(@class, "task-card")]//input[@type="checkbox"]`);
      await checkboxAfterReload.waitFor({ state: 'visible' });
      
      const isCheckedAfterReload = await checkboxAfterReload.isChecked();
      console.log(`Task checkbox is ${isCheckedAfterReload ? 'checked' : 'unchecked'} after page reload`);
      
      // UI persistence check
      const uiPersistenceSuccessful = isCheckedAfterReload === newCompletionState;
      console.log(`UI persistence successful: ${uiPersistenceSuccessful}`);
      
      // Final assertions
      expect(putResponseStatus).toBe(200);
      expect(databaseToggleSuccessful).toBe(true);
      expect(uiPersistenceSuccessful).toBe(true);
    }
  } else {
    console.error('Could not find the checkbox to toggle the task');
    expect(isVisible).toBe(true);
  }
  
  // Final summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Project ID: ${projectId}`);
  console.log(`Task ID: ${taskId}`);
  
  // Display task counts
  const originalSFCount = tasksBefore.filter(t => t.origin === 'factor' || t.origin === 'success-factor').length;
  const afterSFCount = tasksAfter.filter(t => t.origin === 'factor' || t.origin === 'success-factor').length;
  
  console.log(`Success Factor tasks before: ${originalSFCount}`);
  console.log(`Success Factor tasks after: ${afterSFCount}`);
  
  // Overall outcome
  if (originalSFCount === afterSFCount) {
    console.log('✅ Task count consistency check passed');
  } else {
    console.log('❌ Task count changed unexpectedly');
  }
  
  // Compare the specific task
  const beforeTask = tasksBefore.find(t => t.id === taskId);
  const afterTask = tasksAfter.find(t => t.id === taskId);
  
  if (beforeTask && afterTask) {
    console.log('✅ Task exists in before and after states');
    
    if (afterTask.completed !== beforeTask.completed) {
      console.log('✅ Task completion state changed as expected');
    } else {
      console.log('❌ Task completion state did not change');
    }
  } else if (!beforeTask) {
    console.log('❌ Task not found in before state');
  } else {
    console.log('❌ Task disappeared after toggle');
  }
});