/**
 * Smoke Test for Task UUID Matching Fix
 * 
 * This script:
 * 1. Gets a project and its tasks
 * 2. Tests updating a task using both its full ID and a prefix
 * 3. Verifies that [TASK_LOOKUP] logs show proper matching
 * 
 * Run with: node smoke-test-task-lookup.js
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Helper to read cookies from the cookies.txt file
function getCookies() {
  try {
    return fs.existsSync('./cookies.txt') ? 
      fs.readFileSync('./cookies.txt', 'utf-8').trim() : '';
  } catch (err) {
    console.error('Error reading cookies:', err);
    return '';
  }
}

// Make an authenticated API request
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
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { status: response.status, data };
    } else {
      const errorText = await response.text();
      console.error(`Error ${response.status}: ${errorText}`);
      return { 
        status: response.status, 
        error: errorText,
        ok: false
      };
    }
  } catch (error) {
    console.error('API request failed:', error);
    return { 
      status: 500, 
      error: error.message,
      ok: false
    };
  }
}

// Extract UUID prefix (first segment or partial UUID)
function getUuidPrefix(fullId) {
  // Take just the first segment of the UUID
  return fullId.split('-')[0];
}

// Main test function
async function runTest() {
  const testResults = {
    projectsFetched: false,
    tasksFound: false,
    fullIdUpdate: false,
    prefixUpdate: false
  };
  
  try {
    // Step 1: Get projects
    console.log('\n=== FETCHING PROJECTS ===');
    const projectsResponse = await apiRequest('GET', '/api/projects');
    
    if (projectsResponse.status !== 200 || !projectsResponse.data?.length) {
      console.error('Failed to fetch projects. Status:', projectsResponse.status);
      return testResults;
    }
    
    const project = projectsResponse.data[0];
    console.log(`Using project: ${project.name} (${project.id})`);
    testResults.projectsFetched = true;
    
    // Step 2: Get tasks for the first project
    console.log('\n=== FETCHING TASKS ===');
    const tasksResponse = await apiRequest('GET', `/api/projects/${project.id}/tasks`);
    
    if (tasksResponse.status !== 200 || !tasksResponse.data?.length) {
      console.log('No tasks found. Creating a test task...');
      
      // Create a test task
      const newTaskResponse = await apiRequest('POST', `/api/projects/${project.id}/tasks`, {
        projectId: project.id,
        text: 'UUID matching test task',
        stage: 'Identification',
        origin: 'test',
        source: 'test',
        status: 'To Do',
        priority: 'Medium',
        completed: false
      });
      
      if (newTaskResponse.status !== 201) {
        console.error('Failed to create test task. Status:', newTaskResponse.status);
        return testResults;
      }
      
      console.log('Created test task:', newTaskResponse.data.id);
      const task = newTaskResponse.data;
      testResults.tasksFound = true;
      
      // Test with the newly created task
      return await runTaskUpdates(project.id, task, testResults);
    }
    
    const task = tasksResponse.data[0];
    console.log(`Found existing task: ${task.text} (${task.id})`);
    testResults.tasksFound = true;
    
    // Step 3: Test updating the task
    return await runTaskUpdates(project.id, task, testResults);
    
  } catch (error) {
    console.error('Test error:', error);
    return testResults;
  }
}

// Test updating a task with both full ID and prefix
async function runTaskUpdates(projectId, task, testResults) {
  // Extract task properties
  const fullId = task.id;
  const prefixId = getUuidPrefix(fullId);
  
  console.log('\n=== TASK ID DETAILS ===');
  console.log(`Full ID: ${fullId}`);
  console.log(`Prefix ID: ${prefixId}`);
  
  // Test 1: Update with full ID
  console.log('\n=== TEST 1: UPDATE WITH FULL ID ===');
  const fullIdResponse = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${fullId}`, {
    notes: `Full ID update at ${new Date().toISOString()}`
  });
  
  testResults.fullIdUpdate = fullIdResponse.status === 200;
  console.log(`Test 1 result: ${testResults.fullIdUpdate ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
  
  // Test 2: Update with prefix ID
  console.log('\n=== TEST 2: UPDATE WITH PREFIX ID ===');
  const prefixResponse = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${prefixId}`, {
    notes: `Prefix ID update at ${new Date().toISOString()}`
  });
  
  testResults.prefixUpdate = prefixResponse.status === 200;
  console.log(`Test 2 result: ${testResults.prefixUpdate ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
  
  // Verify final state
  console.log('\n=== VERIFYING FINAL STATE ===');
  const finalTasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (finalTasksResponse.status === 200) {
    const updatedTask = finalTasksResponse.data.find(t => t.id === fullId);
    if (updatedTask) {
      console.log('Updated task notes:', updatedTask.notes);
    }
  }
  
  return testResults;
}

// Run the test
runTest()
  .then(results => {
    console.log('\n=== OVERALL TEST RESULTS ===');
    console.log(JSON.stringify(results, null, 2));
    console.log(`Overall test ${Object.values(results).every(Boolean) ? 'PASSED ✅' : 'FAILED ❌'}`);
    process.exit(Object.values(results).every(Boolean) ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });