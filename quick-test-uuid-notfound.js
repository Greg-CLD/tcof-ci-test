/**
 * Quick Test for TASK_NOT_FOUND HTTP Status
 * 
 * This simple script:
 * 1. Uses a fetch call with the full endpoint URL
 * 2. Attempts to update a known non-existent task ID
 * 3. Verifies that a 404 status (not 500) is returned
 * 
 * Purpose: Confirm the full API error handling flow works correctly
 */

import fetch from 'node-fetch';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// Establish database connection
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Helper function to get a valid project ID from the database
async function getValidProjectId() {
  try {
    const projects = await sql`SELECT id FROM projects LIMIT 1`;
    if (projects.length === 0) {
      throw new Error('No projects found in database');
    }
    return projects[0].id;
  } catch (error) {
    console.error('Error getting valid project ID:', error);
    throw error;
  }
}

// Helper function to format API request
async function apiRequest(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    // Use direct URL to avoid authentication for this test
    const url = `http://localhost:5000${endpoint}`;
    console.log(`${method} ${url}${body ? '\nBody: ' + JSON.stringify(body, null, 2) : ''}`);
    
    // Make the request
    const response = await fetch(url, options);
    
    // Parse the response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Print the response
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error with ${method} request to ${endpoint}:`, error.message);
    return { status: -1, data: null, error: error.message };
  }
}

// Main test function
async function runTest() {
  try {
    console.log('=== TASK_NOT_FOUND HTTP STATUS TEST ===');
    
    // Step 1: Get a valid project ID
    const projectId = await getValidProjectId();
    console.log(`Using valid project ID: ${projectId}`);
    
    // Step 2: Try to update a non-existent task
    const nonExistentTaskId = 'non-existent-id-' + Date.now();
    console.log(`\nTesting with non-existent task ID: ${nonExistentTaskId}`);
    
    const response = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${nonExistentTaskId}`,
      { completed: true }
    );
    
    // Check if the status is 404 (not 500)
    if (response.status === 404) {
      console.log('\n✅ TEST PASSED: Server correctly returned 404 status for non-existent task ID');
    } else {
      console.log(`\n❌ TEST FAILED: Server returned ${response.status} instead of 404 for non-existent task ID`);
      if (response.status === 500) {
        console.log('The error is not properly handled - server is returning 500 internal error');
      }
    }
    
    return response.status === 404;
  } catch (error) {
    console.error('Unexpected error during test:', error);
    return false;
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the test
runTest()
  .then(result => {
    console.log(`\nOverall test ${result ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('Test execution completed.');
  })
  .catch(err => {
    console.error('Unhandled error during test execution:', err);
  });