/**
 * Success Factor Task Persistence Test Script
 * 
 * This script performs an end-to-end test of the Success Factor task fixes:
 * 1. Creates a new project
 * 2. Ensures Success Factor tasks are properly seeded
 * 3. Verifies no duplicate tasks exist
 * 4. Toggles a Success Factor task and a normal task
 * 5. Verifies the toggled states persist
 * 
 * Run with: node test-sf-task-fixes.js
 */

// Import required modules
import fetch from 'node-fetch';
import crypto from 'crypto';

// Test Configuration
const BASE_URL = 'http://localhost:3000';
const PROJECT_NAME = `Test Project ${Date.now()}`;
let SESSION_COOKIE = '';

// Utility functions
function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️ ${message}`);
}

// Check if a response is OK (status 200-299)
function isResponseOk(response) {
  return response.status >= 200 && response.status < 300;
}

// Make an authenticated API request
async function apiRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': SESSION_COOKIE
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    // Update session cookie if it's in the response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      SESSION_COOKIE = setCookie;
    }
    
    // Parse response JSON or return null for non-JSON responses
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }
    
    return {
      ok: isResponseOk(response),
      status: response.status,
      data
    };
  } catch (error) {
    console.error(`Error making API request to ${url}:`, error);
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

// Login to the application
async function login() {
  logInfo('Logging in...');
  
  const response = await apiRequest('POST', '/api/auth/login', {
    username: 'greg@confluity.co.uk',
    password: 'password'
  });
  
  if (!response.ok) {
    logError(`Failed to login: ${response.status}`);
    return false;
  }
  
  logSuccess('Logged in successfully');
  return true;
}

// Create a new project
async function createProject() {
  logInfo(`Creating new project: ${PROJECT_NAME}...`);
  
  const response = await apiRequest('POST', '/api/projects', {
    name: PROJECT_NAME
  });
  
  if (!response.ok || !response.data || !response.data.id) {
    logError(`Failed to create project: ${response.status}`);
    return null;
  }
  
  logSuccess(`Created project with ID: ${response.data.id}`);
  return response.data.id;
}

// Get tasks for a project
async function getTasks(projectId, ensure = true) {
  logInfo(`Getting tasks for project ${projectId}${ensure ? ' (with ensure=true)' : ''}...`);
  
  const response = await apiRequest('GET', `/api/projects/${projectId}/tasks${ensure ? '?ensure=true' : ''}`);
  
  if (!response.ok) {
    logError(`Failed to get tasks: ${response.status}`);
    return null;
  }
  
  logSuccess(`Retrieved ${response.data.length} tasks`);
  return response.data;
}

// Toggle a task's completion state
async function toggleTask(projectId, taskId, completed) {
  logInfo(`Toggling task ${taskId} to completed=${completed}...`);
  
  const response = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${taskId}`, {
    completed
  });
  
  if (!response.ok) {
    logError(`Failed to toggle task: ${response.status}`);
    return false;
  }
  
  logSuccess(`Toggled task ${taskId} to completed=${completed}`);
  return true;
}

// Check for duplicate Success Factor tasks
function checkForDuplicates(tasks) {
  const successFactorTasks = tasks.filter(task => task.origin === 'factor');
  const successFactorTasksBySourceId = {};
  
  // Group tasks by sourceId and stage
  for (const task of successFactorTasks) {
    const key = `${task.sourceId}:${task.stage}`;
    if (!successFactorTasksBySourceId[key]) {
      successFactorTasksBySourceId[key] = [];
    }
    successFactorTasksBySourceId[key].push(task);
  }
  
  // Check for duplicates
  const duplicates = Object.entries(successFactorTasksBySourceId)
    .filter(([key, tasks]) => tasks.length > 1)
    .map(([key, tasks]) => ({
      key,
      count: tasks.length,
      tasks
    }));
  
  return duplicates;
}

// Run the end-to-end test
async function runTest() {
  console.log('=== SUCCESS FACTOR TASK PERSISTENCE TEST ===\n');
  let allStepsPassed = true;
  
  try {
    // Step 1: Login
    if (!await login()) {
      process.exit(1);
    }
    
    // Step 2: Create a new project
    const projectId = await createProject();
    if (!projectId) {
      process.exit(1);
    }
    
    // Step 3: Get tasks with ensure=true to trigger Success Factor seeding
    const initialTasks = await getTasks(projectId, true);
    if (!initialTasks) {
      process.exit(1);
    }
    
    // Step 4: Check for duplicate Success Factor tasks
    const duplicates = checkForDuplicates(initialTasks);
    if (duplicates.length > 0) {
      logError(`Found ${duplicates.length} Success Factors with duplicate tasks`);
      console.log('Duplicate tasks:');
      duplicates.forEach(dupe => {
        console.log(`- ${dupe.key}: ${dupe.count} tasks (should be 1)`);
      });
      allStepsPassed = false;
    } else {
      logSuccess('No duplicate Success Factor tasks found');
    }
    
    // Step 5: Verify we have the expected number of Success Factor tasks
    const successFactorTasks = initialTasks.filter(task => task.origin === 'factor');
    // Each Success Factor should have 3 tasks (identification, definition, delivery)
    // So divide by 3 to get the number of unique Success Factors
    const uniqueSuccessFactors = new Set(successFactorTasks.map(task => task.sourceId)).size;
    
    logInfo(`Found ${successFactorTasks.length} Success Factor tasks for ${uniqueSuccessFactors} unique Success Factors`);
    
    if (successFactorTasks.length !== uniqueSuccessFactors * 3) {
      logError(`Expected ${uniqueSuccessFactors * 3} Success Factor tasks (${uniqueSuccessFactors} factors × 3 stages), but found ${successFactorTasks.length}`);
      allStepsPassed = false;
    } else {
      logSuccess(`Correct number of Success Factor tasks: ${successFactorTasks.length}`);
    }
    
    // Step 6: Toggle a Success Factor task
    const sfTaskToToggle = successFactorTasks[0];
    if (!sfTaskToToggle) {
      logError('No Success Factor tasks found to toggle');
      allStepsPassed = false;
    } else {
      const toggleResult = await toggleTask(projectId, sfTaskToToggle.id, !sfTaskToToggle.completed);
      if (!toggleResult) {
        allStepsPassed = false;
      }
    }
    
    // Step 7: Create and toggle a custom task
    logInfo('Creating a custom task...');
    const createTaskResponse = await apiRequest('POST', `/api/projects/${projectId}/tasks`, {
      text: `Custom test task ${Date.now()}`,
      status: 'To Do',
      completed: false
    });
    
    if (!createTaskResponse.ok || !createTaskResponse.data || !createTaskResponse.data.id) {
      logError(`Failed to create custom task: ${createTaskResponse.status}`);
      allStepsPassed = false;
    } else {
      logSuccess(`Created custom task with ID: ${createTaskResponse.data.id}`);
      
      // Toggle the custom task
      const customTaskToggleResult = await toggleTask(projectId, createTaskResponse.data.id, true);
      if (!customTaskToggleResult) {
        allStepsPassed = false;
      }
    }
    
    // Step 8: Get tasks again and verify toggled states persisted
    logInfo('Verifying task toggle persistence...');
    const updatedTasks = await getTasks(projectId, false);
    if (!updatedTasks) {
      allStepsPassed = false;
    } else {
      // Check if Success Factor task toggle persisted
      const updatedSfTask = updatedTasks.find(task => task.id === sfTaskToToggle?.id);
      if (!updatedSfTask) {
        logError(`Could not find toggled Success Factor task ${sfTaskToToggle?.id} in updated tasks`);
        allStepsPassed = false;
      } else if (updatedSfTask.completed === sfTaskToToggle.completed) {
        logError(`Success Factor task toggle did not persist: expected completed=${!sfTaskToToggle.completed}, got completed=${updatedSfTask.completed}`);
        allStepsPassed = false;
      } else {
        logSuccess(`Success Factor task toggle persisted correctly: completed=${updatedSfTask.completed}`);
      }
      
      // Check if custom task toggle persisted
      if (createTaskResponse?.data?.id) {
        const updatedCustomTask = updatedTasks.find(task => task.id === createTaskResponse.data.id);
        if (!updatedCustomTask) {
          logError(`Could not find toggled custom task ${createTaskResponse.data.id} in updated tasks`);
          allStepsPassed = false;
        } else if (!updatedCustomTask.completed) {
          logError(`Custom task toggle did not persist: expected completed=true, got completed=${updatedCustomTask.completed}`);
          allStepsPassed = false;
        } else {
          logSuccess(`Custom task toggle persisted correctly: completed=${updatedCustomTask.completed}`);
        }
      }
    }
    
    // Final summary
    console.log('\n=== TEST SUMMARY ===');
    if (allStepsPassed) {
      logSuccess('All tests passed! Both fixes appear to be working correctly.');
      logSuccess('1. No duplicate Success Factor tasks found during seeding');
      logSuccess('2. Task toggle operations are correctly persisted (proper project boundary enforcement)');
      process.exit(0);
    } else {
      logError('Some tests failed. Please check the logs above for details.');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Unexpected error during test: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();