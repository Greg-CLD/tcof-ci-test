/**
 * Test UUID extraction logic for compound IDs
 * This script tests the server-side fix for extracting UUIDs from compound task IDs
 */

const fetch = require('node-fetch');

// Debug flag
const DEBUG = true;

// Configuration
const API_HOST = 'http://localhost:5000';  // Express server
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TEST_CREDENTIALS = {
  username: 'greg@confluity.co.uk',
  password: 'password'
};

// Sample compound ID to test - a known SuccessFactor task ID
const TEST_COMPOUND_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-9981d938';
const EXPECTED_EXTRACTED_UUID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

// Store cookies from authentication for subsequent requests
let cookies = {};

// Helper function for nice logging
function logStep(step, message) {
  console.log(`\n===== ${step}: ${message} =====`);
}

// Helper function for detailed test output
function logTestOutput(title, data) {
  console.log(`\n----- ${title} -----`);
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

/**
 * Login and get session cookie
 */
async function login() {
  logStep('STEP 1', 'Authenticating');
  
  try {
    const response = await fetch(`${API_HOST}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS)
    });
    
    if (!response.ok) {
      throw new Error(`Login failed with status ${response.status}`);
    }
    
    // Save cookies for subsequent requests
    const setCookies = response.headers.raw()['set-cookie'] || [];
    setCookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name] = value;
    });
    
    logTestOutput('Login successful', 'Authentication completed');
    
    // Return cookie string for subsequent requests
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  } catch (error) {
    logTestOutput('Login error', error.message);
    throw error;
  }
}

/**
 * Toggle a specific task's completion status
 */
async function updateTaskCompletion(cookieHeader, taskId, newCompletionStatus) {
  logStep('STEP 2', `Updating task ${taskId} completion to ${newCompletionStatus}`);
  
  try {
    const response = await fetch(`${API_HOST}/api/projects/${TEST_PROJECT_ID}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        completed: newCompletionStatus
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logTestOutput('API Error Response', errorText);
      throw new Error(`Failed to update task: ${response.status}`);
    }
    
    const updatedTask = await response.json();
    logTestOutput('Task update successful', updatedTask);
    
    // Verify the update was applied correctly
    if (updatedTask.completed !== newCompletionStatus) {
      throw new Error(`Task update failed: expected completion to be ${newCompletionStatus}, got ${updatedTask.completed}`);
    }
    
    return updatedTask;
  } catch (error) {
    logTestOutput('Update Error', error.message);
    throw error;
  }
}

/**
 * Verify task is correctly persisted after update
 */
async function verifyTaskPersistence(cookieHeader, taskId, expectedCompletionState) {
  logStep('STEP 3', `Verifying persistence for task ${taskId}`);
  
  try {
    // Fetch tasks
    const response = await fetch(`${API_HOST}/api/projects/${TEST_PROJECT_ID}/tasks`, {
      headers: { 'Cookie': cookieHeader }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get tasks: ${response.status}`);
    }
    
    const tasks = await response.json();
    
    // Find our task
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found after update`);
    }
    
    logTestOutput('Task state after refresh', {
      id: task.id,
      completed: task.completed,
      text: task.text,
      origin: task.origin
    });
    
    // Verify completion state matches what we expect
    if (task.completed !== expectedCompletionState) {
      throw new Error(`Persistence verification failed: expected completion ${expectedCompletionState}, got ${task.completed}`);
    }
    
    logTestOutput('Persistence Verification', 'SUCCESS - Task state correctly persisted');
    return true;
  } catch (error) {
    logTestOutput('Persistence Verification Error', error.message);
    throw error;
  }
}

/**
 * Run the complete test
 */
async function runTest() {
  try {
    // Login and get cookie for authenticated requests
    const cookieHeader = await login();
    
    // Get initial completion state for this test task
    const initialTaskState = false;
    
    // Update the task with our test compound ID
    // This is where our server-side UUID extraction code will be tested
    const updatedTask = await updateTaskCompletion(
      cookieHeader,
      TEST_COMPOUND_ID, // Use the compound ID format
      !initialTaskState  // Toggle the completion state
    );
    
    // Verify the task state persisted after reload
    const persistenceVerified = await verifyTaskPersistence(
      cookieHeader,
      TEST_COMPOUND_ID, // Use the same compound ID to verify
      !initialTaskState  // Expect the toggled state
    );
    
    // If we get here, the test succeeded!
    const result = {
      success: true,
      compoundIdTested: TEST_COMPOUND_ID,
      expectedExtractedUuid: EXPECTED_EXTRACTED_UUID,
      completionStateChanged: true,
      persistenceVerified: persistenceVerified,
      message: "UUID extraction is working correctly on the server!"
    };
    
    logStep('TEST RESULT', 'SUCCESS');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    // Test failed
    const result = {
      success: false,
      error: error.message,
      compoundIdTested: TEST_COMPOUND_ID,
      expectedExtractedUuid: EXPECTED_EXTRACTED_UUID,
      message: "UUID extraction test failed"
    };
    
    logStep('TEST RESULT', 'FAILED');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  }
}

// Run the test
runTest();