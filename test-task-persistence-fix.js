/**
 * Script to test task persistence after applying schema fixes
 * This script will:
 * 1. First login to get an authenticated session
 * 2. Create a test task
 * 3. Verify the task exists in the database
 * 4. Fetch the task via API to confirm it's retrievable
 * 5. Update the task
 * 6. Verify update worked via both direct DB and API
 */
import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Create DB client
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Target project ID
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Session cookie storage
let cookies = '';

async function login() {
  console.log('Logging in...');
  try {
    const loginRes = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test_user',
        password: 'password123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    
    // Save cookies for subsequent requests
    cookies = loginRes.headers.get('set-cookie') || '';
    console.log('Login successful');
    
    // Verify we're logged in
    const userRes = await fetch('http://localhost:3000/api/auth/user', {
      headers: { 
        Cookie: cookies 
      }
    });
    
    if (userRes.ok) {
      const userData = await userRes.json();
      console.log(`Authenticated as user: ${userData.username}`);
    } else {
      console.warn('Could not verify user authentication');
    }
    
    return true;
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

async function createTask() {
  console.log(`Creating test task in project ${PROJECT_ID}...`);
  const taskText = `Persistence Test Task ${new Date().toISOString()}`;
  
  try {
    const createRes = await fetch(`http://localhost:3000/api/projects/${PROJECT_ID}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies
      },
      body: JSON.stringify({
        text: taskText,
        stage: 'identification',
        origin: 'custom',
        sourceId: `test-${uuidv4().slice(0, 8)}`,
        priority: 'medium',
        status: 'To Do'
      })
    });
    
    if (!createRes.ok) {
      throw new Error(`Task creation failed with status ${createRes.status}`);
    }
    
    const result = await createRes.json();
    console.log(`Task created with ID: ${result.task.id}`);
    
    // Check database directly
    await verifyTaskInDb(result.task.id);
    
    return result.task;
  } catch (error) {
    console.error('Task creation error:', error.message);
    throw error;
  }
}

async function verifyTaskInDb(taskId) {
  console.log(`Verifying task ${taskId} in database...`);
  
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM project_tasks WHERE id = $1',
        [taskId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Task ${taskId} not found in database!`);
      }
      
      console.log('Database verification successful. Task found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database verification error:', error.message);
    throw error;
  }
}

async function verifyTaskWithApi(taskId) {
  console.log(`Verifying task ${taskId} via API...`);
  
  try {
    const res = await fetch(`http://localhost:3000/api/projects/${PROJECT_ID}/tasks`, {
      headers: {
        Cookie: cookies
      }
    });
    
    if (!res.ok) {
      throw new Error(`API verification failed with status ${res.status}`);
    }
    
    const tasks = await res.json();
    const foundTask = tasks.find(task => task.id === taskId);
    
    if (!foundTask) {
      throw new Error(`Task ${taskId} not found in API response!`);
    }
    
    console.log('API verification successful. Task found:');
    console.log(JSON.stringify(foundTask, null, 2));
    
    return foundTask;
  } catch (error) {
    console.error('API verification error:', error.message);
    throw error;
  }
}

async function updateTask(task) {
  console.log(`Updating task ${task.id}...`);
  const updatedText = `${task.text} [UPDATED]`;
  
  try {
    const updateRes = await fetch(`http://localhost:3000/api/projects/${PROJECT_ID}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies
      },
      body: JSON.stringify({
        text: updatedText,
        status: 'In Progress'
      })
    });
    
    if (!updateRes.ok) {
      throw new Error(`Task update failed with status ${updateRes.status}`);
    }
    
    const result = await updateRes.json();
    console.log(`Task updated successfully.`);
    
    // Verify update in database
    const dbTask = await verifyTaskInDb(task.id);
    if (dbTask.text !== updatedText) {
      throw new Error(`Update verification failed! Expected text "${updatedText}" but found "${dbTask.text}"`);
    }
    
    // Verify update via API
    const apiTask = await verifyTaskWithApi(task.id);
    if (apiTask.text !== updatedText) {
      throw new Error(`API update verification failed! Expected text "${updatedText}" but found "${apiTask.text}"`);
    }
    
    console.log('Task update verification successful!');
    return apiTask;
  } catch (error) {
    console.error('Task update error:', error.message);
    throw error;
  }
}

async function deleteTask(taskId) {
  console.log(`Deleting task ${taskId}...`);
  
  try {
    const deleteRes = await fetch(`http://localhost:3000/api/projects/${PROJECT_ID}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookies
      }
    });
    
    if (!deleteRes.ok) {
      throw new Error(`Task deletion failed with status ${deleteRes.status}`);
    }
    
    console.log('Task deleted successfully.');
    
    // Verify deletion
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM project_tasks WHERE id = $1',
        [taskId]
      );
      
      if (result.rows.length > 0) {
        throw new Error(`Task ${taskId} still exists in database after deletion!`);
      }
      
      console.log('Deletion verification successful. Task no longer exists in database.');
    } finally {
      client.release();
    }
    
    return true;
  } catch (error) {
    console.error('Task deletion error:', error.message);
    throw error;
  }
}

async function runTest() {
  console.log('=== Starting Task Persistence Test ===');
  
  try {
    // Step 1: Login
    await login();
    
    // Step 2: Create a task
    const task = await createTask();
    
    // Step 3: Update the task
    const updatedTask = await updateTask(task);
    
    // Step 4: Delete the task (cleanup)
    await deleteTask(updatedTask.id);
    
    console.log('=== Task Persistence Test PASSED ===');
  } catch (error) {
    console.error('=== Task Persistence Test FAILED ===');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

// Run the test
runTest();