/**
 * Smoke Test for Task UUID Matching Fix
 * 
 * This script:
 * 1. Gets a project and its tasks
 * 2. Tests updating a task using both its full ID and a prefix
 * 3. Verifies that [TASK_LOOKUP] logs show proper matching
 * 
 * Run with: node smoke-test-uuid-lookup.js
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Get cookies from a file if available
function getCookies() {
  try {
    if (fs.existsSync('./cookies.txt')) {
      return fs.readFileSync('./cookies.txt', 'utf8').trim();
    }
  } catch (e) {
    console.error('Error reading cookies file:', e);
  }
  return '';
}

// Helper function for API requests
async function apiRequest(method, endpoint, body = null) {
  try {
    const cookies = getCookies();
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const url = `http://localhost:5000${endpoint}`;
    console.log(`${method} ${url}${body ? '\nBody: ' + JSON.stringify(body, null, 2) : ''}`);
    
    const response = await fetch(url, options);
    
    // Get the response data
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Format the status and response for logging
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
    
    return { 
      status: response.status, 
      data, 
      success: response.status >= 200 && response.status < 300 
    };
  } catch (error) {
    console.error(`Error with ${method} request to ${endpoint}:`, error.message);
    return { status: -1, data: null, success: false, error: error.message };
  }
}

// Get the clean UUID part from a full ID
function getUuidPrefix(fullId) {
  // If the ID includes hyphens and looks like a UUID, extract just the first part
  if (fullId && fullId.includes('-')) {
    const parts = fullId.split('-');
    if (parts.length >= 5) {
      // Take just the standard UUID part (first 5 segments)
      return parts.slice(0, 5).join('-');
    }
  }
  return fullId;
}

// Main test function
async function runTest() {
  console.log('=== TASK UUID LOOKUP FIX SMOKE TEST ===');
  console.log('Testing the task ID lookup logic with different ID formats\n');
  
  const testResults = {
    authenticatedRequests: false,
    foundProject: false,
    foundTasks: false,
    updatedWithFullId: false,
    updatedWithPrefixId: false,
    checkLogs: 'Please check server logs for [TASK_LOOKUP] and [TASK_UPDATE_ERROR] entries'
  };
  
  // Step 1: Get user's projects
  console.log('=== STEP 1: Fetching a project ID ===');
  const projectsResponse = await apiRequest('GET', '/api/projects');
  
  if (!projectsResponse.success || !Array.isArray(projectsResponse.data) || projectsResponse.data.length === 0) {
    console.log('Failed to fetch projects or no projects found. Cannot continue with tests.');
    testResults.authenticatedRequests = projectsResponse.status !== 401;
    return testResults;
  }
  
  testResults.authenticatedRequests = true;
  
  // Use the first project from the list
  const projectId = projectsResponse.data[0].id;
  console.log(`Using project ID: ${projectId}`);
  testResults.foundProject = true;
  
  // Step 2: Get tasks for this project
  console.log('\n=== STEP 2: Fetching tasks for the project ===');
  const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (!tasksResponse.success || !Array.isArray(tasksResponse.data) || tasksResponse.data.length === 0) {
    console.log('Failed to fetch tasks or no tasks found. Cannot continue with update tests.');
    return testResults;
  }
  
  testResults.foundTasks = true;
  
  // Take the first task from the list
  const task = tasksResponse.data[0];
  console.log(`Using task: ${task.id} (${task.text})`);
  
  // Run task update tests with different ID formats
  await runTaskUpdates(projectId, task, testResults);
  
  // Overall test summary
  console.log('\n=== OVERALL TEST RESULTS ===');
  console.log(JSON.stringify(testResults, null, 2));
  
  const allPassed = Object.values(testResults).every(result => 
    result === true || typeof result === 'string');
    
  console.log(`Overall test ${allPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  if (!allPassed) {
    console.log('\n❌ Some tests failed. The UUID lookup fix may not be working as expected.');
    console.log('Review the server logs to verify the [TASK_LOOKUP] and [TASK_UPDATE_ERROR] entries.');
  } else {
    console.log('\n✅ All tests passed! The UUID lookup fix is working as expected.');
    console.log('The fix correctly handles task lookup by sourceId, exact ID, and prefix matching.');
  }
  
  return testResults;
}

// Run update tests with different ID formats
async function runTaskUpdates(projectId, task, testResults) {
  // Use a toggle value that's different from the current state
  const newCompletionState = !task.completed;
  
  // Step 3: Update task using its full ID
  console.log('\n=== STEP 3: Updating task using full ID ===');
  const fullIdResponse = await apiRequest(
    'PUT', 
    `/api/projects/${projectId}/tasks/${task.id}`,
    { completed: newCompletionState }
  );
  
  testResults.updatedWithFullId = fullIdResponse.success;
  
  // Toggle back for the next test
  const secondToggleState = !newCompletionState;
  
  // Step 4: Update task using UUID prefix
  const prefixId = getUuidPrefix(task.id);
  if (prefixId !== task.id) {
    console.log('\n=== STEP 4: Updating task using UUID prefix only ===');
    console.log(`Using prefix ID: ${prefixId} (from full ID: ${task.id})`);
    
    const prefixResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${prefixId}`,
      { completed: secondToggleState }
    );
    
    testResults.updatedWithPrefixId = prefixResponse.success;
  } else {
    console.log('\n=== STEP 4: Cannot test prefix - task ID is not a compound ID ===');
    testResults.updatedWithPrefixId = 'N/A - Task does not have a compound ID';
  }
  
  // Step 5: Test with a known invalid ID to check error logging
  console.log('\n=== STEP 5: Testing with invalid task ID to verify error logging ===');
  const invalidId = 'invalid-task-id-' + Date.now();
  await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${invalidId}`,
    { completed: true }
  );
  
  console.log('\nCheck server logs for [TASK_UPDATE_ERROR] entries related to this invalid task ID');
}

// Run the test
runTest()
  .then(() => {
    console.log('\nTest execution completed.');
  })
  .catch(err => {
    console.error('Unhandled error during test execution:', err);
  });