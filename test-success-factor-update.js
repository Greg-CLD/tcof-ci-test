/**
 * Test Success Factor Task Update with Test User Authentication
 * 
 * This script:
 * 1. Logs in as the test user
 * 2. Finds and toggles a specific Success Factor task
 * 3. Verifies the response contains the correct user task
 * 4. Gets the tasks again to verify persistence
 * 5. Logs all server responses and debug information
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://localhost:5000';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TARGET_TASK_ID = 'a5bdff93-3e7d-4e7c-bea5-1ffb0dc7cdaf'; // The specific Success Factor task
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

// Store cookie for authenticated requests
let authCookie = '';

// Helper function for API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include'
  };
  
  // Add authentication cookie if available
  if (authCookie) {
    options.headers.Cookie = authCookie;
  }
  
  // Add body for non-GET requests
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  console.log(`Making ${method} request to ${endpoint}`);
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  // Capture cookies from response if present
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    authCookie = setCookie;
    console.log('Captured authentication cookie');
  }
  
  // Return full response details
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.json().catch(() => null)
  };
}

// Main test function
async function testSuccessFactorUpdate() {
  console.log('\n=== Success Factor Task Update Test ===\n');
  let testResults = {};
  
  try {
    // Step 1: Log in as test user
    console.log('STEP 1: Authenticating as test user...');
    
    const loginResponse = await apiRequest('POST', '/api/login', TEST_USER);
    console.log(`Login status: ${loginResponse.status}`);
    
    if (loginResponse.status !== 200 || !loginResponse.body) {
      console.error('Login failed:', loginResponse.body);
      return false;
    }
    
    console.log('Login successful:', loginResponse.body.username);
    testResults.login = {
      status: loginResponse.status,
      user: loginResponse.body.username
    };
    
    // Step 2: Get all tasks for the project
    console.log('\nSTEP 2: Getting all tasks for the project...');
    
    const tasksResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    console.log(`Get tasks status: ${tasksResponse.status}`);
    
    if (tasksResponse.status !== 200 || !Array.isArray(tasksResponse.body)) {
      console.error('Failed to get tasks:', tasksResponse.body);
      return false;
    }
    
    console.log(`Found ${tasksResponse.body.length} tasks`);
    
    // Find our target Success Factor task
    const targetTask = tasksResponse.body.find(task => task.id === TARGET_TASK_ID);
    
    if (!targetTask) {
      console.error(`Target task with ID ${TARGET_TASK_ID} not found`);
      
      // Look for any Success Factor task as fallback
      const factorTasks = tasksResponse.body.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      if (factorTasks.length > 0) {
        console.log(`Found ${factorTasks.length} other Success Factor tasks. Using the first one instead.`);
        targetTask = factorTasks[0];
      } else {
        console.error('No Success Factor tasks found in the project');
        return false;
      }
    }
    
    console.log('Target task found:', {
      id: targetTask.id,
      text: targetTask.text,
      origin: targetTask.origin,
      sourceId: targetTask.sourceId,
      completed: targetTask.completed
    });
    
    testResults.originalTask = {
      id: targetTask.id,
      text: targetTask.text,
      origin: targetTask.origin,
      sourceId: targetTask.sourceId,
      completed: targetTask.completed
    };
    
    // Step 3: Toggle the task completion state
    console.log(`\nSTEP 3: Toggling task completion from ${targetTask.completed} to ${!targetTask.completed}...`);
    
    const updateResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${targetTask.id}`,
      { completed: !targetTask.completed }
    );
    
    console.log(`Update status: ${updateResponse.status}`);
    console.log('Update response headers:', updateResponse.headers);
    
    if (updateResponse.status !== 200 || !updateResponse.body) {
      console.error('Failed to update task:', updateResponse.body);
      return false;
    }
    
    // Log the full update response
    console.log('\nPUT /api/projects/:projectId/tasks/:taskId response:');
    console.log(JSON.stringify(updateResponse.body, null, 2));
    
    testResults.updateResponse = {
      status: updateResponse.status,
      headers: updateResponse.headers,
      body: updateResponse.body
    };
    
    // Step 4: Verify the response contains the correct task
    console.log('\nSTEP 4: Verifying response integrity...');
    
    if (!updateResponse.body.task) {
      console.error('Response does not contain a task object');
      return false;
    }
    
    const updatedTask = updateResponse.body.task;
    
    // Check critical fields
    const idMatch = updatedTask.id === targetTask.id;
    const completionToggled = updatedTask.completed !== targetTask.completed;
    const originPreserved = updatedTask.origin === targetTask.origin;
    const sourceIdPreserved = updatedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatch ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${completionToggled ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${originPreserved ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${sourceIdPreserved ? '✓' : '✗'}`);
    
    testResults.responseVerification = {
      idMatch,
      completionToggled,
      originPreserved,
      sourceIdPreserved
    };
    
    // Step 5: Get tasks again to verify persistence
    console.log('\nSTEP 5: Getting tasks again to verify persistence...');
    
    const refreshResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    console.log(`Refresh status: ${refreshResponse.status}`);
    
    if (refreshResponse.status !== 200 || !Array.isArray(refreshResponse.body)) {
      console.error('Failed to refresh tasks:', refreshResponse.body);
      return false;
    }
    
    // Log the full GET response after update
    console.log('\nGET /api/projects/:projectId/tasks after update:');
    console.log(JSON.stringify(refreshResponse.body, null, 2));
    
    // Find our task in the refreshed list
    const refreshedTask = refreshResponse.body.find(task => task.id === targetTask.id);
    
    if (!refreshedTask) {
      console.error('Could not find the task in the refreshed task list');
      return false;
    }
    
    console.log('\nRefreshed task state:');
    console.log({
      id: refreshedTask.id,
      text: refreshedTask.text,
      origin: refreshedTask.origin,
      sourceId: refreshedTask.sourceId,
      completed: refreshedTask.completed
    });
    
    testResults.refreshedTask = {
      id: refreshedTask.id, 
      text: refreshedTask.text,
      origin: refreshedTask.origin,
      sourceId: refreshedTask.sourceId,
      completed: refreshedTask.completed
    };
    
    // Step 6: Verify persistence
    console.log('\nSTEP 6: Verifying persistence after refresh...');
    
    const idMatchRefreshed = refreshedTask.id === targetTask.id;
    const completionToggledRefreshed = refreshedTask.completed !== targetTask.completed;
    const originPreservedRefreshed = refreshedTask.origin === targetTask.origin;
    const sourceIdPreservedRefreshed = refreshedTask.sourceId === targetTask.sourceId;
    
    console.log(`ID Match: ${idMatchRefreshed ? '✓' : '✗'}`);
    console.log(`Completion Toggled: ${completionToggledRefreshed ? '✓' : '✗'}`);
    console.log(`Origin Preserved: ${originPreservedRefreshed ? '✓' : '✗'}`);
    console.log(`SourceId Preserved: ${sourceIdPreservedRefreshed ? '✓' : '✗'}`);
    
    testResults.persistenceVerification = {
      idMatchRefreshed,
      completionToggledRefreshed,
      originPreservedRefreshed,
      sourceIdPreservedRefreshed
    };
    
    // Step 7: Reset to original state (cleanup)
    console.log('\nSTEP 7: Resetting task to original state...');
    
    const resetResponse = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${targetTask.id}`,
      { completed: targetTask.completed }
    );
    
    if (resetResponse.status === 200) {
      console.log('Task reset successful');
    } else {
      console.log('Warning: Failed to reset task to original state');
    }
    
    // Save test results to a file
    fs.writeFileSync('test-results.json', JSON.stringify(testResults, null, 2));
    
    // Get the latest git commit
    let gitInfo = 'Git info not available';
    try {
      gitInfo = require('child_process').execSync('git log -1').toString();
    } catch (err) {
      console.log('Could not get git info:', err.message);
    }
    
    // Final summary
    console.log('\n=== TEST RESULTS ===');
    console.log(`Task Update Response: ${idMatch && completionToggled ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Persistence Verification: ${idMatchRefreshed && completionToggledRefreshed ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Metadata Preservation: ${originPreserved && sourceIdPreserved && originPreservedRefreshed && sourceIdPreservedRefreshed ? 'PASS ✓' : 'FAIL ✗'}`);
    
    const allPassed = idMatch && completionToggled && originPreserved && sourceIdPreserved && 
                       idMatchRefreshed && completionToggledRefreshed && originPreservedRefreshed && sourceIdPreservedRefreshed;
    
    console.log(`\nOVERALL TEST RESULT: ${allPassed ? 'PASS ✓' : 'FAIL ✗'}`);
    
    if (allPassed) {
      console.log('\n✓ SUCCESS FACTOR TASK UPDATE FIX VERIFIED');
      console.log('The server is correctly returning the user task object after updates.');
      console.log('Task completion state is properly persisted.');
    } else {
      console.log('\n✗ SUCCESS FACTOR TASK UPDATE FIX NOT VERIFIED');
      console.log('There may still be issues with the task update response or persistence.');
    }
    
    console.log('\nGit Commit Info:');
    console.log(gitInfo);
    
    return allPassed;
  } catch (error) {
    console.error('\nTest failed with unexpected error:', error);
    return false;
  }
}

// Run the test
testSuccessFactorUpdate().then(success => {
  console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
});