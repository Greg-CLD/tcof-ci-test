/**
 * Task Update Test Script (CommonJS version)
 * 
 * This script tests the task update functionality while using environment variables
 * for authentication credentials instead of hardcoded values.
 * 
 * Usage:
 * 1. Create config/test.env with TEST_USERNAME, TEST_PASSWORD, TEST_PROJECT_ID
 * 2. Run with: node test-task-update.cjs
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables from config/test.env if available
function loadEnvConfig() {
  const configPath = path.join(__dirname, 'config', 'test.env');
  const config = {
    TEST_USERNAME: process.env.TEST_USERNAME,
    TEST_PASSWORD: process.env.TEST_PASSWORD,
    TEST_PROJECT_ID: process.env.TEST_PROJECT_ID,
    TEST_API_URL: process.env.TEST_API_URL || 'http://0.0.0.0:5000'
  };

  if (fs.existsSync(configPath)) {
    console.log('Loading test configuration from config/test.env');
    const envContent = fs.readFileSync(configPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      if (!line || line.startsWith('#')) return;
      
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        config[key] = value;
      }
    });
  } else {
    console.warn('Config file not found. Using environment variables or defaults.');
  }

  // Validate required config
  const requiredKeys = ['TEST_USERNAME', 'TEST_PASSWORD'];
  const missingKeys = requiredKeys.filter(key => !config[key]);
  
  if (missingKeys.length > 0) {
    console.error(`ERROR: Missing required test configuration: ${missingKeys.join(', ')}`);
    console.error('Please set these in config/test.env or as environment variables.');
    process.exit(1);
  }

  return config;
}

// Global configuration
const config = loadEnvConfig();
const CREDENTIALS = {
  username: config.TEST_USERNAME,
  password: config.TEST_PASSWORD
};
const API_URL = config.TEST_API_URL;
const PROJECT_ID = config.TEST_PROJECT_ID;

// Global state
let authCookie = '';

// Utility to log section headers
function logHeader(text) {
  console.log('\n' + '='.repeat(80));
  console.log(`${text.toUpperCase()}`);
  console.log('='.repeat(80));
}

// Clean a task ID (extract UUID part from compound ID)
function cleanTaskId(taskId) {
  if (!taskId || typeof taskId !== 'string') return taskId;
  
  // Extract the UUID part (first 5 segments) from a compound ID
  const segments = taskId.split('-');
  if (segments.length >= 5) {
    return segments.slice(0, 5).join('-');
  }
  
  return taskId;
}

// Helper function for API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authCookie ? { 'Cookie': authCookie } : {})
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`${method} ${endpoint}`);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (response.headers.has('set-cookie')) {
      authCookie = response.headers.get('set-cookie');
    }
    
    const data = response.status !== 204 ? await response.json() : null;
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    return { status: 0, error };
  }
}

// Login to get authentication cookie
async function login() {
  logHeader('LOGGING IN');
  
  console.log(`Using credentials for user: ${CREDENTIALS.username}`);
  const { status, data } = await apiRequest('POST', '/api/login', CREDENTIALS);
  
  if (status === 200) {
    console.log('Login successful');
    return true;
  } else {
    console.error(`Login failed: ${data?.message || 'Unknown error'}`);
    return false;
  }
}

// Create a test task
async function createTestTask() {
  logHeader('CREATING TEST TASK');
  
  const task = {
    text: `Test task for UUID lookup - ${new Date().toISOString()}`,
    completed: false,
    origin: 'test',
    stage: 'test'
  };
  
  const { status, data } = await apiRequest(
    'POST',
    `/api/projects/${PROJECT_ID}/tasks`,
    task
  );
  
  if (status === 201 && data) {
    console.log('Test task created successfully:');
    console.log(`Task ID: ${data.id}`);
    console.log(`Clean UUID: ${cleanTaskId(data.id)}`);
    return data;
  } else {
    console.error(`Failed to create test task: ${data?.message || 'Unknown error'}`);
    return null;
  }
}

// Update a task using clean UUID
async function updateTaskWithCleanUuid(task) {
  logHeader('UPDATING TASK WITH CLEAN UUID');
  
  const cleanId = cleanTaskId(task.id);
  console.log(`Original task ID: ${task.id}`);
  console.log(`Clean UUID for update: ${cleanId}`);
  
  const update = {
    completed: !task.completed
  };
  
  const { status, data } = await apiRequest(
    'PUT',
    `/api/projects/${PROJECT_ID}/tasks/${cleanId}`,
    update
  );
  
  if (status === 200 && data) {
    console.log('Task updated successfully with clean UUID!');
    console.log(`New completion state: ${data.completed}`);
    return data;
  } else {
    console.error(`Failed to update task: ${data?.message || 'Unknown error'}`);
    return null;
  }
}

// Verify the task update persisted
async function verifyTaskPersistence(taskId) {
  logHeader('VERIFYING TASK PERSISTENCE');
  
  const { status, data } = await apiRequest(
    'GET',
    `/api/projects/${PROJECT_ID}/tasks`
  );
  
  if (status === 200 && data && data.tasks) {
    const task = data.tasks.find(t => t.id === taskId);
    
    if (task) {
      console.log('Task found in database:');
      console.log(`Task ID: ${task.id}`);
      console.log(`Task text: ${task.text}`);
      console.log(`Task completed: ${task.completed}`);
      return task;
    } else {
      console.error('Task not found in database after update');
      return null;
    }
  } else {
    console.error(`Failed to fetch tasks: ${data?.message || 'Unknown error'}`);
    return null;
  }
}

// Clean up test task
async function cleanupTestTask(taskId) {
  logHeader('CLEANING UP TEST TASK');
  
  const { status } = await apiRequest(
    'DELETE',
    `/api/projects/${PROJECT_ID}/tasks/${taskId}`
  );
  
  if (status === 204 || status === 200) {
    console.log(`Test task ${taskId} deleted successfully`);
    return true;
  } else {
    console.error(`Failed to delete test task`);
    return false;
  }
}

// Main test function
async function runTest() {
  console.log(`Starting task update test with UUID lookup improvement verification`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Project ID: ${PROJECT_ID}`);
  
  // Step 1: Login
  if (!await login()) {
    console.error('Login failed, aborting test');
    return;
  }
  
  // Step 2: Create a test task
  const task = await createTestTask();
  if (!task) {
    console.error('Failed to create test task, aborting test');
    return;
  }
  
  // Step 3: Update the task using clean UUID
  const updatedTask = await updateTaskWithCleanUuid(task);
  if (!updatedTask) {
    console.error('Failed to update task, aborting test');
    await cleanupTestTask(task.id);
    return;
  }
  
  // Step 4: Verify task persistence
  const verifiedTask = await verifyTaskPersistence(task.id);
  if (!verifiedTask) {
    console.error('Failed to verify task persistence');
    await cleanupTestTask(task.id);
    return;
  }
  
  // Step 5: Clean up
  await cleanupTestTask(task.id);
  
  // Test result
  if (verifiedTask.completed === updatedTask.completed) {
    console.log('\n✅ TEST PASSED! Task was successfully updated using clean UUID.');
    console.log('The UUID lookup improvement is working correctly!');
  } else {
    console.log('\n❌ TEST FAILED! Task update was not correctly persisted.');
  }
}

// Run the test
runTest().catch(error => {
  console.error('Test failed with error:', error);
});