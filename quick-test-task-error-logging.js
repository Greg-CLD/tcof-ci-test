/**
 * Quick Test Script for Task Update Error Logging
 * 
 * This script tests a focused scenario to verify TASK_UPDATE_ERROR logs
 * are generated properly when updates fail.
 * 
 * It intentionally causes errors to exercise the [TASK_UPDATE_ERROR] logging
 * by sending invalid formats and non-existent IDs.
 * 
 * Run with: node quick-test-task-error-logging.js
 */

import fetch from 'node-fetch';

// Simplified test directly hitting the API endpoint
// Doesn't require authentication as we're testing server-side error logging
async function testErrorLogging() {
  console.log('=== TASK UPDATE ERROR LOGGING TEST ===');
  console.log('This test intentionally causes errors to verify error logging');
  
  // We'll use a known non-existent project and task ID
  const nonExistentProjectId = '00000000-0000-0000-0000-000000000000';
  const nonExistentTaskId = 'invalid-task-id';
  
  console.log(`\nTesting with non-existent project ID: ${nonExistentProjectId}`);
  console.log(`Testing with non-existent task ID: ${nonExistentTaskId}`);
  
  // Call the update endpoint with invalid data
  try {
    const response = await fetch(
      `http://localhost:5000/api/projects/${nonExistentProjectId}/tasks/${nonExistentTaskId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          completed: true,
          // Invalid data to test error handling
          invalidField: { nested: 'object that will cause errors' }
        })
      }
    );
    
    const status = response.status;
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    // Get response in appropriate format
    const result = isJson 
      ? await response.json().catch(() => 'Invalid JSON') 
      : await response.text();
    
    console.log(`\nResponse Status: ${status}`);
    console.log('Response Body:', result);
    
    // The key test: Did we get a 500 error?
    const success = status !== 500;
    
    console.log(`\nTest ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('(Expected ANY error status other than 500, indicating error was handled properly)');
    
    // Check server logs for [TASK_UPDATE_ERROR] messages
    console.log('\nIMPORTANT: Check server logs for [TASK_UPDATE_ERROR] messages');
    console.log('If you see detailed error logs with task ID information and stack traces,');
    console.log('the error handling enhancement is working correctly.');
    
    return { success };
  } catch (error) {
    console.error('\nNetwork error during test:', error.message);
    console.log('This may indicate the server is not running');
    return { success: false, error: error.message };
  }
}

// Run the test
testErrorLogging()
  .then(result => {
    if (result.success) {
      console.log('\n=== SUMMARY ===');
      console.log('The test confirms the server is handling task update errors properly.');
      console.log('It returned a non-500 error code, indicating the error was caught and handled.');
      console.log('The server logs should show detailed [TASK_UPDATE_ERROR] messages that will help');
      console.log('developers quickly identify and fix issues with task updates.');
    } else {
      console.log('\n=== SUMMARY ===');
      console.log('The test failed. This could be because:');
      console.log('1. The server is returning 500 errors instead of handling them properly');
      console.log('2. The server is not running');
      console.log('3. There was a network error connecting to the test server');
    }
  });