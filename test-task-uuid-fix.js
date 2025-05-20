/**
 * Smoke test for the UUID extraction fix in task updates
 * 
 * This script:
 * 1. Logs in as a test user
 * 2. Fetches a project's tasks
 * 3. Attempts to mark a SuccessFactor task as complete
 * 4. Verifies the update was successful
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:5000';
const USERNAME = 'greg@confluity.co.uk';
const PASSWORD = 'password';
const DEBUG = process.env.DEBUG_LOGS === 'true';

// Helper for logging
function log(message, data = null) {
  if (DEBUG || process.env.DEBUG_TASK_API === 'true') {
    console.log(`[TEST] ${message}`);
    if (data) console.log(data);
  }
}

// Helper for API requests
async function apiRequest(method, endpoint, body = null, headers = {}) {
  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    credentials: 'include'
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  const url = `${BASE_URL}${endpoint}`;
  log(`Making ${method} request to ${url}`);
  
  const response = await fetch(url, requestOptions);
  if (DEBUG) {
    log(`Response status: ${response.status}`);
  }
  
  return response;
}

// Main test function
async function runTest() {
  console.log('=== TASK UPDATE UUID EXTRACTION TEST ===');
  let cookie = null;

  try {
    // Step 1: Login
    console.log('\nLogging in...');
    const loginResponse = await apiRequest('POST', '/api/login', {
      username: USERNAME,
      password: PASSWORD
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${loginResponse.status} ${JSON.stringify(errorData)}`);
    }

    cookie = loginResponse.headers.get('set-cookie');
    if (!cookie) {
      throw new Error('No cookie returned from login');
    }
    log('Login successful, got cookie');

    // Step 2: Fetch projects
    console.log('\nFetching projects...');
    const projectsResponse = await apiRequest('GET', '/api/projects', null, {
      cookie
    });

    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
    }

    const projects = await projectsResponse.json();
    if (!projects || projects.length === 0) {
      throw new Error('No projects found');
    }

    const projectId = projects[0].id;
    console.log(`Using project: ${projectId}`);

    // Step 3: Fetch tasks for the project
    console.log('\nFetching tasks...');
    const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`, null, {
      cookie
    });

    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`);
    }

    const tasks = await tasksResponse.json();
    if (!tasks || tasks.length === 0) {
      throw new Error('No tasks found for project');
    }

    log(`Found ${tasks.length} tasks`);

    // Find a SuccessFactor task to update
    const successFactorTask = tasks.find(task => 
      task.origin === 'factor' || 
      task.origin === 'success-factor' || 
      (task.id && task.id.includes('-'))
    );

    if (!successFactorTask) {
      throw new Error('No suitable SuccessFactor task found for testing');
    }

    console.log(`\nFound SuccessFactor task: ${successFactorTask.id}`);
    console.log(`Current completion state: ${successFactorTask.completed}`);

    // Step 4: Update the task (toggle completion)
    const targetState = !successFactorTask.completed;
    console.log(`\nAttempting to update task completion to: ${targetState}`);
    
    const updateResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${successFactorTask.id}`,
      { completed: targetState },
      { cookie }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Task update failed: ${updateResponse.status} ${errorText}`);
    }

    const updatedTask = await updateResponse.json();
    console.log(`\nTask update response: ${JSON.stringify(updatedTask, null, 2)}`);

    // Step 5: Verify the update with a GET request
    console.log('\nVerifying update with GET request...');
    const verifyResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`, null, {
      cookie
    });

    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify update: ${verifyResponse.status}`);
    }

    const updatedTasks = await verifyResponse.json();
    const verifiedTask = updatedTasks.find(task => task.id === successFactorTask.id);

    if (!verifiedTask) {
      throw new Error(`Could not find updated task in response`);
    }

    console.log(`Verified task completion state: ${verifiedTask.completed}`);

    if (verifiedTask.completed !== targetState) {
      throw new Error(`Task update verification failed: completion state (${verifiedTask.completed}) doesn't match target (${targetState})`);
    }

    return {
      success: true,
      taskId: successFactorTask.id,
      originalState: successFactorTask.completed,
      updatedState: verifiedTask.completed
    };
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error(error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the test
runTest()
  .then(result => {
    console.log('\nTest Result:', result);
    
    if (result.success) {
      console.log('\n✅ TEST PASSED! Task update with UUID extraction is working correctly.');
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED! Fix may not be working correctly.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });