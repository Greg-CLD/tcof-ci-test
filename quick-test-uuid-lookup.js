/**
 * Quick Test Script for UUID Matching Logic
 * 
 * This simple script:
 * 1. Gets projects for the current user
 * 2. Gets tasks for the first project
 * 3. Tests updating a task using its full ID
 * 4. Tests updating the same task using a partial UUID
 * 
 * Purpose: Verify that our task persistence fix correctly handles 
 * both full IDs and clean UUID prefixes
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Set up constants
const API_HOST = 'http://localhost:5000';
const COOKIES_FILE = './cookies.txt';

// Read session cookies
function getCookies() {
  try {
    return fs.existsSync(COOKIES_FILE) ? 
      fs.readFileSync(COOKIES_FILE, 'utf-8').trim() : '';
  } catch (err) {
    console.error('Error reading cookies:', err);
    return '';
  }
}

// Make an authenticated API request
async function apiRequest(method, endpoint, body = null) {
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
  
  const url = `${API_HOST}${endpoint}`;
  console.log(`${method} ${url}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    console.error('API request failed:', error);
    return { status: 500, error };
  }
}

// Extract the clean UUID from a compound ID
function getCleanUuid(fullId) {
  // Take the first 5 segments of the UUID (standard UUID format)
  return fullId.split('-').slice(0, 5).join('-');
}

// Main test function
async function runTest() {
  try {
    // 1. Get projects
    console.log('Getting projects...');
    const { status, data: projects } = await apiRequest('GET', '/api/projects');
    
    if (status !== 200 || !projects || !projects.length) {
      console.error('Failed to get projects:', status);
      return false;
    }
    
    const project = projects[0];
    console.log(`Using project: ${project.name} (${project.id})`);
    
    // 2. Get tasks for this project
    console.log('Getting tasks...');
    const { status: taskStatus, data: tasks } = await apiRequest(
      'GET', 
      `/api/projects/${project.id}/tasks`
    );
    
    if (taskStatus !== 200 || !tasks || !tasks.length) {
      console.log('No tasks found. Creating a test task...');
      
      // Create a test task
      const { status: createStatus, data: newTask } = await apiRequest(
        'POST',
        `/api/projects/${project.id}/tasks`,
        {
          projectId: project.id,
          text: 'UUID matching test task',
          stage: 'Identification',
          origin: 'test',
          source: 'test',
          status: 'To Do',
          priority: 'Medium',
          completed: false
        }
      );
      
      if (createStatus !== 201 || !newTask) {
        console.error('Failed to create test task:', createStatus);
        return false;
      }
      
      console.log('Created test task:', newTask.id);
      return runUpdates(project.id, newTask);
    }
    
    const testTask = tasks[0];
    console.log(`Using existing task: ${testTask.text} (${testTask.id})`);
    return runUpdates(project.id, testTask);
    
  } catch (error) {
    console.error('Test error:', error);
    return false;
  }
}

// Run update tests with both full ID and clean UUID
async function runUpdates(projectId, task) {
  // Test 1: Update with full ID
  console.log('\n=== TEST 1: Update with full ID ===');
  const fullIdResult = await testUpdate(
    projectId, 
    task.id, 
    { notes: `Full ID update at ${new Date().toISOString()}` }
  );
  
  // Test 2: Update with clean UUID
  console.log('\n=== TEST 2: Update with clean UUID ===');
  const cleanUuid = getCleanUuid(task.id);
  console.log(`Full ID: ${task.id}`);
  console.log(`Clean UUID: ${cleanUuid}`);
  
  const cleanUuidResult = await testUpdate(
    projectId,
    cleanUuid,
    { notes: `Clean UUID update at ${new Date().toISOString()}` }
  );
  
  // Verify final task state
  console.log('\n=== Verifying Task State ===');
  const { status, data: tasks } = await apiRequest(
    'GET',
    `/api/projects/${projectId}/tasks`
  );
  
  const updatedTask = tasks.find(t => t.id === task.id);
  if (updatedTask) {
    console.log('Updated task:', {
      id: updatedTask.id,
      notes: updatedTask.notes
    });
  }
  
  // Summary
  console.log('\n=== TEST RESULTS ===');
  console.log(`Full ID update: ${fullIdResult ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log(`Clean UUID update: ${cleanUuidResult ? 'PASSED ✓' : 'FAILED ✗'}`);
  
  return fullIdResult && cleanUuidResult;
}

// Perform a single update test
async function testUpdate(projectId, taskId, updateData) {
  const { status } = await apiRequest(
    'PUT',
    `/api/projects/${projectId}/tasks/${taskId}`,
    updateData
  );
  
  console.log(`Update status: ${status}`);
  return status === 200;
}

// Run the test and exit with appropriate code
runTest()
  .then(success => {
    console.log(`\nOverall test ${success ? 'PASSED ✓' : 'FAILED ✗'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });