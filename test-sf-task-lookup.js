/**
 * Task UUID Lookup Test Script
 * 
 * This test script:
 * 1. Sends a PUT request to update a SuccessFactor task using a clean UUID
 * 2. Verifies the server correctly finds the task despite it having a compound ID in the database
 * 3. Tests our newly implemented clean UUID matching in projectsDb.ts
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Test configuration
const CONFIG = {
  projectId: 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8',
  baseUrl: 'http://localhost:5000',
  credentials: {
    username: 'greg@confluity.co.uk',
    password: 'password1'
  }
};

// Utility function to clean a task ID (extract the UUID part)
function cleanTaskId(taskId) {
  if (!taskId) return '';
  return taskId.split('-').slice(0, 5).join('-');
}

// Wait for a specific amount of time (in ms)
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Authentication and test functions
async function login() {
  console.log('🔑 Logging in...');
  const loginResponse = await fetch(`${CONFIG.baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CONFIG.credentials),
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.text();
    throw new Error(`Login failed: ${error}`);
  }

  // Extract the session cookie
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader : '';
  console.log('✅ Login successful, obtained session cookie');
  return cookies;
}

// Fetch tasks for a project
async function getTasks(cookieHeader) {
  console.log(`📋 Fetching tasks for project ${CONFIG.projectId}...`);
  const response = await fetch(`${CONFIG.baseUrl}/api/projects/${CONFIG.projectId}/tasks`, {
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch tasks: ${error}`);
  }

  const tasks = await response.json();
  console.log(`✅ Fetched ${tasks.length} tasks for project ${CONFIG.projectId}`);
  
  // Save tasks to a file for inspection
  fs.writeFileSync('tasks-fetched.json', JSON.stringify(tasks, null, 2));
  
  // Find a task with a compound ID (likely a factor task)
  const factorTask = tasks.find(task => 
    task.origin === 'factor' && 
    task.id && 
    task.id.includes('-') && 
    task.id.split('-').length > 5
  );
  
  if (!factorTask) {
    console.log('⚠️ No factor tasks with compound IDs found');
    // Try to find any task if no factor tasks are available
    return tasks.find(task => task.id && task.id.includes('-'));
  }
  
  console.log('✅ Found a factor task with a compound ID:', factorTask.id);
  return factorTask;
}

// Test updating a task using a CLEAN UUID (despite the task having a compound ID in the DB)
async function toggleTaskWithCleanUuid(cookieHeader, task) {
  // Extract the "clean" UUID part from the compound task ID
  const originalId = task.id;
  const cleanId = cleanTaskId(task.id);
  
  console.log(`🧪 Testing task update with clean UUID:
  - Original Task ID: ${originalId}
  - Clean UUID extracted: ${cleanId}
  - Current completion state: ${task.completed}
  `);

  // Prepare the update data - toggle the completion state
  const updateData = {
    completed: !task.completed
  };

  // Construct endpoint with CLEAN UUID
  const endpoint = `${CONFIG.baseUrl}/api/projects/${CONFIG.projectId}/tasks/${cleanId}`;
  console.log(`📡 Sending PUT request to: ${endpoint}`);
  
  // Send the update request using the clean UUID
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });

  // Log the full response for debugging
  console.log(`🔍 Response Status:`, response.status, response.statusText);
  
  // Parse and log the response body
  try {
    const responseText = await response.text();
    const responseBody = responseText ? JSON.parse(responseText) : {};
    console.log('📄 Response Body:', responseBody);
    
    if (response.ok) {
      console.log(`✅ SUCCESS: Task update with clean UUID ${cleanId} worked!`);
      return true;
    } else {
      console.log(`❌ FAILED: Task update with clean UUID ${cleanId} failed with status ${response.status}`);
      console.log(`Error message: ${responseBody.message || responseBody.error || 'Unknown error'}`);
      return false;
    }
  } catch (e) {
    console.log('⚠️ Could not parse response:', e.message);
    return false;
  }
}

// Verify that the task update persisted by fetching it again
async function verifyTaskPersistence(cookieHeader, taskId, expectedCompletionState) {
  console.log(`🔍 Verifying task persistence for ${taskId}...`);
  
  // Wait briefly to ensure database updates are complete
  await wait(500);
  
  const tasks = await getTasks(cookieHeader);
  const updatedTask = tasks.find(t => t.id === taskId);
  
  if (!updatedTask) {
    console.log(`❌ VERIFICATION FAILED: Task ${taskId} not found after update`);
    return false;
  }
  
  if (updatedTask.completed === expectedCompletionState) {
    console.log(`✅ VERIFICATION PASSED: Task ${taskId} completion state is ${updatedTask.completed} as expected`);
    return true;
  } else {
    console.log(`❌ VERIFICATION FAILED: Task ${taskId} completion state is ${updatedTask.completed}, expected ${expectedCompletionState}`);
    return false;
  }
}

// Run the test
async function runTest() {
  console.log('🚀 Starting Task UUID Lookup Test');
  console.log('==================================');
  
  try {
    // Log in to obtain a session cookie
    const cookieHeader = await login();
    
    // Get all tasks and find a factor task with a compound ID for testing
    const taskToTest = await getTasks(cookieHeader);
    if (!taskToTest) {
      console.log('❌ TEST ABORTED: No suitable tasks found for testing');
      return;
    }
    
    // Remember the original completion state for verification
    const originalCompletionState = taskToTest.completed;
    const expectedCompletionState = !originalCompletionState;
    
    // Test updating the task using the clean UUID
    const updateSuccess = await toggleTaskWithCleanUuid(cookieHeader, taskToTest);
    
    if (updateSuccess) {
      // Verify the persistence of the change
      const verificationSuccess = await verifyTaskPersistence(
        cookieHeader, 
        taskToTest.id, 
        expectedCompletionState
      );
      
      if (verificationSuccess) {
        console.log('✅ TEST PASSED: Task update with clean UUID works and changes persist!');
      } else {
        console.log('❌ TEST FAILED: Task update worked but changes did not persist correctly.');
      }
    } else {
      console.log('❌ TEST FAILED: Could not update task with clean UUID.');
    }
    
  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    console.error(error.stack);
  }
  
  console.log('==================================');
  console.log('🏁 Task UUID Lookup Test Complete');
}

// Execute the test
runTest();