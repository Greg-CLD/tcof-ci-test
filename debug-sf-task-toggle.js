/**
 * Success Factor Task Toggle Diagnostic Test
 * 
 * This script performs an end-to-end test of the Success Factor task toggle functionality:
 * 1. Creates a new project via the UI
 * 2. Opens the project's checklist tab
 * 3. Gets all tasks for the project before the toggle (API and DB)
 * 4. Toggles the first Success Factor task
 * 5. Gets all tasks for the project after the toggle (API and DB)
 * 6. Reloads the page to verify persistence
 * 
 * The script logs all API requests, responses, and DB states to diagnose any issues.
 */

import { chromium } from 'playwright';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';

// Configuration
const APP_URL = 'http://localhost:3000';
const DEBUG = true;
let CURRENT_PROJECT_ID = null;
let TOGGLED_TASK_ID = null;

// Launch browser
async function runTest() {
  console.log('=== SUCCESS FACTOR TASK TOGGLE DIAGNOSTIC TEST ===\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Login
    await login(page);
    
    // Step 2: Create a new test project
    CURRENT_PROJECT_ID = await createNewProject(page);
    console.log(`\n✅ Created new project with ID: ${CURRENT_PROJECT_ID}`);
    
    // Step 3: Navigate to the project's checklist page
    await navigateToChecklist(page);
    console.log(`\n✅ Navigated to checklist page for project ${CURRENT_PROJECT_ID}`);
    
    // Step 4: Get tasks from API before toggle
    console.log('\n=== TASKS BEFORE TOGGLE ===');
    const tasksBefore = await getTasksFromApi(page);
    console.log(`Retrieved ${tasksBefore.length} tasks from API`);
    
    // Step 5: Get tasks from DB before toggle
    const dbTasksBefore = await getTasksFromDatabase(CURRENT_PROJECT_ID);
    console.log(`Retrieved ${dbTasksBefore.length} tasks from database`);
    
    // Find all Success Factor tasks
    const successFactorTasks = tasksBefore.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      throw new Error('No Success Factor tasks found for this project. Test cannot continue.');
    }
    
    // Select the first Success Factor task to toggle
    const taskToToggle = successFactorTasks[0];
    TOGGLED_TASK_ID = taskToToggle.id;
    console.log('\n=== TASK TO TOGGLE ===');
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Current completion state: ${taskToToggle.completed}`);
    console.log(`Source ID: ${taskToToggle.sourceId || 'none'}`);
    
    // Step 6: Find and toggle the task in the UI
    console.log('\n=== TOGGLING TASK ===');
    await toggleTaskInUI(page, taskToToggle);
    
    // Give the UI and server time to process the toggle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 7: Get tasks from API after toggle
    console.log('\n=== TASKS AFTER TOGGLE ===');
    const tasksAfter = await getTasksFromApi(page);
    console.log(`Retrieved ${tasksAfter.length} tasks from API`);
    
    // Step 8: Get tasks from DB after toggle
    const dbTasksAfter = await getTasksFromDatabase(CURRENT_PROJECT_ID);
    console.log(`Retrieved ${dbTasksAfter.length} tasks from database`);
    
    // Find the toggled task in the after data
    const toggledTaskAfter = tasksAfter.find(task => task.id === TOGGLED_TASK_ID);
    
    if (toggledTaskAfter) {
      console.log('\n=== TOGGLED TASK AFTER ===');
      console.log(`ID: ${toggledTaskAfter.id}`);
      console.log(`Text: ${toggledTaskAfter.text}`);
      console.log(`Origin: ${toggledTaskAfter.origin}`);
      console.log(`New completion state: ${toggledTaskAfter.completed}`);
      console.log(`Was toggle successful: ${toggledTaskAfter.completed !== taskToToggle.completed}`);
    } else {
      console.log('\n❌ ERROR: Could not find toggled task in API response after toggle');
    }
    
    // Step 9: Reload the page to verify persistence
    console.log('\n=== RELOADING PAGE TO VERIFY PERSISTENCE ===');
    await page.reload();
    
    // Wait for the page to load
    await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
    
    // Step 10: Get tasks from API after reload
    const tasksAfterReload = await getTasksFromApi(page);
    console.log(`Retrieved ${tasksAfterReload.length} tasks from API after reload`);
    
    // Find the toggled task in the after-reload data
    const toggledTaskAfterReload = tasksAfterReload.find(task => task.id === TOGGLED_TASK_ID);
    
    if (toggledTaskAfterReload) {
      console.log('\n=== TOGGLED TASK AFTER RELOAD ===');
      console.log(`ID: ${toggledTaskAfterReload.id}`);
      console.log(`Text: ${toggledTaskAfterReload.text}`);
      console.log(`Origin: ${toggledTaskAfterReload.origin}`);
      console.log(`Persisted completion state: ${toggledTaskAfterReload.completed}`);
      
      // Check if the completion state persisted correctly
      const persistenceSuccessful = toggledTaskAfterReload.completed === toggledTaskAfter.completed;
      
      if (persistenceSuccessful) {
        console.log('\n✅ SUCCESS: Task completion state persisted after page reload');
      } else {
        console.log('\n❌ ERROR: Task completion state did NOT persist after page reload');
        console.log(`  - Before reload: ${toggledTaskAfter.completed}`);
        console.log(`  - After reload: ${toggledTaskAfterReload.completed}`);
      }
    } else {
      console.log('\n❌ ERROR: Could not find toggled task in API response after reload');
    }
    
    // Step 11: Compare database states (before, after, after-reload)
    console.log('\n=== DATABASE STATE COMPARISON ===');
    
    // Get current DB state
    const dbTasksFinal = await getTasksFromDatabase(CURRENT_PROJECT_ID);
    
    // Find the toggled task in each DB state
    const dbTaskBefore = dbTasksBefore.find(task => task.id === TOGGLED_TASK_ID);
    const dbTaskAfter = dbTasksAfter.find(task => task.id === TOGGLED_TASK_ID);
    const dbTaskFinal = dbTasksFinal.find(task => task.id === TOGGLED_TASK_ID);
    
    console.log('DB state comparison summary:');
    console.log(`- Initial state: ${dbTaskBefore ? `completed=${dbTaskBefore.completed}` : 'Task not found in DB'}`);
    console.log(`- After toggle: ${dbTaskAfter ? `completed=${dbTaskAfter.completed}` : 'Task not found in DB'}`);
    console.log(`- After reload: ${dbTaskFinal ? `completed=${dbTaskFinal.completed}` : 'Task not found in DB'}`);
    
    // Final analysis
    console.log('\n=== FINAL ANALYSIS ===');
    
    // Check if we had all the tasks at every step
    const hasMissingTasks = !dbTaskBefore || !dbTaskAfter || !dbTaskFinal || !toggledTaskAfter || !toggledTaskAfterReload;
    
    if (hasMissingTasks) {
      console.log('❌ ISSUE DETECTED: Task disappeared during the test process');
      if (!dbTaskBefore) console.log('- Task was never in the database initially');
      if (!dbTaskAfter) console.log('- Task disappeared from database after toggle');
      if (!dbTaskFinal) console.log('- Task disappeared from database after reload');
      if (!toggledTaskAfter) console.log('- Task disappeared from API after toggle');
      if (!toggledTaskAfterReload) console.log('- Task disappeared from API after reload');
    } else {
      const apiToggleSuccessful = toggledTaskAfter.completed !== taskToToggle.completed;
      const dbToggleSuccessful = dbTaskBefore.completed !== dbTaskAfter.completed;
      const persistenceSuccessful = toggledTaskAfterReload.completed === toggledTaskAfter.completed;
      const dbPersistenceSuccessful = dbTaskFinal.completed === dbTaskAfter.completed;
      
      if (apiToggleSuccessful && dbToggleSuccessful && persistenceSuccessful && dbPersistenceSuccessful) {
        console.log('✅ SUCCESS: The entire Success Factor task toggle flow is working correctly');
      } else {
        console.log('❌ ISSUE DETECTED: Something failed in the task toggle process');
        if (!apiToggleSuccessful) console.log('- API toggle response did not reflect the change');
        if (!dbToggleSuccessful) console.log('- Database update failed for the toggle');
        if (!persistenceSuccessful) console.log('- Task state did not persist in API after reload');
        if (!dbPersistenceSuccessful) console.log('- Task state did not persist in database after reload');
      }
    }
  } catch (error) {
    console.error('Error running test:', error);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

// Login to the application
async function login(page) {
  console.log('Logging in...');
  await page.goto(`${APP_URL}/login`);
  
  // Fill in login form
  await page.fill('input[name="username"]', 'greg@confluity.co.uk');
  await page.fill('input[name="password"]', 'tcof123');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL('**/dashboard');
  
  console.log('Successfully logged in');
  
  // Store the session cookie for API calls
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(cookie => cookie.name.includes('connect.sid'));
  
  if (sessionCookie) {
    const cookieString = `${sessionCookie.name}=${sessionCookie.value}`;
    await fs.writeFile('current-session.txt', cookieString);
    console.log('Saved session cookie to current-session.txt');
  }
}

// Create a new project
async function createNewProject(page) {
  console.log('Creating a new project...');
  
  // Navigate to the new project page
  await page.goto(`${APP_URL}/projects/new`);
  
  // Fill in project details
  const projectName = `Test Project ${Date.now()}`;
  await page.fill('input[name="projectName"]', projectName);
  
  // Submit the form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to the project page
  await page.waitForNavigation();
  
  // Extract project ID from URL
  const url = page.url();
  const projectId = url.split('/projects/')[1].split('/')[0];
  
  console.log(`Created project: ${projectName} with ID: ${projectId}`);
  
  return projectId;
}

// Navigate to the project's checklist page
async function navigateToChecklist(page) {
  // Navigate directly to the checklist page
  await page.goto(`${APP_URL}/projects/${CURRENT_PROJECT_ID}/checklist`);
  
  // Wait for the checklist to load
  await page.waitForSelector('[data-test="checklist-container"]', { timeout: 10000 });
}

// Get tasks from the API
async function getTasksFromApi(page) {
  const response = await page.evaluate(async (projectId) => {
    const response = await fetch(`/api/projects/${projectId}/tasks?ensure=true`);
    return await response.json();
  }, CURRENT_PROJECT_ID);
  
  return response;
}

// Toggle a task in the UI
async function toggleTaskInUI(page, task) {
  console.log(`Toggling task ${task.id} in the UI...`);
  
  // Find and click on the checkbox for this task
  // This approach uses a data attribute that would ideally be added for testing
  // If no such attribute exists, we might need to identify elements more creatively
  
  // Using task text to find the element
  const taskTextSelector = `div:has-text("${task.text}")`;
  await page.waitForSelector(taskTextSelector);
  
  // Find the nearest checkbox
  const checkboxSelector = `${taskTextSelector} >> xpath=../../..//input[@type="checkbox"]`;
  
  try {
    await page.waitForSelector(checkboxSelector, { timeout: 5000 });
    await page.click(checkboxSelector);
    console.log('Clicked on task checkbox');
    
    // Intercept API call
    const [request] = await Promise.all([
      page.waitForRequest(request => 
        request.url().includes(`/api/projects/${CURRENT_PROJECT_ID}/tasks/${task.id}`) && 
        request.method() === 'PUT'
      ),
      // Make sure the click is completed
      page.waitForTimeout(1000)
    ]);
    
    console.log(`Intercepted PUT request: ${request.url()}`);
    console.log(`Request body: ${request.postData()}`);
    
  } catch (error) {
    console.error('Error toggling task:', error);
    
    // Fallback method if we can't find the specific task
    console.log('Trying fallback method to toggle a task...');
    
    // Just click the first checkbox we find
    const anyCheckbox = 'input[type="checkbox"]';
    await page.waitForSelector(anyCheckbox);
    await page.click(anyCheckbox);
    console.log('Clicked on first available checkbox');
    
    // Wait for network activity
    await page.waitForTimeout(1000);
  }
}

// Get tasks from the database
async function getTasksFromDatabase(projectId) {
  try {
    const tasks = await db.execute(sql`
      SELECT * FROM project_tasks 
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `);
    
    return tasks.rows || [];
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

// Run the test
runTest();