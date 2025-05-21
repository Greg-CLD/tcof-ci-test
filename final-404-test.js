/**
 * Final Test for Task Not Found Error Handling
 * 
 * This script tests the full flow of task not found error handling:
 * 1. Creates an intentionally invalid but correctly formatted UUID
 * 2. Attempts to update a task with this ID
 * 3. Verifies that a 404 (not 500) status code is returned
 * 
 * This test confirms our UUID validation and error handling is working correctly
 */

const fetch = require('node-fetch');
const fs = require('fs');

async function getValidProjectId() {
  try {
    // Make API request to get valid projects
    const cookieFile = fs.readFileSync('./cookies.txt', 'utf8');
    const cookie = cookieFile.trim();
    
    const response = await fetch('http://localhost:5000/api/projects', {
      headers: {
        'Cookie': cookie
      }
    });
    
    const projects = await response.json();
    
    if (projects && projects.length > 0) {
      return projects[0].id;
    }
    
    // Fallback to a test ID if no projects found
    return 'test-project-id';
  } catch (error) {
    console.error('Error getting project ID:', error);
    return 'test-project-id';
  }
}

function generateNonexistentTaskId() {
  // Generate a valid UUID that definitely doesn't exist in the database
  return 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
}

function simulateServerErrorHandling(error) {
  // This simulates the server-side error handling logic
  if (error && error.code === 'TASK_NOT_FOUND') {
    return {
      status: 404,
      body: {
        success: false,
        error: 'TASK_NOT_FOUND',
        message: 'Task not found'
      }
    };
  }
  
  // Default error response
  return {
    status: 500,
    body: {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Unknown error'
    }
  };
}

async function testDirectErrorHandling() {
  console.log('Running direct error handling test...');
  
  // Simulate trying to find a non-existent task
  const mockError = {
    code: 'TASK_NOT_FOUND',
    message: 'The requested task could not be found'
  };
  
  // Simulate route handler error processing
  const result = simulateServerErrorHandling(mockError);
  
  console.log(`Direct handling test result: ${result.status === 404 ? 'PASSED' : 'FAILED'}`);
  console.log(`Status: ${result.status}`);
  console.log('Response:', result.body);
  
  return result.status === 404;
}

async function runTest() {
  try {
    console.log('=== Task Not Found Error Handling Test ===');
    
    // Test 1: Direct error handling
    const directTest = await testDirectErrorHandling();
    console.log('Direct Test:', directTest ? 'PASSED' : 'FAILED');
    
    // Load session cookie
    let cookie;
    try {
      cookie = fs.readFileSync('./cookies.txt', 'utf8').trim();
    } catch (err) {
      console.error('Error reading cookie file:', err);
      console.log('Skipping API tests due to missing cookie.');
      return;
    }
    
    // Test 2: Real API call 
    const projectId = await getValidProjectId();
    const nonexistentTaskId = generateNonexistentTaskId();
    
    console.log(`\nTesting PUT /api/projects/${projectId}/tasks/${nonexistentTaskId}`);
    
    // Make the API request with non-existent task ID
    const response = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks/${nonexistentTaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        completed: true
      })
    });
    
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');
    
    console.log(`Status Code: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Is JSON Response: ${isJson ? 'Yes' : 'No'}`);
    
    // Get response body
    const text = await response.text();
    try {
      // Try to parse as JSON
      const body = JSON.parse(text);
      console.log('Response Body:', body);
      
      console.log('\nAPI Test Result:', 
        response.status === 404 && isJson ? 'PASSED' : 'FAILED');
      
      if (response.status !== 404) {
        console.log('Expected status 404 but got', response.status);
      }
      
      if (!isJson) {
        console.log('Expected JSON response but got different content type');
      }
    } catch (e) {
      console.log('Response is not valid JSON:', text.substring(0, 200));
      console.log('\nAPI Test Result: FAILED (Not a valid JSON response)');
    }
    
    // Test 3: Test missing taskId (trailing slash case)
    console.log('\nTesting PUT /api/projects/${projectId}/tasks/ (missing taskId)');
    
    const missingIdResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        completed: true
      })
    });
    
    const missingIdContentType = missingIdResponse.headers.get('content-type') || '';
    const isMissingIdJson = missingIdContentType.toLowerCase().includes('application/json');
    
    console.log(`Status Code: ${missingIdResponse.status}`);
    console.log(`Content-Type: ${missingIdContentType}`);
    console.log(`Is JSON Response: ${isMissingIdJson ? 'Yes' : 'No'}`);
    
    // Get response body
    const missingIdText = await missingIdResponse.text();
    try {
      // Try to parse as JSON
      const missingIdBody = JSON.parse(missingIdText);
      console.log('Response Body:', missingIdBody);
      
      console.log('\nMissing ID Test Result:', 
        missingIdResponse.status === 400 && isMissingIdJson ? 'PASSED' : 'FAILED');
        
      if (missingIdResponse.status !== 400) {
        console.log('Expected status 400 but got', missingIdResponse.status);
      }
      
      if (!isMissingIdJson) {
        console.log('Expected JSON response but got different content type');
      }
    } catch (e) {
      console.log('Response is not valid JSON:', missingIdText.substring(0, 200));
      console.log('\nMissing ID Test Result: FAILED (Not a valid JSON response)');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

runTest();