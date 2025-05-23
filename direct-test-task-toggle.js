/**
 * Direct Task Toggle Test
 *
 * This script directly tests the Success Factor task toggle API endpoint
 * without any complex dependencies. It will:
 * 1. Extract the session cookie from a browser session
 * 2. Get tasks for a project
 * 3. Toggle a Success Factor task's completion state
 * 4. Verify the state change persisted
 */

import fetch from 'node-fetch';

// Configuration
const TEST_PROJECT_ID = '29ef6e22-52fc-43e3-a05b-19c42bed7d49';
const BASE_URL = 'http://localhost:5000';

// Read from environment variables or a file we've created
const SESSION_COOKIE = 'connect.sid=s%3AGzFWGtM2karVuxzsRH2nGEjg_yuVt-C1.4JEm0JHwKvjf5K7LUQUJZAjyKLjWyVmfAGxBFd8MROU';

async function runTest() {
  try {
    console.log('=== DIRECT SUCCESS FACTOR TASK TOGGLE TEST ===');
    
    // Step 1: Get all tasks for the project with ensure=true
    console.log(`\nFetching tasks for project ${TEST_PROJECT_ID} with ensure=true...`);
    const tasksUrl = `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks?ensure=true`;
    
    const tasksResponse = await fetch(tasksUrl, {
      headers: { 'Cookie': SESSION_COOKIE }
    });
    
    if (!tasksResponse.ok) {
      console.error(`Failed to fetch tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
      const errorBody = await tasksResponse.text();
      console.error('Error body:', errorBody);
      return;
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Retrieved ${tasks.length} tasks in total`);
    
    // Find Success Factor tasks
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      console.error('No Success Factor tasks found. Test cannot proceed.');
      return;
    }
    
    // Select the first Success Factor task
    const taskToToggle = successFactorTasks[0];
    console.log('\nSelected task to toggle:');
    console.log(JSON.stringify(taskToToggle, null, 2));
    
    // Create the toggle payload (flip the current state)
    const newCompletionState = !taskToToggle.completed;
    const togglePayload = JSON.stringify({ completed: newCompletionState });
    
    console.log(`\nToggling task ${taskToToggle.id} from ${taskToToggle.completed} to ${newCompletionState}...`);
    
    // Make the PUT request to toggle the task
    const toggleUrl = `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks/${taskToToggle.id}`;
    console.log(`Request URL: ${toggleUrl}`);
    console.log(`Request body: ${togglePayload}`);
    
    const toggleResponse = await fetch(toggleUrl, {
      method: 'PUT',
      headers: {
        'Cookie': SESSION_COOKIE,
        'Content-Type': 'application/json'
      },
      body: togglePayload
    });
    
    console.log(`\nToggle response status: ${toggleResponse.status}`);
    
    let toggleResponseBody;
    try {
      const toggleResponseText = await toggleResponse.text();
      console.log(`Raw response: ${toggleResponseText}`);
      
      try {
        toggleResponseBody = JSON.parse(toggleResponseText);
        console.log('Parsed JSON response:', JSON.stringify(toggleResponseBody, null, 2));
      } catch (e) {
        console.log('Response is not valid JSON');
      }
    } catch (e) {
      console.log('Could not read response body');
    }
    
    // Fetch tasks again to verify the change persisted
    console.log('\nFetching tasks again to verify the toggle worked...');
    
    const verifyResponse = await fetch(tasksUrl, {
      headers: { 'Cookie': SESSION_COOKIE }
    });
    
    if (!verifyResponse.ok) {
      console.error(`Failed to fetch tasks: ${verifyResponse.status}`);
      return;
    }
    
    const tasksAfterToggle = await verifyResponse.json();
    
    // Find the same task after the toggle
    const toggledTask = tasksAfterToggle.find(task => task.id === taskToToggle.id);
    
    if (!toggledTask) {
      console.error('Task disappeared after toggle!');
      return;
    }
    
    console.log('\nTask state after toggle:');
    console.log(JSON.stringify(toggledTask, null, 2));
    
    // Check if the toggle worked
    if (toggledTask.completed === newCompletionState) {
      console.log('\n✅ SUCCESS: Task toggle worked! The new state persisted.');
    } else {
      console.log('\n❌ FAILURE: Task toggle did not persist!');
      console.log(`Expected: ${newCompletionState}, Actual: ${toggledTask.completed}`);
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

runTest();