/**
 * Simple task update test with direct database connection
 * This script tests if the server can find a task by clean UUID
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const BASE_URL = 'http://localhost:5000';

// Helper to clean UUID
function cleanTaskId(taskId) {
  if (!taskId) return '';
  return taskId.split('-').slice(0, 5).join('-');
}

// Function to find a suitable task for testing
async function findTestTask() {
  console.log('Searching database for a task with a compound ID...');
  
  try {
    // Find tasks for our test project
    const res = await pool.query(
      'SELECT id, text, completed, origin, source_id FROM project_tasks WHERE project_id = $1 LIMIT 10',
      [PROJECT_ID]
    );
    
    if (res.rows.length === 0) {
      console.log('No tasks found for project.');
      return null;
    }
    
    console.log(`Found ${res.rows.length} tasks. Looking for one with compound ID...`);
    
    // Find a task with a compound ID (more than 5 segments)
    for (const task of res.rows) {
      if (task.id && task.id.split('-').length > 5) {
        console.log('Found task with compound ID:', task);
        
        // Extract the clean UUID
        const cleanId = cleanTaskId(task.id);
        console.log(`Original ID: ${task.id}`);
        console.log(`Clean UUID: ${cleanId}`);
        
        return {
          taskId: task.id,
          cleanId,
          text: task.text,
          completed: task.completed
        };
      }
    }
    
    // If we don't find a compound ID, just use the first task
    const task = res.rows[0];
    console.log('No compound IDs found, using regular task:', task);
    
    return {
      taskId: task.id,
      cleanId: task.id, // For regular UUID, clean is same as original
      text: task.text,
      completed: task.completed
    };
  } catch (err) {
    console.error('Database error:', err);
    return null;
  }
}

// Login to get authenticated
async function login() {
  try {
    console.log('Logging in...');
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'password1'
      })
    });
    
    if (!res.ok) {
      throw new Error(`Login failed: ${res.status} ${res.statusText}`);
    }
    
    // Extract cookie for authentication
    const cookies = res.headers.get('set-cookie');
    console.log('Login successful, got cookies');
    return cookies;
  } catch (err) {
    console.error('Login error:', err);
    return null;
  }
}

// Test the update operation with clean UUID
async function testTaskUpdate(cookies, task) {
  if (!task) {
    console.log('No task available for testing.');
    return false;
  }
  
  try {
    // Create update payload - toggle the completion state
    const updateData = {
      completed: !task.completed
    };
    
    console.log(`Updating task with CLEAN UUID...
- Using clean UUID: ${task.cleanId}
- Original ID: ${task.taskId}
- Current completion state: ${task.completed}
- Setting to: ${!task.completed}
`);
    
    // Build the endpoint with the CLEAN UUID
    const endpoint = `${BASE_URL}/api/projects/${PROJECT_ID}/tasks/${task.cleanId}`;
    console.log(`PUT request to: ${endpoint}`);
    
    // Send the update request
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('Response status:', res.status, res.statusText);
    
    // Parse the response
    const resText = await res.text();
    let resData;
    try {
      resData = JSON.parse(resText);
      console.log('Response body:', resData);
    } catch (e) {
      console.log('Response (not JSON):', resText);
    }
    
    if (res.ok) {
      console.log('✅ SUCCESS: Task update with clean UUID worked!');
      return true;
    } else {
      console.log('❌ FAILED: Task update with clean UUID failed.');
      return false;
    }
  } catch (err) {
    console.error('Update error:', err);
    return false;
  }
}

// Verify the update was successful by checking the database
async function verifyUpdate(task) {
  try {
    console.log(`Verifying task update in database for task ID: ${task.taskId}`);
    
    const res = await pool.query(
      'SELECT id, completed FROM project_tasks WHERE id = $1',
      [task.taskId]
    );
    
    if (res.rows.length === 0) {
      console.log('❌ VERIFICATION FAILED: Task not found in database');
      return false;
    }
    
    const updatedTask = res.rows[0];
    console.log('Database state after update:', updatedTask);
    
    // Completion state should have toggled
    const expectedState = !task.completed;
    
    if (updatedTask.completed === expectedState) {
      console.log(`✅ VERIFICATION PASSED: Task completion state is now ${updatedTask.completed} as expected`);
      return true;
    } else {
      console.log(`❌ VERIFICATION FAILED: Task completion state is ${updatedTask.completed}, expected ${expectedState}`);
      return false;
    }
  } catch (err) {
    console.error('Verification error:', err);
    return false;
  }
}

// Main function
async function runTest() {
  console.log('====== CLEAN UUID TASK UPDATE TEST ======');
  
  try {
    // Find a task to test with
    const task = await findTestTask();
    if (!task) {
      console.log('No suitable task found for testing.');
      process.exit(1);
    }
    
    // Login to get authenticated
    const cookies = await login();
    if (!cookies) {
      console.log('Authentication failed, cannot proceed with test.');
      process.exit(1);
    }
    
    // Test the update operation with clean UUID
    const updateSuccess = await testTaskUpdate(cookies, task);
    
    // Verify the update in the database
    if (updateSuccess) {
      await verifyUpdate(task);
    }
    
    // Cleanup
    pool.end();
    
    console.log('====== TEST COMPLETE ======');
  } catch (err) {
    console.error('Test error:', err);
    pool.end();
    process.exit(1);
  }
}

// Run the test
runTest();