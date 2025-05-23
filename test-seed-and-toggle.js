/**
 * Success Factor Task Seeding and Toggle Test
 * 
 * This test script exposes two specific regressions:
 * 1. Task duplication during Success Factor seeding
 * 2. Failures to persist task toggle state
 */

import fetch from 'node-fetch';

// Configuration
const baseUrl = 'http://localhost:5000';
const credentials = {
  username: 'greg@confluity.co.uk',
  password: 'Password123!'
};

// Helper to make API requests
async function apiRequest(method, endpoint, body = null, cookie = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  
  const options = {
    method,
    headers
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`${method} ${endpoint}`);
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  
  // Log response status
  console.log(`Response status: ${response.status}`);
  
  // Return both response and parsed data
  return {
    status: response.status,
    headers: response.headers,
    data: response.status !== 204 ? await response.json() : null
  };
}

async function runTest() {
  try {
    console.log('=== Running Success Factor Task Seeding and Toggle Test ===');
    
    // Step 1: Authenticate to get a valid session cookie
    console.log('\n== Step 1: Authentication ==');
    const loginResponse = await apiRequest('POST', '/api/auth/login', credentials);
    
    if (loginResponse.status !== 200) {
      console.error('Authentication failed:', loginResponse);
      return;
    }
    
    const authCookie = loginResponse.headers.get('set-cookie');
    console.log('Authentication successful. Cookie received.');
    
    // Step 2: Create a new project for testing
    console.log('\n== Step 2: Create Test Project ==');
    const projectName = `Test Project ${Date.now()}`;
    const createProjectResponse = await apiRequest(
      'POST',
      '/api/projects',
      {
        name: projectName,
        organisationId: '867fe8f2-ae5f-451c-872a-0d1582b47c6d'
      },
      authCookie
    );
    
    if (createProjectResponse.status !== 201) {
      console.error('Failed to create project:', createProjectResponse);
      return;
    }
    
    const projectId = createProjectResponse.data.id;
    console.log(`Created test project: ${projectId}`);
    
    // Step 3: Trigger Success Factor seeding with ensure=true
    console.log('\n== Step 3: Test Success Factor Seeding ==');
    console.log('Requesting tasks with ensure=true to trigger seeding...');
    const tasksResponse = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks?ensure=true`,
      null,
      authCookie
    );
    
    if (tasksResponse.status !== 200) {
      console.error('Failed to get tasks:', tasksResponse);
      return;
    }
    
    const tasks = tasksResponse.data;
    
    // Check for duplicate tasks (Regression #1)
    const taskIds = tasks.map(task => task.id);
    const uniqueTaskIds = new Set(taskIds);
    
    console.log(`Total tasks: ${tasks.length}`);
    console.log(`Unique task IDs: ${uniqueTaskIds.size}`);
    console.log(`Success Factor tasks: ${tasks.filter(t => t.origin === 'factor').length}`);
    
    // REGRESSION #1: We expect to see duplicate task IDs here
    if (uniqueTaskIds.size < tasks.length) {
      console.log('\n=== REGRESSION #1 DETECTED: Duplicate Task IDs ===');
      
      // Find and log duplicate IDs
      const idCounts = {};
      taskIds.forEach(id => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      
      const duplicates = Object.entries(idCounts)
        .filter(([_, count]) => count > 1)
        .map(([id, count]) => ({
          id,
          count,
          tasks: tasks.filter(t => t.id === id)
        }));
      
      console.log(`Found ${duplicates.length} duplicate task IDs:`);
      duplicates.forEach(({ id, count, tasks }) => {
        console.log(`- ID ${id} appears ${count} times:`);
        tasks.forEach(task => {
          console.log(`  * ${task.text} (origin: ${task.origin}, sourceId: ${task.sourceId})`);
        });
      });
    } else {
      console.log('No task ID duplicates found - Expected to find duplicates');
    }
    
    // Step 4: Test toggling a Success Factor task (Regression #2)
    console.log('\n== Step 4: Test Success Factor Task Toggle ==');
    
    // Find a Success Factor task to toggle
    const factorTask = tasks.find(t => t.origin === 'factor');
    
    if (!factorTask) {
      console.error('No Success Factor task found to test toggling');
      return;
    }
    
    console.log(`Selected task: ${factorTask.id} - "${factorTask.text}", completed: ${factorTask.completed}`);
    
    // Toggle the task
    const newState = !factorTask.completed;
    console.log(`Toggling task to completed=${newState}...`);
    
    const toggleResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${factorTask.id}`,
      {
        completed: newState,
        status: newState ? 'Done' : 'To Do'
      },
      authCookie
    );
    
    // REGRESSION #2: We expect to see a 400 error here
    if (toggleResponse.status !== 200) {
      console.log('\n=== REGRESSION #2 DETECTED: Task Toggle Failure ===');
      console.log('Error status:', toggleResponse.status);
      console.log('Error response:', toggleResponse.data);
    } else {
      console.log('Task toggle successful - Expected to fail with 400');
    }
    
    // Step 5: Verify if the task state was persisted
    console.log('\n== Step 5: Verify Task State Persistence ==');
    
    // Get tasks again
    const updatedTasksResponse = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks`,
      null,
      authCookie
    );
    
    if (updatedTasksResponse.status !== 200) {
      console.error('Failed to get updated tasks:', updatedTasksResponse);
      return;
    }
    
    const updatedTasks = updatedTasksResponse.data;
    const updatedTask = updatedTasks.find(t => t.id === factorTask.id);
    
    if (!updatedTask) {
      console.log('Task not found after update - This indicates persistence issues');
    } else {
      console.log(`Updated task state: completed=${updatedTask.completed} (expected: ${newState})`);
      
      if (updatedTask.completed !== newState) {
        console.log('\n=== REGRESSION CONFIRMED: Task state not persisted correctly ===');
      } else {
        console.log('Task state persisted correctly - Did not expose expected regression');
      }
    }
    
    // Step 6: Test custom task toggling for comparison
    console.log('\n== Step 6: Test Custom Task Toggle (Control Test) ==');
    
    // Create a custom task
    const createCustomTaskResponse = await apiRequest(
      'POST',
      `/api/projects/${projectId}/tasks`,
      {
        text: `Test Custom Task ${Date.now()}`,
        stage: 'identification',
        origin: 'custom',
        completed: false,
        status: 'To Do'
      },
      authCookie
    );
    
    if (createCustomTaskResponse.status !== 201) {
      console.error('Failed to create custom task:', createCustomTaskResponse);
      return;
    }
    
    const customTask = createCustomTaskResponse.data;
    console.log(`Created custom task: ${customTask.id} - "${customTask.text}"`);
    
    // Toggle the custom task
    console.log('Toggling custom task to completed=true...');
    
    const toggleCustomResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${customTask.id}`,
      {
        completed: true,
        status: 'Done'
      },
      authCookie
    );
    
    if (toggleCustomResponse.status !== 200) {
      console.log('Custom task toggle failed - This is unexpected');
      console.log('Error:', toggleCustomResponse);
    } else {
      console.log('Custom task toggle successful');
    }
    
    // Verify custom task state persistence
    const finalTasksResponse = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks`,
      null,
      authCookie
    );
    
    if (finalTasksResponse.status !== 200) {
      console.error('Failed to get final tasks:', finalTasksResponse);
      return;
    }
    
    const finalTasks = finalTasksResponse.data;
    const finalCustomTask = finalTasks.find(t => t.id === customTask.id);
    
    if (!finalCustomTask) {
      console.log('Custom task not found - This indicates persistence issues');
    } else {
      console.log(`Final custom task state: completed=${finalCustomTask.completed} (expected: true)`);
      
      if (finalCustomTask.completed !== true) {
        console.log('Custom task state not persisted correctly - This is unexpected');
      } else {
        console.log('Custom task state persisted correctly - This is expected');
      }
    }
    
    console.log('\n=== Test Completed ===');
    console.log('Regressions detected:');
    console.log('1. Duplicate task IDs during Success Factor seeding');
    console.log('2. Success Factor task toggle state not persisting correctly');
    
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runTest();