/**
 * Smoke Test for Task Not Found Error Handling
 * 
 * This script:
 * 1. Attempts to update a non-existent task ID
 * 2. Verifies that a 404 status is returned (not 500)
 * 3. Checks that proper error messaging is returned
 * 
 * Run with: node smoke-test-task-notfound.js
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

// Main test function
async function runTest() {
  console.log('=== TASK NOT FOUND ERROR HANDLING TEST ===');
  console.log('Testing if non-existent task IDs return 404 status (not 500)\n');
  
  const testResults = {
    authenticatedRequests: false,
    foundProject: false,
    nonExistentTaskReturns404: false,
    errorMessageIsHelpful: false
  };
  
  // Step 1: Get a valid project ID
  console.log('=== STEP 1: Fetching a valid project ID ===');
  const projectsResponse = await apiRequest('GET', '/api/projects');
  
  if (!projectsResponse.success || !Array.isArray(projectsResponse.data) || projectsResponse.data.length === 0) {
    console.log('Failed to fetch projects or no projects found.');
    testResults.authenticatedRequests = projectsResponse.status !== 401;
    return testResults;
  }
  
  testResults.authenticatedRequests = true;
  
  // Use the first project from the list
  const projectId = projectsResponse.data[0].id;
  console.log(`Using project ID: ${projectId}`);
  testResults.foundProject = true;
  
  // Step 2: Try to update a non-existent task ID
  const nonExistentTaskId = 'non-existent-task-id-' + Date.now();
  console.log('\n=== STEP 2: Attempting to update a non-existent task ID ===');
  console.log(`Using fake task ID: ${nonExistentTaskId}`);
  
  const updateResponse = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${nonExistentTaskId}`,
    { completed: true }
  );
  
  // Verify the status code is 404 (not 500)
  testResults.nonExistentTaskReturns404 = updateResponse.status === 404;
  
  // Verify the error message is helpful
  if (updateResponse.data && typeof updateResponse.data === 'object' && updateResponse.data.message) {
    testResults.errorMessageIsHelpful = updateResponse.data.message.includes('not found');
  }
  
  // Overall test summary
  console.log('\n=== OVERALL TEST RESULTS ===');
  console.log(JSON.stringify(testResults, null, 2));
  
  const allPassed = Object.values(testResults).every(result => result === true);
  console.log(`Overall test ${allPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  if (!allPassed) {
    console.log('\n❌ Some tests failed. Check server logs for details on what went wrong.');
    console.log('Review the [TASK_LOOKUP] and [TASK_UPDATE_ERROR] log entries.');
  } else {
    console.log('\n✅ All tests passed! The server now returns a proper 404 status for non-existent tasks.');
    console.log('This confirms the error handling fix is working correctly.');
  }
  
  return testResults;
}

// Run the test
runTest()
  .then(() => {
    console.log('\nTest execution completed.');
  })
  .catch(err => {
    console.error('Unhandled error during test execution:', err);
  });