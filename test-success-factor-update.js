/**
 * Smoke test for SuccessFactor task updates
 * 
 * This script tests the fixed PUT endpoint by:
 * 1. Authenticating with the server
 * 2. Fetching a project's tasks
 * 3. Finding a SuccessFactor task with a compound ID
 * 4. Toggling its completion status
 * 5. Verifying the update was persisted
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const API_HOST = 'http://localhost:5000'; // Default port for Express server
const USERNAME = 'greg@confluity.co.uk';
const PASSWORD = 'password';
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'; // Update with a valid project ID

// Store cookies
let cookies = {};

// Debug output helper
function log(label, obj) {
  console.log(`\n===== ${label} =====`);
  if (typeof obj === 'object') {
    console.log(JSON.stringify(obj, null, 2));
  } else {
    console.log(obj);
  }
}

// Login function
async function login() {
  log('LOGIN', 'Authenticating...');
  
  try {
    const loginResponse = await fetch(`${API_HOST}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    // Save cookies for subsequent requests
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || [];
    setCookieHeaders.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name] = value;
    });
    
    log('LOGIN SUCCESSFUL', 'Authentication successful');
    
    // Save cookie string for easy reuse
    const cookieHeader = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    
    return cookieHeader;
  } catch (error) {
    log('LOGIN ERROR', error.message);
    throw error;
  }
}

// Function to get project tasks
async function getTasks(cookieHeader) {
  log('FETCHING TASKS', `Getting tasks for project ${TEST_PROJECT_ID}...`);
  
  try {
    const tasksResponse = await fetch(`${API_HOST}/api/projects/${TEST_PROJECT_ID}/tasks`, {
      headers: { 'Cookie': cookieHeader }
    });
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to get tasks: ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    log('TASKS FETCHED', `Found ${tasks.length} tasks`);
    return tasks;
  } catch (error) {
    log('FETCH TASKS ERROR', error.message);
    throw error;
  }
}

// Function to update a task's completion status
async function toggleTaskCompletion(cookieHeader, task) {
  const newCompletionStatus = !task.completed;
  log('UPDATING TASK', `Toggling task ${task.id} completion to ${newCompletionStatus}`);
  
  try {
    const updateResponse = await fetch(`${API_HOST}/api/projects/${TEST_PROJECT_ID}/tasks/${task.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        completed: newCompletionStatus
      })
    });
    
    if (!updateResponse.ok) {
      log('API ERROR RESPONSE', await updateResponse.text());
      throw new Error(`Failed to update task: ${updateResponse.status}`);
    }
    
    const updatedTask = await updateResponse.json();
    log('TASK UPDATED', updatedTask);
    return updatedTask;
  } catch (error) {
    log('UPDATE TASK ERROR', error.message);
    throw error;
  }
}

// Function to verify task persistence after update
async function verifyTaskPersistence(cookieHeader, taskId, expectedCompletionState) {
  log('VERIFYING PERSISTENCE', `Checking if task ${taskId} was updated to ${expectedCompletionState}`);
  
  try {
    // Fetch all tasks again
    const tasks = await getTasks(cookieHeader);
    
    // Find our task
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found after update`);
    }
    
    // Check completion status
    if (task.completed !== expectedCompletionState) {
      throw new Error(`Task completion mismatch: expected ${expectedCompletionState}, got ${task.completed}`);
    }
    
    log('PERSISTENCE VERIFIED', `Task ${taskId} correctly persisted with completion = ${task.completed}`);
    return true;
  } catch (error) {
    log('VERIFICATION ERROR', error.message);
    throw error;
  }
}

// Main test function
async function runTest() {
  try {
    // Step 1: Login
    const cookieHeader = await login();
    
    // Step 2: Get tasks
    const tasks = await getTasks(cookieHeader);
    
    // Step 3: Find a SuccessFactor task with a compound ID
    const successFactorTasks = tasks.filter(task => 
      (task.origin === 'factor' || task.origin === 'success-factor') && 
      task.id && task.id.includes('-')
    );
    
    if (successFactorTasks.length === 0) {
      log('NO TEST TASKS', 'No SuccessFactor tasks found with compound IDs');
      return;
    }
    
    // Use the first task for testing
    const testTask = successFactorTasks[0];
    log('SELECTED TEST TASK', testTask);
    
    // Step 4: Toggle task completion
    const updatedTask = await toggleTaskCompletion(cookieHeader, testTask);
    
    // Step 5: Verify persistence
    await verifyTaskPersistence(cookieHeader, testTask.id, updatedTask.completed);
    
    log('TEST COMPLETED', 'SuccessFactor task update test passed!');
    
    // Return the test result as JSON for easy parsing
    const testResult = {
      success: true,
      taskId: testTask.id,
      taskOrigin: testTask.origin,
      originalCompletionState: testTask.completed,
      newCompletionState: updatedTask.completed,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n===== TEST RESULT =====');
    console.log(JSON.stringify(testResult, null, 2));
    
    return testResult;
  } catch (error) {
    log('TEST FAILED', error.message);
    
    // Return failure result
    const failureResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n===== TEST RESULT =====');
    console.log(JSON.stringify(failureResult, null, 2));
    
    return failureResult;
  }
}

// Run the test
const result = await runTest();

// Export the result for potential use as a module
export default result;