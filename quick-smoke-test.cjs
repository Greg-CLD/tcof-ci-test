/**
 * Simple task persistence smoke test
 * This script:
 * 1. Creates a new task via API
 * 2. Verifies it persists by retrieving it from the API immediately
 */

const fetch = require('node-fetch');

// Configuration
const API_HOST = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const API_PROJECT_TASKS = `${API_HOST}/api/projects/${PROJECT_ID}/tasks`;

// Task creation data
const testTask = {
  text: `Smoke test task ${Date.now()}`,
  stage: "identification",
  origin: "custom",
  sourceId: null,
  priority: "high",
  notes: "Created by quick smoke test"
};

async function login() {
  const res = await fetch(`${API_HOST}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'greg@confluity.co.uk',
      password: 'password123'
    }),
    credentials: 'include'
  });
  
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${res.statusText}`);
  }
  
  const cookies = res.headers.get('set-cookie');
  return cookies;
}

async function createTask(cookie) {
  console.log(`Creating task: ${testTask.text}`);
  
  const res = await fetch(API_PROJECT_TASKS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify(testTask)
  });
  
  if (!res.ok) {
    throw new Error(`Task creation failed: ${res.status} ${res.statusText}`);
  }
  
  const newTask = await res.json();
  console.log('Task created successfully:', newTask);
  return newTask;
}

async function getTasks(cookie) {
  console.log('Getting tasks...');
  
  const res = await fetch(API_PROJECT_TASKS, {
    headers: {
      'Cookie': cookie
    }
  });
  
  if (!res.ok) {
    throw new Error(`Task retrieval failed: ${res.status} ${res.statusText}`);
  }
  
  const tasks = await res.json();
  console.log(`Retrieved ${tasks.length} tasks`);
  
  // Find our test task
  const foundTask = tasks.find(task => task.text === testTask.text);
  
  if (foundTask) {
    console.log('✓ SUCCESS: Test task found in database!', foundTask);
  } else {
    console.log('✗ FAILURE: Test task NOT found in database!');
  }
  
  return tasks;
}

async function runTest() {
  try {
    // Login to get session cookie
    const cookie = await login();
    console.log('Logged in successfully');
    
    // Create a test task
    const createdTask = await createTask(cookie);
    
    // Verify the task exists in database
    const tasks = await getTasks(cookie);
    
    // Print all tasks as JSON for verification
    console.log(JSON.stringify(tasks, null, 2));
    
    console.log('Test completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();