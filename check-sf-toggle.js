/**
 * Success Factor Task Toggle Test
 * 
 * This script tests toggling a Success Factor task and logs all requests, responses,
 * and results for diagnostic purposes.
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

// Configuration
const TEST_PROJECT_ID = '29ef6e22-52fc-43e3-a05b-19c42bed7d49';
const BASE_URL = 'http://localhost:5000'; // Using port 5000 where our Express server is running

async function runTest() {
  try {
    console.log('=== SUCCESS FACTOR TASK TOGGLE TEST ===\n');
    
    // Step 1: Read session cookie from file
    let sessionCookie;
    try {
      sessionCookie = fs.readFileSync('current-session.txt', 'utf8');
      console.log('Successfully loaded session cookie');
    } catch (err) {
      console.error('Failed to read session cookie:', err.message);
      
      // Create a session cookie by extracting from a login request
      console.log('Attempting to create a session cookie by logging in...');
      await createSessionCookie();
      sessionCookie = fs.readFileSync('current-session.txt', 'utf8');
    }
    
    // Step 2: Get all tasks for the test project
    console.log(`\nFetching tasks for project ${TEST_PROJECT_ID}...`);
    const tasksUrl = `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks?ensure=true`;
    console.log(`Request URL: ${tasksUrl}`);
    
    const tasksResponse = await fetch(tasksUrl, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (!tasksResponse.ok) {
      console.error(`Failed to fetch tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
      
      // Try to show more error details
      try {
        const errorText = await tasksResponse.text();
        console.error('Error details:', errorText);
      } catch (e) {}
      
      return;
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Retrieved ${tasks.length} tasks from API`);
    
    // Step 3: Find Success Factor tasks
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      console.log('No Success Factor tasks found. Test cannot continue.');
      return;
    }
    
    // Step 4: Select a task to toggle
    const taskToToggle = successFactorTasks[0];
    console.log('\n=== TASK SELECTED FOR TOGGLE ===');
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text}`);
    console.log(`Stage: ${taskToToggle.stage}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`SourceId: ${taskToToggle.sourceId}`);
    console.log(`Current completion state: ${taskToToggle.completed}`);
    
    // Step 5: Toggle the task
    const newCompletionState = !taskToToggle.completed;
    console.log(`\n=== TOGGLING TASK TO ${newCompletionState} ===`);
    
    const toggleUrl = `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks/${taskToToggle.id}`;
    console.log(`Toggle URL: ${toggleUrl}`);
    
    const toggleResponse = await fetch(toggleUrl, {
      method: 'PUT',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        completed: newCompletionState
      })
    });
    
    console.log(`\nToggle Response Status: ${toggleResponse.status}`);
    
    // Response body
    let toggleResponseBody;
    try {
      const text = await toggleResponse.text();
      
      // Try to parse as JSON if possible
      try {
        toggleResponseBody = JSON.parse(text);
        console.log('Toggle Response Body (JSON):', JSON.stringify(toggleResponseBody, null, 2));
      } catch (e) {
        console.log('Toggle Response Body (Text):', text);
      }
    } catch (e) {
      console.log('Could not read toggle response body.');
    }
    
    // Step 6: Fetch tasks again to see if toggle persisted
    console.log('\n=== VERIFYING TOGGLE PERSISTENCE ===');
    
    const tasksAfterToggleResponse = await fetch(tasksUrl, {
      headers: { 'Cookie': sessionCookie }
    });
    
    const tasksAfterToggle = await tasksAfterToggleResponse.json();
    console.log(`Retrieved ${tasksAfterToggle.length} tasks after toggle`);
    
    // Find the toggled task in the results
    const toggledTask = tasksAfterToggle.find(task => task.id === taskToToggle.id);
    
    if (toggledTask) {
      console.log('\n=== TASK AFTER TOGGLE ===');
      console.log(`ID: ${toggledTask.id}`);
      console.log(`Text: ${toggledTask.text}`);
      console.log(`Origin: ${toggledTask.origin}`);
      console.log(`Completion state: ${toggledTask.completed}`);
      
      if (toggledTask.completed === newCompletionState) {
        console.log('\n✅ SUCCESS: Task toggle persisted!');
      } else {
        console.log('\n❌ FAILURE: Task toggle did not persist!');
        console.log(`Expected: ${newCompletionState}, Actual: ${toggledTask.completed}`);
      }
    } else {
      console.log('\n❌ FAILURE: Could not find toggled task in results!');
    }
    
    // Final analysis
    console.log('\n=== DIAGNOSIS ===');
    
    if (toggleResponse.status !== 200) {
      console.log('Problem: API endpoint returned error status code');
      console.log('Possible causes:');
      console.log('1. Authentication or permission issues');
      console.log('2. Task not found in the database');
      console.log('3. Server-side error in task processing');
    } 
    else if (!toggledTask) {
      console.log('Problem: Task disappeared after toggle');
      console.log('Possible causes:');
      console.log('1. Task was deleted during the toggle operation');
      console.log('2. Task ID changed during the toggle operation');
    }
    else if (toggledTask.completed !== newCompletionState) {
      console.log('Problem: Task completion state not updated');
      console.log('Possible causes:');
      console.log('1. Database update failed');
      console.log('2. Business logic prevented the update');
      console.log('3. Success Factor tasks have special handling that failed');
    }
    else {
      console.log('No issues detected! The Success Factor task toggle is working correctly.');
    }
    
  } catch (error) {
    console.error('Error running test:', error);
  }
}

async function createSessionCookie() {
  try {
    // Simpler approach - just make a request to a protected endpoint and extract the cookie
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'tcof123'
      })
    });
    
    const cookies = response.headers.raw()['set-cookie'];
    
    if (cookies && cookies.length > 0) {
      // Extract the session cookie
      const sessionCookie = cookies.find(cookie => cookie.includes('connect.sid'));
      
      if (sessionCookie) {
        // Save just the name=value part, not the full cookie with attributes
        const sessionValue = sessionCookie.split(';')[0];
        await fs.writeFile('current-session.txt', sessionValue);
        console.log('Created and saved new session cookie');
      }
    }
  } catch (error) {
    console.error('Failed to create session cookie:', error);
  }
}

// Run the test
runTest();