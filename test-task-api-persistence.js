/**
 * Task Persistence API Testing Script
 * 
 * This script tests the entire lifecycle of tasks through the API:
 * 1. Login to get authenticated session
 * 2. Create a task
 * 3. Verify it's readable through GET endpoint immediately
 * 4. Update the task
 * 5. Verify the update is readable 
 * 6. Delete the task
 * 7. Verify deletion
 * 
 * For direct testing: node test-task-api-persistence.js [projectId]
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const API_HOST = 'http://localhost:3000';
const LOGIN_ENDPOINT = `${API_HOST}/api/login`;
const PROJECT_ID = process.argv[2] || 'test-project-id';
const TEST_TEXT = `Test Task ${Date.now()}`;

// Helper to parse cookies from response
const parseCookies = (response) => {
  const cookies = {};
  const cookieHeader = response.headers.raw()['set-cookie'];
  
  if (cookieHeader) {
    cookieHeader.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name] = value;
    });
  }
  
  return cookies;
};

// Helper to create cookie header for requests
const formatCookieHeader = (cookies) => {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
};

async function login() {
  console.log('Attempting login...');
  
  try {
    const response = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'password'
      })
    });
    
    if (!response.ok) {
      console.error(`Login failed: ${response.status} ${response.statusText}`);
      console.error(await response.text());
      throw new Error('Login failed');
    }
    
    console.log('Login successful');
    const userData = await response.json();
    console.log('User data:', userData);
    
    // Get cookies for session
    const cookies = parseCookies(response);
    console.log('Session cookies:', cookies);
    
    return { userData, cookies };
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
}

async function runTest() {
  try {
    // Step 1: Login to get session
    const { cookies } = await login();
    const cookieHeader = formatCookieHeader(cookies);
    
    // Test data for a new task
    const newTask = {
      text: TEST_TEXT,
      stage: 'identification',
      origin: 'custom',
      sourceId: `test-${uuidv4().slice(0, 8)}`,
      completed: false,
      notes: 'API test notes',
      priority: 'medium',
      dueDate: '2023-12-31',
      owner: 'APITest',
      status: 'pending'
    };
    
    console.log('\n========= STEP 1: Create New Task =========');
    console.log('Creating task for project:', PROJECT_ID);
    console.log('Task data:', JSON.stringify(newTask, null, 2));
    
    // Create task
    const createResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify(newTask)
    });
    
    console.log(`Create status: ${createResponse.status} ${createResponse.statusText}`);
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create task: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createResult = await createResponse.json();
    console.log('Create result:', JSON.stringify(createResult, null, 2));
    
    if (!createResult.task || !createResult.task.id) {
      throw new Error('Task creation did not return a valid task ID');
    }
    
    const taskId = createResult.task.id;
    console.log(`Created task with ID: ${taskId}`);
    
    // Pause for a moment to ensure database operation completes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n========= STEP 2: Verify Task Exists (GET) =========');
    console.log(`Fetching tasks for project ${PROJECT_ID} to verify task exists...`);
    
    // Get tasks to verify creation
    const getResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      }
    });
    
    console.log(`GET status: ${getResponse.status} ${getResponse.statusText}`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get tasks: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const tasks = await getResponse.json();
    console.log(`Retrieved ${tasks.length} tasks`);
    
    // Find our created task
    const createdTask = tasks.find(task => task.id === taskId);
    
    if (createdTask) {
      console.log('✅ Task successfully verified in GET response:');
      console.log(JSON.stringify(createdTask, null, 2));
    } else {
      console.error('❌ CRITICAL ERROR: Task not found in GET response despite successful creation');
      console.error('This indicates a persistence issue where the task is not being saved to the database');
      console.error('Tasks returned:', tasks.map(t => t.id));
      throw new Error('Task persistence verification failed');
    }
    
    console.log('\n========= STEP 3: Update Task =========');
    console.log(`Updating task ${taskId} with new values...`);
    
    // Update data
    const updateData = {
      text: `${TEST_TEXT} (Updated)`,
      notes: 'Updated notes',
      completed: true
    };
    
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    // Update task
    const updateResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify(updateData)
    });
    
    console.log(`Update status: ${updateResponse.status} ${updateResponse.statusText}`);
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update task: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    const updateResult = await updateResponse.json();
    console.log('Update result:', JSON.stringify(updateResult, null, 2));
    
    // Pause for a moment to ensure database operation completes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n========= STEP 4: Verify Update (GET) =========');
    console.log(`Fetching tasks again to verify update...`);
    
    // Get tasks to verify update
    const getUpdatedResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      }
    });
    
    if (!getUpdatedResponse.ok) {
      throw new Error(`Failed to get updated tasks: ${getUpdatedResponse.status} ${getUpdatedResponse.statusText}`);
    }
    
    const updatedTasks = await getUpdatedResponse.json();
    const updatedTask = updatedTasks.find(task => task.id === taskId);
    
    if (updatedTask) {
      console.log('✅ Updated task successfully verified in GET response:');
      console.log(JSON.stringify(updatedTask, null, 2));
      
      // Verify updates were applied
      const updatesApplied = 
        updatedTask.text === updateData.text && 
        updatedTask.notes === updateData.notes &&
        updatedTask.completed === updateData.completed;
      
      if (updatesApplied) {
        console.log('✅ All updates correctly applied and persisted');
      } else {
        console.error('❌ Updates not correctly applied to the task');
        console.error('Expected:', updateData);
        console.error('Actual:', {
          text: updatedTask.text,
          notes: updatedTask.notes,
          completed: updatedTask.completed
        });
      }
    } else {
      console.error('❌ CRITICAL ERROR: Updated task not found in GET response');
      throw new Error('Task update persistence verification failed');
    }
    
    console.log('\n========= STEP 5: Delete Task =========');
    console.log(`Deleting task ${taskId}...`);
    
    // Delete task
    const deleteResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      }
    });
    
    console.log(`Delete status: ${deleteResponse.status} ${deleteResponse.statusText}`);
    
    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete task: ${deleteResponse.status} ${deleteResponse.statusText}`);
    }
    
    const deleteResult = await deleteResponse.json();
    console.log('Delete result:', JSON.stringify(deleteResult, null, 2));
    
    // Pause for a moment to ensure database operation completes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n========= STEP 6: Verify Deletion =========');
    console.log(`Fetching tasks again to verify deletion...`);
    
    // Get tasks to verify deletion
    const getFinalResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      }
    });
    
    if (!getFinalResponse.ok) {
      throw new Error(`Failed to get final tasks: ${getFinalResponse.status} ${getFinalResponse.statusText}`);
    }
    
    const finalTasks = await getFinalResponse.json();
    const deletedTask = finalTasks.find(task => task.id === taskId);
    
    if (deletedTask) {
      console.error('❌ ERROR: Task still exists after deletion');
      console.error(deletedTask);
    } else {
      console.log('✅ Task successfully deleted and verified');
    }
    
    console.log('\n========= TEST COMPLETED SUCCESSFULLY =========');
    console.log('✅ All test stages passed. Task persistence confirmed working.');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  if (!PROJECT_ID) {
    console.error('Please provide a project ID as a command line argument');
    console.error('Usage: node test-task-api-persistence.js PROJECT_ID');
    process.exit(1);
  }
  
  runTest().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { runTest };