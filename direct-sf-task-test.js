/**
 * Direct Success Factor Task Toggle Test
 * 
 * This script tests the toggle functionality for Success Factor tasks by:
 * 1. Finding a specific project with Success Factor tasks
 * 2. Getting all tasks for the project
 * 3. Selecting a Success Factor task to toggle
 * 4. Making a direct API call to toggle the task
 * 5. Verifying the task state changed in the database
 */

import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import fetch from 'node-fetch';
import fs from 'fs/promises';

// Test with a known project that has Success Factor tasks
const TEST_PROJECT_ID = '29ef6e22-52fc-43e3-a05b-19c42bed7d49';

async function runDirectTest() {
  console.log('=== DIRECT SUCCESS FACTOR TASK TOGGLE TEST ===\n');
  
  try {
    // Step 1: Load session cookie for authentication
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) {
      console.error('No session cookie found. Please login to the application first.');
      return;
    }
    
    console.log(`Testing project: ${TEST_PROJECT_ID}`);
    
    // Step 2: Get tasks from API with ensure=true parameter
    console.log('\n=== TASKS BEFORE TOGGLE (API) ===');
    const tasksResponse = await fetch(`http://localhost:3000/api/projects/${TEST_PROJECT_ID}/tasks?ensure=true`, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    // Log response details
    console.log(`API Response Status: ${tasksResponse.status}`);
    console.log(`Response Headers:`, tasksResponse.headers.raw());
    
    // Parse response body
    const tasks = await tasksResponse.json();
    console.log(`Retrieved ${tasks.length} tasks from API`);
    
    // Find Success Factor tasks
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      console.error('No Success Factor tasks found. Cannot proceed with toggle test.');
      return;
    }
    
    // Step 3: Get current state from database
    console.log('\n=== TASKS BEFORE TOGGLE (DATABASE) ===');
    const dbTasksBefore = await getTasksFromDatabase(TEST_PROJECT_ID);
    console.log(`Retrieved ${dbTasksBefore.length} tasks from database`);
    
    // Find matching Success Factor tasks in database
    const dbSuccessFactorTasks = dbTasksBefore.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${dbSuccessFactorTasks.length} Success Factor tasks in database`);
    
    // Step 4: Select a task to toggle
    const taskToToggle = successFactorTasks[0];
    console.log('\n=== TASK SELECTED FOR TOGGLE ===');
    console.log(JSON.stringify(taskToToggle, null, 2));
    
    // Find the same task in database
    const dbTaskToToggle = dbTasksBefore.find(task => task.id === taskToToggle.id);
    
    if (dbTaskToToggle) {
      console.log('\n=== DATABASE STATE OF TASK BEFORE TOGGLE ===');
      console.log(JSON.stringify(dbTaskToToggle, null, 2));
    } else {
      console.error(`Task with ID ${taskToToggle.id} not found in database!`);
    }
    
    // Step 5: Toggle the task via API
    console.log('\n=== TOGGLING TASK VIA API ===');
    const newCompletionState = !taskToToggle.completed;
    console.log(`Setting completed state from ${taskToToggle.completed} to ${newCompletionState}`);
    
    const togglePayload = JSON.stringify({
      completed: newCompletionState
    });
    
    console.log(`Request URL: PUT /api/projects/${TEST_PROJECT_ID}/tasks/${taskToToggle.id}`);
    console.log(`Request Payload: ${togglePayload}`);
    
    const toggleResponse = await fetch(
      `http://localhost:3000/api/projects/${TEST_PROJECT_ID}/tasks/${taskToToggle.id}`, 
      {
        method: 'PUT',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json'
        },
        body: togglePayload
      }
    );
    
    // Log toggle response details
    console.log(`\nToggle Response Status: ${toggleResponse.status}`);
    console.log(`Toggle Response Headers:`, toggleResponse.headers.raw());
    
    // Get response body
    const toggleResponseText = await toggleResponse.text();
    
    try {
      // Try to parse as JSON
      const toggleResponseJson = JSON.parse(toggleResponseText);
      console.log('Toggle Response Body (JSON):', JSON.stringify(toggleResponseJson, null, 2));
    } catch (e) {
      // If not valid JSON, show as text
      console.log(`Toggle Response Body (Text): ${toggleResponseText}`);
    }
    
    // Step 6: Get tasks after toggle from API
    console.log('\n=== TASKS AFTER TOGGLE (API) ===');
    const tasksAfterResponse = await fetch(`http://localhost:3000/api/projects/${TEST_PROJECT_ID}/tasks`, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    const tasksAfter = await tasksAfterResponse.json();
    console.log(`Retrieved ${tasksAfter.length} tasks from API after toggle`);
    
    // Find toggled task in API response
    const toggledTaskAfter = tasksAfter.find(task => task.id === taskToToggle.id);
    
    if (toggledTaskAfter) {
      console.log('\n=== TOGGLED TASK IN API AFTER TOGGLE ===');
      console.log(JSON.stringify(toggledTaskAfter, null, 2));
      
      // Check if toggle was successful
      if (toggledTaskAfter.completed === newCompletionState) {
        console.log('✅ SUCCESS: Task toggle reflected in API response');
      } else {
        console.log('❌ FAILURE: Task toggle not reflected in API response');
        console.log(`  - Expected: completed=${newCompletionState}`);
        console.log(`  - Actual: completed=${toggledTaskAfter.completed}`);
      }
    } else {
      console.error(`Task with ID ${taskToToggle.id} not found in API response after toggle!`);
    }
    
    // Step 7: Get tasks after toggle from database
    console.log('\n=== TASKS AFTER TOGGLE (DATABASE) ===');
    const dbTasksAfter = await getTasksFromDatabase(TEST_PROJECT_ID);
    console.log(`Retrieved ${dbTasksAfter.length} tasks from database after toggle`);
    
    // Find toggled task in database
    const dbToggledTaskAfter = dbTasksAfter.find(task => task.id === taskToToggle.id);
    
    if (dbToggledTaskAfter) {
      console.log('\n=== TOGGLED TASK IN DATABASE AFTER TOGGLE ===');
      console.log(JSON.stringify(dbToggledTaskAfter, null, 2));
      
      // Check if toggle was successful in database
      if (dbToggledTaskAfter.completed === newCompletionState) {
        console.log('✅ SUCCESS: Task toggle persisted to database');
      } else {
        console.log('❌ FAILURE: Task toggle not persisted to database');
        console.log(`  - Expected: completed=${newCompletionState}`);
        console.log(`  - Actual: completed=${dbToggledTaskAfter.completed}`);
      }
    } else {
      console.error(`Task with ID ${taskToToggle.id} not found in database after toggle!`);
    }
    
    // Step 8: Final analysis and diagnosis
    console.log('\n=== DIAGNOSIS SUMMARY ===');
    
    if (!toggledTaskAfter || !dbToggledTaskAfter) {
      console.log('❌ CRITICAL ISSUE: Task disappeared during toggle process');
      
      if (!toggledTaskAfter) console.log('- Task missing from API response after toggle');
      if (!dbToggledTaskAfter) console.log('- Task missing from database after toggle');
      
      console.log('\nRoot Cause Analysis:');
      console.log('1. The task may have been deleted during the toggle operation');
      console.log('2. The task ID may have changed during the toggle operation');
      console.log('3. There may be a race condition in the task toggle process');
    } else if (toggleResponse.status !== 200) {
      console.log(`❌ API ERROR: Toggle request returned status ${toggleResponse.status}`);
      console.log('\nRoot Cause Analysis:');
      console.log('1. The API endpoint may be returning an error');
      console.log('2. There may be a server-side issue with the toggle operation');
      console.log('3. Authentication or authorization issues may be preventing the toggle');
    } else if (toggledTaskAfter.completed !== newCompletionState) {
      console.log('❌ TOGGLE FAILURE: API response shows incorrect completion state');
      console.log('\nRoot Cause Analysis:');
      console.log('1. The toggle operation may be failing silently');
      console.log('2. The API response may not reflect the actual database state');
      console.log('3. There may be a disconnect between the frontend and backend task models');
    } else if (dbToggledTaskAfter.completed !== newCompletionState) {
      console.log('❌ DATABASE PERSISTENCE FAILURE: Task toggle not saved to database');
      console.log('\nRoot Cause Analysis:');
      console.log('1. The database update operation may be failing');
      console.log('2. There may be a transaction rollback happening');
      console.log('3. The API may be returning success without actually updating the database');
    } else {
      console.log('✅ SUCCESS: The Success Factor task toggle works correctly!');
      console.log('- API toggle request succeeded');
      console.log('- Task state updated in API response');
      console.log('- Task state persisted to database');
    }
    
  } catch (error) {
    console.error('Error running direct test:', error);
  } finally {
    process.exit(0);
  }
}

// Helper function to get session cookie from file
async function getSessionCookie() {
  try {
    return await fs.readFile('current-session.txt', 'utf8');
  } catch (error) {
    console.error('Failed to read session cookie:', error);
    return null;
  }
}

// Helper function to get tasks from database
async function getTasksFromDatabase(projectId) {
  try {
    const tasks = await db.execute(sql`
      SELECT * FROM project_tasks 
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `);
    
    return tasks.rows || [];
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

// Run the test
runDirectTest();