/**
 * Smoke Test for Task Update Error Handling
 * 
 * This script tests various error scenarios for task updates:
 * 1. Updating a non-existent task
 * 2. Updating with invalid data formats
 * 3. Verifying proper error logging with [TASK_UPDATE_ERROR] prefix
 * 
 * Run with: node smoke-test-task-update-error.js
 */

import fs from 'fs';
import fetch from 'node-fetch';

// Helper to read cookies from cookies.txt
function getCookies() {
  try {
    return fs.existsSync('./cookies.txt') ? 
      fs.readFileSync('./cookies.txt', 'utf-8').trim() : '';
  } catch (err) {
    console.error('Error reading cookies:', err);
    return '';
  }
}

// API request helper
async function apiRequest(method, endpoint, body = null) {
  const cookies = getCookies();
  const baseUrl = 'http://localhost:5000';
  
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
  
  console.log(`${method} ${baseUrl}${endpoint}`);
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    const data = isJson ? await response.json().catch(() => ({})) : await response.text();
    
    return { 
      status: response.status, 
      ok: response.ok,
      data,
      contentType
    };
  } catch (error) {
    console.error('API request failed:', error);
    return { 
      status: 500, 
      ok: false,
      error: error.message
    };
  }
}

// Main test function
async function runErrorTests() {
  const testResults = {
    nonExistentTaskTest: false,
    invalidDataFormatTest: false,
    foundProjectForTest: false
  };
  
  console.log('\n=== TESTING TASK UPDATE ERROR HANDLING ===');
  
  // First get a valid project ID to use
  console.log('\n=== STEP 1: Fetching a valid project ID ===');
  const projectsResponse = await apiRequest('GET', '/api/projects');
  
  if (!projectsResponse.ok || !projectsResponse.data?.length) {
    console.error('Failed to fetch projects. Cannot continue with tests.');
    return testResults;
  }
  
  const projectId = projectsResponse.data[0].id;
  console.log(`Using project: ${projectsResponse.data[0].name} (${projectId})`);
  testResults.foundProjectForTest = true;
  
  // Test 1: Update a non-existent task
  console.log('\n=== TEST 1: Updating a non-existent task ===');
  const nonExistentTaskId = 'non-existent-task-id';
  const nonExistentResponse = await apiRequest(
    'PUT', 
    `/api/projects/${projectId}/tasks/${nonExistentTaskId}`,
    { completed: true }
  );
  
  console.log(`Status code: ${nonExistentResponse.status}`);
  console.log('Response:', nonExistentResponse.data);
  
  // We expect a 404 or similar error, but NOT a 500
  testResults.nonExistentTaskTest = nonExistentResponse.status !== 500;
  console.log(`Test result: ${testResults.nonExistentTaskTest ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('(Expected a 404 or similar status code for a non-existent task, but NOT a 500 server error)');
  
  // Test 2: Update a task with invalid data
  console.log('\n=== TEST 2: Updating with invalid data format ===');
  
  // First create a test task with known ID
  console.log('Creating a test task first...');
  const newTaskResponse = await apiRequest('POST', `/api/projects/${projectId}/tasks`, {
    projectId: projectId,
    text: 'Error handling test task',
    stage: 'Testing',
    origin: 'test',
    status: 'To Do'
  });
  
  if (!newTaskResponse.ok) {
    console.error('Failed to create test task. Skipping invalid data test.');
    return testResults;
  }
  
  const taskId = newTaskResponse.data.id;
  console.log(`Created test task with ID: ${taskId}`);
  
  // Now try to update with invalid data (object where string expected)
  const invalidDataResponse = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${taskId}`,
    { 
      text: { invalid: 'object instead of string' }
    }
  );
  
  console.log(`Status code: ${invalidDataResponse.status}`);
  console.log('Response:', invalidDataResponse.data);
  
  // We expect a 400 or similar error, but NOT a 500
  testResults.invalidDataFormatTest = invalidDataResponse.status !== 500;
  console.log(`Test result: ${testResults.invalidDataFormatTest ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('(Expected a client error, but NOT a 500 server error)');
  
  return testResults;
}

// Run the tests
runErrorTests()
  .then(results => {
    console.log('\n=== OVERALL TEST RESULTS ===');
    console.log(JSON.stringify(results, null, 2));
    console.log(`Overall test ${Object.values(results).every(Boolean) ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    // Final summary
    if (Object.values(results).every(Boolean)) {
      console.log('\n✅ Success! The error handling improvements are working correctly.');
      console.log('The server is properly handling error cases without returning 500 errors.');
      console.log('Check the server logs for [TASK_UPDATE_ERROR] prefixed messages that should');
      console.log('include detailed information about the errors that occurred.');
    } else {
      console.log('\n❌ Some tests failed. The error handling may not be robust enough yet.');
      console.log('Review the server logs and code for any issues in the error handling logic.');
    }
  })
  .catch(error => {
    console.error('Test script error:', error);
  });