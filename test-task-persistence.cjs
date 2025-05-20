#!/usr/bin/env node
/**
 * Task Persistence Integration Test
 * 
 * This script tests the entire task lifecycle with UUID extraction:
 * 1. Creates a HTTP test client with cookie session support
 * 2. Logs in to get authenticated
 * 3. Creates a test task (with a compound ID if specified)
 * 4. Marks the task as complete
 * 5. Verifies the task can be retrieved with the updated completion state
 */

const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  host: 'localhost',
  port: 5000,
  projectId: 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8',
  auth: {
    username: 'greg@confluity.co.uk',
    password: 'password'
  },
  // Use a compound ID format to test the UUID extraction
  useCompoundId: true
};

// Storage for cookies and test data
let cookies = '';
let testTask = null;

/**
 * Make an HTTP request with cookie support
 */
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Add cookies for authenticated requests
    if (cookies) {
      options.headers.Cookie = cookies;
    }
    
    // Choose http or https based on config
    const client = CONFIG.port === 443 ? https : http;
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      // Collect response data
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      // Process response when complete
      res.on('end', () => {
        // Save cookies from response
        if (res.headers['set-cookie']) {
          cookies = res.headers['set-cookie'].join('; ');
        }
        
        // Parse JSON response if possible
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
        } catch (e) {
          parsedData = responseData;
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsedData
        });
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      reject(error);
    });
    
    // Send request data if provided
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Login to get authenticated
 */
async function login() {
  console.log('Logging in...');
  const response = await request('POST', '/api/login', CONFIG.auth);
  
  if (response.statusCode !== 200) {
    throw new Error(`Login failed: ${response.statusCode} ${JSON.stringify(response.data)}`);
  }
  
  console.log('Login successful!');
  return true;
}

/**
 * Create a test task
 */
async function createTask() {
  // Generate a UUID with a compound suffix to test extraction
  const baseUuid = '3f197b9f-51f4-5c52-b05e-c035eeb92621';
  const taskId = CONFIG.useCompoundId ? `${baseUuid}-test-suffix` : baseUuid;
  
  const taskData = {
    text: `Test Task - ${new Date().toISOString()}`,
    stage: 'identification',
    origin: 'success-factor',
    sourceId: taskId,
    completed: false,
    notes: 'Created by persistence test script',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0], // today's date
    owner: 'Test User',
    status: 'To Do'
  };
  
  console.log(`Creating task with ${CONFIG.useCompoundId ? 'compound' : 'simple'} ID: ${taskData.sourceId}`);
  
  const response = await request(
    'POST', 
    `/api/projects/${CONFIG.projectId}/tasks`,
    taskData
  );
  
  if (response.statusCode !== 201 && response.statusCode !== 200) {
    throw new Error(`Failed to create task: ${response.statusCode} ${JSON.stringify(response.data)}`);
  }
  
  testTask = response.data;
  console.log(`Task created successfully with ID: ${testTask.id}`);
  return testTask;
}

/**
 * Update a task's completion status
 */
async function toggleTaskCompletion(task, newStatus = true) {
  console.log(`Updating task ${task.id} completion to: ${newStatus}`);
  
  const response = await request(
    'PUT',
    `/api/projects/${CONFIG.projectId}/tasks/${task.id}`,
    { completed: newStatus }
  );
  
  if (response.statusCode !== 200) {
    throw new Error(`Failed to update task: ${response.statusCode} ${JSON.stringify(response.data)}`);
  }
  
  console.log(`Task updated successfully!`);
  return response.data;
}

/**
 * Verify task persistence by retrieving it again
 */
async function verifyTaskPersistence(task, expectedStatus) {
  console.log(`Verifying task persistence...`);
  
  const response = await request(
    'GET',
    `/api/projects/${CONFIG.projectId}/tasks`
  );
  
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get tasks: ${response.statusCode} ${JSON.stringify(response.data)}`);
  }
  
  const tasks = response.data;
  const foundTask = tasks.find(t => t.id === task.id);
  
  if (!foundTask) {
    throw new Error(`Task with ID ${task.id} not found`);
  }
  
  if (foundTask.completed !== expectedStatus) {
    throw new Error(`Task completion status mismatch: expected ${expectedStatus}, got ${foundTask.completed}`);
  }
  
  console.log(`Task persistence verified! Status is ${foundTask.completed ? 'COMPLETED' : 'NOT COMPLETED'} as expected`);
  return foundTask;
}

/**
 * Clean up test task
 */
async function cleanup(task) {
  if (!task) return;
  
  console.log(`Cleaning up test task: ${task.id}`);
  
  const response = await request(
    'DELETE',
    `/api/projects/${CONFIG.projectId}/tasks/${task.id}`
  );
  
  if (response.statusCode !== 200 && response.statusCode !== 204) {
    console.warn(`Warning: Failed to delete test task: ${response.statusCode}`);
  } else {
    console.log(`Test task deleted successfully`);
  }
}

/**
 * Run the complete test
 */
async function runTest() {
  console.log('=== TASK PERSISTENCE TEST WITH UUID EXTRACTION ===');
  console.log(`Testing with ${CONFIG.useCompoundId ? 'compound' : 'simple'} task IDs\n`);
  
  try {
    // Step 1: Login
    await login();
    
    // Step 2: Create a test task
    const task = await createTask();
    
    // Step 3: Update task completion status
    const updatedTask = await toggleTaskCompletion(task, true);
    
    // Step 4: Verify persistence
    const verifiedTask = await verifyTaskPersistence(task, true);
    
    // Clean up
    await cleanup(task);
    
    console.log('\n✅ TEST PASSED! Task update with UUID extraction is working correctly.');
    return {
      success: true,
      task: {
        id: task.id,
        original_completion: task.completed,
        updated_completion: verifiedTask.completed
      }
    };
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error(error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runTest().then(result => {
  console.log('\nTest Result:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});