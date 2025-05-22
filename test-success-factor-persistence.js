/**
 * Success Factor Task Persistence Test
 * 
 * This test script verifies that our fixes for Success Factor task persistence work properly.
 * It will:
 * 1. Get all tasks for a test project
 * 2. Find a Success Factor task
 * 3. Toggle its completion state
 * 4. Verify the update is properly persisted
 * 5. Verify that all critical metadata (origin, sourceId) is preserved
 * 
 * Run this script with: node test-success-factor-persistence.js
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const BASE_URL = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const DEBUG = true;

// Track test results
const results = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  errors: []
};

// Helper functions
async function apiRequest(method, endpoint, body = null) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    
    // Configure request options
    const options = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Override': 'true' // Special header for testing without session
      }
    };
    
    if (body) {
      options.data = JSON.stringify(body);
    }
    
    if (DEBUG) {
      console.log(`[DEBUG] Sending ${method} request to ${url}`);
      if (body) {
        console.log(`[DEBUG] Request body:`, JSON.stringify(body, null, 2));
      }
    }
    
    const response = await axios(options);
    
    if (DEBUG) {
      console.log(`[DEBUG] Response status: ${response.status}`);
      console.log(`[DEBUG] Response headers:`, response.headers);
      console.log(`[DEBUG] Response body:`, JSON.stringify(response.data, null, 2));
    }
    
    return {
      status: response.status,
      headers: response.headers,
      data: response.data
    };
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`[ERROR] API error response: ${error.response.status}`);
      console.error(JSON.stringify(error.response.data, null, 2));
      
      return {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data,
        error: true
      };
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[ERROR] No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('[ERROR] Request error:', error.message);
    }
    
    throw error;
  }
}

// Test assertion functions
function assert(condition, message) {
  results.totalTests++;
  
  if (condition) {
    results.passedTests++;
    if (DEBUG) {
      console.log(`[PASS] ${message}`);
    }
    return true;
  } else {
    results.failedTests++;
    const errorMessage = `[FAIL] ${message}`;
    console.error(errorMessage);
    results.errors.push(errorMessage);
    return false;
  }
}

// Main test function
async function runSuccessFactorPersistenceTest() {
  console.log(`\n===== Success Factor Task Persistence Test =====\n`);
  console.log(`Testing project: ${PROJECT_ID}\n`);
  
  try {
    // Step 1: Get all tasks for the project
    console.log(`Step 1: Fetching all tasks for the project...`);
    const tasksResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    assert(tasksResponse.status === 200, 'Tasks API returned 200 status code');
    assert(Array.isArray(tasksResponse.data), 'Tasks API returned an array');
    assert(tasksResponse.data.length > 0, 'Tasks API returned at least one task');
    
    const allTasks = tasksResponse.data;
    console.log(`Found ${allTasks.length} total tasks`);
    
    // Step 2: Find a Success Factor task
    console.log(`\nStep 2: Looking for a Success Factor task...`);
    const successFactorTasks = allTasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    assert(successFactorTasks.length > 0, 'Found at least one Success Factor task');
    
    if (successFactorTasks.length === 0) {
      console.error('No Success Factor tasks found. Test cannot continue.');
      return;
    }
    
    // Pick the first Success Factor task for testing
    const testTask = successFactorTasks[0];
    console.log(`Selected Success Factor task: ${testTask.id}`);
    console.log(`  - text: ${testTask.text?.substring(0, 40)}...`);
    console.log(`  - origin: ${testTask.origin}`);
    console.log(`  - sourceId: ${testTask.sourceId}`);
    console.log(`  - current completion: ${testTask.completed}`);
    
    // Step 3: Toggle the task's completion state
    console.log(`\nStep 3: Toggling task completion state...`);
    const newCompletionState = !testTask.completed;
    
    const updateResponse = await apiRequest('PUT', `/api/projects/${PROJECT_ID}/tasks/${testTask.id}`, {
      completed: newCompletionState
    });
    
    assert(updateResponse.status === 200, 'Update API returned 200 status code');
    assert(updateResponse.data.success === true, 'Update API response indicates success');
    assert(updateResponse.data.task, 'Update API response includes task data');
    
    const updatedTask = updateResponse.data.task;
    
    // Step 4: Verify the update was applied correctly
    console.log(`\nStep 4: Verifying task update...`);
    
    // Check completion state changed
    assert(updatedTask.completed === newCompletionState, 
      `Task completion state changed from ${testTask.completed} to ${newCompletionState}`);
    
    // Check metadata was preserved
    assert(updatedTask.origin === testTask.origin, 
      `Task origin was preserved: ${updatedTask.origin}`);
    
    assert(updatedTask.sourceId === testTask.sourceId, 
      `Task sourceId was preserved: ${updatedTask.sourceId}`);
    
    // Step 5: Get all tasks again to verify persistence
    console.log(`\nStep 5: Fetching tasks again to verify persistence...`);
    const verifyResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    assert(verifyResponse.status === 200, 'Verify API returned 200 status code');
    
    const verifyTasks = verifyResponse.data;
    const verifiedTask = verifyTasks.find(t => t.id === testTask.id);
    
    assert(verifiedTask, `Task ${testTask.id} found in tasks list after update`);
    assert(verifiedTask.completed === newCompletionState, 
      `Task completion state is still ${newCompletionState} after refresh`);
    
    // Final metadata verification
    assert(verifiedTask.origin === testTask.origin, 
      `Task origin is still preserved after refresh: ${verifiedTask.origin}`);
    
    assert(verifiedTask.sourceId === testTask.sourceId, 
      `Task sourceId is still preserved after refresh: ${verifiedTask.sourceId}`);
    
    // Print test summary
    console.log(`\n===== Test Summary =====`);
    console.log(`Total tests: ${results.totalTests}`);
    console.log(`Passed tests: ${results.passedTests}`);
    console.log(`Failed tests: ${results.failedTests}`);
    
    if (results.failedTests > 0) {
      console.log(`\nErrors:`);
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      console.log(`\nTest FAILED`);
    } else {
      console.log(`\nAll tests PASSED`);
      console.log(`Success Factor task persistence is working correctly!`);
    }
    
  } catch (error) {
    console.error('Unexpected error during test:', error);
    console.log(`\nTest FAILED due to unexpected error`);
  }
}

// Run the test
runSuccessFactorPersistenceTest();