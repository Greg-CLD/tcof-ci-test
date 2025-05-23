/**
 * Direct Success Factor Task Toggle Test
 *
 * This script performs direct database and API testing to diagnose 
 * why Success Factor tasks aren't persisting their state changes.
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');
const fs = require('fs');

// Configuration
const TEST_PROJECT_ID = '29ef6e22-52fc-43e3-a05b-19c42bed7d49';
const BASE_URL = 'http://localhost:5000';
const SESSION_COOKIE = 'connect.sid=s%3AGzFWGtM2karVuxzsRH2nGEjg_yuVt-C1.4JEm0JHwKvjf5K7LUQUJZAjyKLjWyVmfAGxBFd8MROU';

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function queryTasksFromDb(projectId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, source_id, origin, completed, text 
      FROM project_tasks
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function apiRequest(method, endpoint, body = null) {
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
  
  console.log(`API ${method} ${endpoint}`, body || '');
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    try {
      responseData = await response.text();
    } catch (e2) {
      responseData = 'Could not read response';
    }
  }
  
  return {
    status: response.status,
    data: responseData
  };
}

async function runTest() {
  console.log('=== DIRECT SUCCESS FACTOR TASK TOGGLE TEST ===\n');
  
  try {
    // Step 1: Get tasks from the API with ensure=true
    console.log('Step 1: Getting tasks from API with ensure=true...');
    const tasksResponse = await apiRequest('GET', `/api/projects/${TEST_PROJECT_ID}/tasks?ensure=true`);
    
    if (tasksResponse.status !== 200) {
      console.error(`API Error: ${tasksResponse.status}`);
      console.error(tasksResponse.data);
      return;
    }
    
    const tasks = tasksResponse.data;
    console.log(`Retrieved ${tasks.length} tasks from API`);
    
    // Step 2: Find Success Factor tasks
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      console.error('No Success Factor tasks found. Test cannot proceed.');
      return;
    }
    
    // Step 3: Get current database state
    console.log('\nStep 2: Getting current database state...');
    const dbTasksBefore = await queryTasksFromDb(TEST_PROJECT_ID);
    
    console.log(`Database has ${dbTasksBefore.length} tasks for project ${TEST_PROJECT_ID}`);
    
    // Debug: Save database state before toggle
    fs.writeFileSync('db-tasks-before.json', JSON.stringify(dbTasksBefore, null, 2));
    
    // Step 4: Select a Success Factor task to toggle
    const taskToToggle = successFactorTasks[0];
    
    console.log('\nSelected task to toggle:');
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Text: ${taskToToggle.text}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Source ID: ${taskToToggle.sourceId || 'N/A'}`);
    console.log(`Current completion state: ${taskToToggle.completed}`);
    
    // Find this task in the database
    const dbTaskToToggle = dbTasksBefore.find(t => t.id === taskToToggle.id);
    
    if (dbTaskToToggle) {
      console.log('\nTask in database before toggle:');
      console.log(`ID: ${dbTaskToToggle.id}`);
      console.log(`Source ID: ${dbTaskToToggle.source_id || 'N/A'}`);
      console.log(`Origin: ${dbTaskToToggle.origin}`);
      console.log(`Completion state: ${dbTaskToToggle.completed}`);
    } else {
      console.log(`\nWARNING: Task ${taskToToggle.id} not found in database!`);
    }
    
    // Step 5: Toggle task via API
    const newCompletionState = !taskToToggle.completed;
    console.log(`\nStep 3: Toggling task to ${newCompletionState}...`);
    
    const toggleResponse = await apiRequest(
      'PUT', 
      `/api/projects/${TEST_PROJECT_ID}/tasks/${taskToToggle.id}`,
      { completed: newCompletionState }
    );
    
    console.log(`Toggle API Response Status: ${toggleResponse.status}`);
    console.log('Toggle API Response Data:', toggleResponse.data);
    
    // Step 6: Get database state after toggle
    console.log('\nStep 4: Getting database state after toggle...');
    const dbTasksAfter = await queryTasksFromDb(TEST_PROJECT_ID);
    
    // Debug: Save database state after toggle
    fs.writeFileSync('db-tasks-after.json', JSON.stringify(dbTasksAfter, null, 2));
    
    // Find the toggled task in the database
    const dbToggledTask = dbTasksAfter.find(t => t.id === taskToToggle.id);
    
    if (dbToggledTask) {
      console.log('\nTask in database after toggle:');
      console.log(`ID: ${dbToggledTask.id}`);
      console.log(`Source ID: ${dbToggledTask.source_id || 'N/A'}`);
      console.log(`Origin: ${dbToggledTask.origin}`);
      console.log(`Completion state: ${dbToggledTask.completed}`);
      
      // Check if toggle was successful in the database
      const dbToggleSuccessful = dbToggledTask.completed === newCompletionState;
      
      if (dbToggleSuccessful) {
        console.log('\n✅ SUCCESS: Task toggle persisted to database');
      } else {
        console.log('\n❌ FAILURE: Task toggle not persisted to database');
        console.log(`Expected: ${newCompletionState}, Actual: ${dbToggledTask.completed}`);
      }
    } else {
      console.log(`\n❌ ERROR: Task ${taskToToggle.id} not found in database after toggle!`);
    }
    
    // Step 7: Get tasks from API again
    console.log('\nStep 5: Getting tasks from API after toggle...');
    const tasksAfterResponse = await apiRequest('GET', `/api/projects/${TEST_PROJECT_ID}/tasks`);
    
    if (tasksAfterResponse.status !== 200) {
      console.error(`API Error: ${tasksAfterResponse.status}`);
      console.error(tasksAfterResponse.data);
      return;
    }
    
    const tasksAfter = tasksAfterResponse.data;
    
    // Find the toggled task in the API response
    const apiToggledTask = tasksAfter.find(t => t.id === taskToToggle.id);
    
    if (apiToggledTask) {
      console.log('\nTask in API response after toggle:');
      console.log(`ID: ${apiToggledTask.id}`);
      console.log(`Text: ${apiToggledTask.text}`);
      console.log(`Origin: ${apiToggledTask.origin}`);
      console.log(`Source ID: ${apiToggledTask.sourceId || 'N/A'}`);
      console.log(`Completion state: ${apiToggledTask.completed}`);
      
      // Check if toggle was successful in the API response
      const apiToggleSuccessful = apiToggledTask.completed === newCompletionState;
      
      if (apiToggleSuccessful) {
        console.log('\n✅ SUCCESS: Task toggle reflected in API response');
      } else {
        console.log('\n❌ FAILURE: Task toggle not reflected in API response');
        console.log(`Expected: ${newCompletionState}, Actual: ${apiToggledTask.completed}`);
      }
    } else {
      console.log(`\n❌ ERROR: Task ${taskToToggle.id} not found in API response after toggle!`);
    }
    
    // Step 8: Final comparison
    console.log('\n=== COMPARISON SUMMARY ===');
    console.log(`Original API State: ${taskToToggle.completed}`);
    console.log(`Original DB State: ${dbTaskToToggle ? dbTaskToToggle.completed : 'Task not in DB'}`);
    console.log(`Target State: ${newCompletionState}`);
    console.log(`Final API State: ${apiToggledTask ? apiToggledTask.completed : 'Task not in API response'}`);
    console.log(`Final DB State: ${dbToggledTask ? dbToggledTask.completed : 'Task not in DB'}`);
    
    // Identify the failure point
    let failurePoint = null;
    
    if (toggleResponse.status !== 200) {
      failurePoint = 'API_ERROR';
    } else if (!dbTaskToToggle) {
      failurePoint = 'TASK_MISSING_BEFORE';
    } else if (!dbToggledTask) {
      failurePoint = 'TASK_DELETED';
    } else if (dbToggledTask.completed !== newCompletionState) {
      failurePoint = 'DB_UPDATE_FAILED';
    } else if (!apiToggledTask) {
      failurePoint = 'API_RESPONSE_MISSING';
    } else if (apiToggledTask.completed !== newCompletionState) {
      failurePoint = 'API_STATE_INCORRECT';
    }
    
    if (failurePoint) {
      console.log(`\n❌ FAILURE POINT IDENTIFIED: ${failurePoint}`);
      
      // Root cause analysis
      console.log('\nDIAGNOSIS:');
      
      switch (failurePoint) {
        case 'API_ERROR':
          console.log('The API request to toggle the task failed.');
          console.log(`Status code: ${toggleResponse.status}`);
          console.log('Response:', toggleResponse.data);
          break;
          
        case 'TASK_MISSING_BEFORE':
          console.log('The task exists in the API but is missing from the database before toggle.');
          console.log('This suggests a synchronization issue or "phantom" task problem.');
          break;
          
        case 'TASK_DELETED':
          console.log('The task was deleted from the database during the toggle operation.');
          console.log('This could indicate a concurrency issue or incorrect database operation.');
          break;
          
        case 'DB_UPDATE_FAILED':
          console.log('The database update failed to change the task completion state.');
          console.log(`Expected: ${newCompletionState}, Actual: ${dbToggledTask.completed}`);
          console.log('This suggests an issue with the update query or transaction handling.');
          break;
          
        case 'API_RESPONSE_MISSING':
          console.log('The task is missing from the API response after toggle.');
          console.log('This suggests a caching issue or data mapping problem.');
          break;
          
        case 'API_STATE_INCORRECT':
          console.log('The API returned the wrong completion state for the task after toggle.');
          console.log(`Expected: ${newCompletionState}, Actual: ${apiToggledTask.completed}`);
          console.log('This suggests a disconnect between the database and API response.');
          break;
      }
    } else {
      console.log('\n✅ SUCCESS: The task toggle worked correctly end-to-end!');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
runTest();