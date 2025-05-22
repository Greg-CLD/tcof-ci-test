/**
 * Smoke Test for Success Factor Task Toggle Fixes
 * This script will test all scenarios for the task update endpoint
 */
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const baseUrl = 'http://localhost:5000';

// Test data
const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const factorTaskId = 'f219d47b-39b5-5be1-86f2-e0ec3afc8e3b';  // Success Factor task ID
const factorTaskSourceId = 'f219d47b-39b5-5be1-86f2-e0ec3afc8e3b-source-id';  // Source ID (if different)
const regularTaskId = '8e12e4b0-f2c7-4bf7-ab51-65a43d99a7b0';  // Regular non-factor task
const nonExistentTaskId = uuidv4();  // Non-existent but valid UUID
const invalidTaskId = 'not-a-valid-uuid';  // Invalid UUID format

async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-auth-override': 'true'  // For testing without auth
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.json();
  
  return {
    status: response.status,
    data
  };
}

async function runTests() {
  console.log('=== SMOKE TESTS FOR TASK TOGGLE ENDPOINT ===\n');
  
  // 1. Test updating Success Factor task by ID
  console.log('TEST 1: Toggle Success Factor task by ID');
  const test1 = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${factorTaskId}`, { completed: true });
  console.log(`Status: ${test1.status}`);
  console.log('Response:', JSON.stringify(test1.data, null, 2));
  console.log('\n');
  
  // 2. Test updating Success Factor task by source_id
  console.log('TEST 2: Toggle Success Factor task by source_id');
  const test2 = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${factorTaskSourceId}`, { completed: false });
  console.log(`Status: ${test2.status}`);
  console.log('Response:', JSON.stringify(test2.data, null, 2));
  console.log('\n');
  
  // 3. Test updating regular task
  console.log('TEST 3: Toggle regular task');
  const test3 = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${regularTaskId}`, { completed: true });
  console.log(`Status: ${test3.status}`);
  console.log('Response:', JSON.stringify(test3.data, null, 2));
  console.log('\n');
  
  // 4. Test with non-existent task ID (valid UUID but not found)
  console.log('TEST 4: Toggle non-existent task (should 404)');
  const test4 = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${nonExistentTaskId}`, { completed: true });
  console.log(`Status: ${test4.status}`);
  console.log('Response:', JSON.stringify(test4.data, null, 2));
  console.log('\n');
  
  // 5. Test with invalid UUID format (should 400)
  console.log('TEST 5: Toggle with invalid UUID format (should 400)');
  const test5 = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${invalidTaskId}`, { completed: true });
  console.log(`Status: ${test5.status}`);
  console.log('Response:', JSON.stringify(test5.data, null, 2));
  console.log('\n');
  
  console.log('=== SMOKE TESTS COMPLETED ===');
}

runTests().catch(err => {
  console.error('Error running tests:', err);
});