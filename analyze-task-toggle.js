/**
 * Success Factor Task Toggle Analysis
 * 
 * This script directly tests the Success Factor task toggle functionality
 * using only node-fetch for API interaction (no database access required).
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_PROJECT_ID = '29ef6e22-52fc-43e3-a05b-19c42bed7d49';

// Main test function
async function analyzeTaskToggle() {
  console.log('=== SUCCESS FACTOR TASK TOGGLE ANALYSIS ===\n');
  
  try {
    // Step 1: Load session cookie for authentication
    const sessionCookie = await fs.readFile('current-session.txt', 'utf8')
      .catch(err => {
        console.error('Session cookie file not found. Please login to the application first.');
        return null;
      });
    
    if (!sessionCookie) {
      return;
    }
    
    // Step 2: Fetch tasks with ensure=true parameter
    console.log(`Fetching tasks for project ${TEST_PROJECT_ID} with ensure=true parameter...`);
    const tasksUrl = `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks?ensure=true`;
    console.log(`Request URL: ${tasksUrl}`);
    
    const tasksResponse = await fetch(tasksUrl, {
      headers: { 'Cookie': sessionCookie }
    });
    
    console.log(`Tasks API Response Status: ${tasksResponse.status}`);
    
    if (!tasksResponse.ok) {
      console.error(`Failed to fetch tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
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
      console.log('No Success Factor tasks found. Cannot proceed with toggle test.');
      return;
    }
    
    // Step 4: Select a task to toggle
    const taskToToggle = successFactorTasks[0];
    console.log('\n=== TASK SELECTED FOR TOGGLE ===');
    console.log(JSON.stringify(taskToToggle, null, 2));
    
    // Step 5: Toggle the task completion state
    const newCompletionState = !taskToToggle.completed;
    console.log(`\nToggling task completion state from ${taskToToggle.completed} to ${newCompletionState}`);
    
    const toggleUrl = `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks/${taskToToggle.id}`;
    console.log(`Toggle Request URL: ${toggleUrl}`);
    
    const togglePayload = JSON.stringify({ completed: newCompletionState });
    console.log(`Toggle Request Payload: ${togglePayload}`);
    
    const toggleResponse = await fetch(toggleUrl, {
      method: 'PUT',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      },
      body: togglePayload
    });
    
    console.log(`\nToggle Response Status: ${toggleResponse.status}`);
    
    let toggleResult;
    try {
      const toggleText = await toggleResponse.text();
      try {
        toggleResult = JSON.parse(toggleText);
        console.log('Toggle Response (JSON):');
        console.log(JSON.stringify(toggleResult, null, 2));
      } catch (e) {
        console.log(`Toggle Response (Text): ${toggleText}`);
      }
    } catch (e) {
      console.log('Could not read toggle response body');
    }
    
    // Step 6: Fetch tasks again to verify the change
    console.log('\nFetching tasks again to verify the change...');
    
    const tasksAfterResponse = await fetch(`${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    const tasksAfter = await tasksAfterResponse.json();
    console.log(`Retrieved ${tasksAfter.length} tasks after toggle`);
    
    // Find the toggled task
    const toggledTask = tasksAfter.find(task => task.id === taskToToggle.id);
    
    if (toggledTask) {
      console.log('\n=== TASK AFTER TOGGLE ===');
      console.log(JSON.stringify(toggledTask, null, 2));
      
      if (toggledTask.completed === newCompletionState) {
        console.log('\n✅ SUCCESS: Task toggle persisted successfully!');
      } else {
        console.log('\n❌ FAILURE: Task state did not change as expected');
        console.log(`Expected completed: ${newCompletionState}, Actual: ${toggledTask.completed}`);
      }
    } else {
      console.log('\n❌ CRITICAL FAILURE: Task disappeared after toggle!');
    }
    
    // Step 7: Analysis and conclusions
    let failurePoint = null;
    
    if (!toggleResponse.ok) {
      failurePoint = 'API_ERROR';
    } else if (!toggleResult || toggleResult.error) {
      failurePoint = 'RESPONSE_ERROR';
    } else if (!toggledTask) {
      failurePoint = 'TASK_DISAPPEARED';
    } else if (toggledTask.completed !== newCompletionState) {
      failurePoint = 'STATE_NOT_PERSISTED';
    }
    
    console.log('\n=== DIAGNOSIS ===');
    
    if (failurePoint) {
      console.log(`Problem detected: ${failurePoint}`);
      
      switch (failurePoint) {
        case 'API_ERROR':
          console.log('Root cause: The API endpoint returned an error status code');
          console.log('Possible reasons:');
          console.log('1. Authentication or session issues');
          console.log('2. Invalid project ID or task ID');
          console.log('3. Server-side error in task processing');
          break;
          
        case 'RESPONSE_ERROR':
          console.log('Root cause: The API returned an error message or invalid response');
          console.log('Possible reasons:');
          console.log('1. Task validation failed');
          console.log('2. Task ID resolution failed');
          console.log('3. Project-task ownership validation failed');
          break;
          
        case 'TASK_DISAPPEARED':
          console.log('Root cause: The task no longer exists after the toggle attempt');
          console.log('Possible reasons:');
          console.log('1. Task was deleted during toggle');
          console.log('2. Task ID changed during toggle');
          console.log('3. Cache/data inconsistency between API calls');
          break;
          
        case 'STATE_NOT_PERSISTED':
          console.log('Root cause: The toggle change was not saved to the database');
          console.log('Possible reasons:');
          console.log('1. Database update failed');
          console.log('2. Business logic prevented the update');
          console.log('3. Task state was reset by another process');
          break;
      }
    } else {
      console.log('No issues detected. The Success Factor task toggle is working correctly.');
    }
    
  } catch (error) {
    console.error('Error running analysis:', error);
  }
}

// Run the analysis
analyzeTaskToggle();