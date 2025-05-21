/**
 * Test for Task Not Found Error Handling with Browser Cookie
 * 
 * This script:
 * 1. Gets session cookies from a file (copied from browser)
 * 2. Attempts to update a non-existent task
 * 3. Confirms that a 404 status code is returned (not 500)
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Get cookies from the cookies.txt file
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
    
    if (!cookies) {
      console.log('No cookies found. Please save your browser cookies in cookies.txt first.');
      console.log('Instructions:');
      console.log('1. Login to the application in your browser');
      console.log('2. Use browser DevTools to copy the Cookie header from any authenticated request');
      console.log('3. Save it to cookies.txt in this directory');
      process.exit(1);
    }
    
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
  
  // Step 1: Get a valid project ID
  console.log('=== STEP 1: Fetching a valid project ID ===');
  const projectsResponse = await apiRequest('GET', '/api/projects');
  
  if (!projectsResponse.success || !Array.isArray(projectsResponse.data) || projectsResponse.data.length === 0) {
    console.log('Failed to fetch projects or no projects found.');
    return false;
  }
  
  // Use the first project from the list
  const projectId = projectsResponse.data[0].id;
  console.log(`Using project ID: ${projectId}`);
  
  // Step 2: Try to update a non-existent task ID
  const nonExistentTaskId = 'non-existent-task-id-' + Date.now();
  console.log('\n=== STEP 2: Attempting to update a non-existent task ID ===');
  console.log(`Using fake task ID: ${nonExistentTaskId}`);
  
  const updateResponse = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${nonExistentTaskId}`,
    { completed: true }
  );
  
  // Check if the status is 404 (not 500)
  const isCorrectStatus = updateResponse.status === 404;
  console.log(`\nStatus code is ${updateResponse.status} ${isCorrectStatus ? '✅' : '❌'}`);
  
  if (!isCorrectStatus) {
    console.log(`Expected status code: 404, but got: ${updateResponse.status}`);
    if (updateResponse.status === 500) {
      console.log('\n❌ CRITICAL FAILURE: Server is still returning 500 errors for non-existent tasks');
      console.log('The task-not-found handling is not working correctly');
    }
  } else {
    console.log('\n✅ SUCCESS: Server correctly returned 404 for non-existent task ID');
    console.log('The task-not-found handling is working correctly');
  }
  
  return isCorrectStatus;
}

// Execute the test
runTest()
  .then(success => {
    console.log(`\nOverall test ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error during test execution:', err);
    process.exit(1);
  });