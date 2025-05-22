/**
 * Direct Success Factor Task Persistence Test
 * 
 * This script directly tests the API endpoint for updating Success Factor tasks
 * to verify our fixes for task metadata preservation.
 */
import fetch from 'node-fetch';
import pg from 'pg';
const { Client } = pg;

// Config
const API_BASE = 'http://localhost:3000';
const DEBUG = true;

// Test a specific project and task
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TEST_TASK_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

// Helper for authenticated API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Override': 'true' // For testing
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  if (DEBUG) console.log(`API ${method} request to ${endpoint}`);
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    
    if (DEBUG) {
      console.log(`Response status: ${response.status}`);
      console.log(`Content-Type: ${contentType}`);
    }
    
    // Verify we got a JSON response
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`ERROR: Expected JSON response, got ${contentType}`);
      const text = await response.text();
      console.error(`Response body: ${text.substring(0, 500)}`);
      throw new Error(`Invalid response content type: ${contentType}`);
    }
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`API request error: ${error.message}`);
    throw error;
  }
}

// Get task from database directly
async function getTaskFromDb(projectId, taskId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Query for task by its ID
    const result = await client.query(
      'SELECT * FROM project_tasks WHERE project_id = $1 AND (id = $2 OR source_id = $2)',
      [projectId, taskId]
    );
    
    if (result.rows.length === 0) {
      console.log(`No task found with ID ${taskId} in project ${projectId}`);
      return null;
    }
    
    console.log(`Found task in database: ${JSON.stringify(result.rows[0], null, 2)}`);
    return result.rows[0];
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Main test function
async function testSuccessFactorTaskPersistence() {
  console.log('===== Testing Success Factor Task Persistence =====');
  
  try {
    // Step 1: Get the current task to verify starting state
    console.log('\n--- Step 1: Get current task state ---');
    const { status, data: tasksData } = await apiRequest(
      'GET', 
      `/api/projects/${TEST_PROJECT_ID}/tasks`
    );
    
    if (status !== 200) {
      console.error(`Failed to get tasks: Status ${status}`);
      console.error(tasksData);
      return;
    }
    
    // Find the specific Success Factor task we want to test
    const sfTask = tasksData.find(task => 
      task.sourceId === TEST_TASK_ID || task.id === TEST_TASK_ID
    );
    
    if (!sfTask) {
      console.error(`Test task not found with ID ${TEST_TASK_ID}`);
      return;
    }
    
    console.log('Found Success Factor task:');
    console.log(JSON.stringify(sfTask, null, 2));
    
    // Toggle the task's completed state
    const newCompletedState = !sfTask.completed;
    console.log(`\n--- Step 2: Toggle completion state to ${newCompletedState} ---`);
    
    // Step 2: Update the task
    const updateResult = await apiRequest(
      'PUT',
      `/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`,
      { completed: newCompletedState }
    );
    
    if (updateResult.status !== 200) {
      console.error(`Failed to update task: Status ${updateResult.status}`);
      console.error(updateResult.data);
      return;
    }
    
    console.log('Task update API response:');
    console.log(JSON.stringify(updateResult.data, null, 2));
    
    // Step 3: Verify the task was updated with metadata preserved
    console.log('\n--- Step 3: Verify task update in API ---');
    const verifyResult = await apiRequest(
      'GET',
      `/api/projects/${TEST_PROJECT_ID}/tasks`
    );
    
    if (verifyResult.status !== 200) {
      console.error(`Failed to verify task state: Status ${verifyResult.status}`);
      console.error(verifyResult.data);
      return;
    }
    
    // Find the task again
    const updatedSfTask = verifyResult.data.find(task => 
      task.sourceId === TEST_TASK_ID || task.id === TEST_TASK_ID
    );
    
    if (!updatedSfTask) {
      console.error(`Updated task not found with ID ${TEST_TASK_ID}`);
      return;
    }
    
    console.log('Updated task from API:');
    console.log(JSON.stringify(updatedSfTask, null, 2));
    
    // Step 4: Verify directly in the database
    console.log('\n--- Step 4: Verify task directly in database ---');
    const dbTask = await getTaskFromDb(TEST_PROJECT_ID, TEST_TASK_ID);
    
    // Final validation
    console.log('\n--- Results Summary ---');
    const validationResults = {
      'Completion State Changed': updatedSfTask.completed === newCompletedState,
      'Origin Preserved': updatedSfTask.origin === sfTask.origin,
      'SourceId Preserved': updatedSfTask.sourceId === sfTask.sourceId,
      'Database Matches API': dbTask && dbTask.completed === newCompletedState
    };
    
    console.table(validationResults);
    
    const testPassed = Object.values(validationResults).every(result => result === true);
    
    if (testPassed) {
      console.log('\n✅ SUCCESS: Task persistence test passed! All metadata preserved.');
    } else {
      console.log('\n❌ FAILURE: Task persistence test failed. See validation results above.');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testSuccessFactorTaskPersistence();