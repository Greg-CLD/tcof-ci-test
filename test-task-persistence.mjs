#!/usr/bin/env node
/**
 * Checklist Task Persistence Test Script
 * 
 * Usage:
 *   node test-task-persistence.mjs <PROJECT_UUID>
 * 
 * Example:
 *   node test-task-persistence.mjs bc55c1a2-0cdf-4108-aa9e-44b44baea3b8
 * 
 * Description:
 *   This script tests task persistence across all four project stages.
 *   It creates one task per stage, verifies they're properly saved,
 *   and ensures all IDs are valid UUIDs.
 */

import { v4 as uuidv4, validate as isValidUuid } from 'uuid';

// Constants and configuration
const API_BASE_URL = 'http://localhost:5000/api';
const STAGES = ['identification', 'definition', 'delivery', 'closure'];
const ORIGIN_TYPES = ['custom', 'heuristic', 'factor', 'policy', 'framework'];

// Test credentials - these should match an existing user in the system
const TEST_USERNAME = 'greg@confluity.co.uk'; 
const TEST_PASSWORD = 'password';

// Store authentication data
let authToken = null;

// Command line arguments
const projectId = process.argv[2];

// Validation
if (!projectId || !isValidUuid(projectId)) {
  console.error('Error: Please provide a valid project UUID as the first argument');
  console.error('Usage: node test-task-persistence.mjs <PROJECT_UUID>');
  process.exit(1);
}

/**
 * Login to get authenticated session
 */
async function login() {
  console.log('🔐 Authenticating...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        password: TEST_PASSWORD
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Login failed: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText || '<empty>');
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log('✅ Authentication successful');
    
    return userData;
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    throw error;
  }
}

/**
 * Fetch all tasks for the project
 */
async function fetchTasks() {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText || '<empty>');
      throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

/**
 * Create a test task for the given stage
 */
async function createTask(stage) {
  try {
    // Generate a random origin type
    const origin = ORIGIN_TYPES[Math.floor(Math.random() * ORIGIN_TYPES.length)];
    
    // Create a unique task with timestamp
    const timestamp = new Date().toISOString();
    const taskId = uuidv4();
    const sourceId = `test-${uuidv4().slice(0, 8)}`;
    
    const taskData = {
      id: taskId,
      projectId,
      text: `Persistence test task - ${stage} (${timestamp})`,
      stage,
      origin,
      sourceId,
      completed: false,
      priority: "medium",
      status: "pending",
      notes: "Created by persistence test"
    };
    
    console.log(`Creating task for stage "${stage}" with ID ${taskId.substring(0, 8)}...`);
    
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Create task failed: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText || '<empty>');
      throw new Error(`Failed to create task for stage "${stage}": ${response.status} ${response.statusText}`);
    }
    
    const createdTask = await response.json();
    return createdTask;
  } catch (error) {
    console.error(`Error creating task for stage "${stage}":`, error);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log(`🧪 Running task persistence test for project: ${projectId}`);
  console.log('-------------------------------------------');

  const createdTasks = [];
  let initialTaskCount = 0;

  try {
    // First login to get authenticated session
    await login();
    
    // Get initial task count
    console.log('📋 Getting initial task count...');
    const initialTasks = await fetchTasks();
    initialTaskCount = initialTasks.length;
    console.log(`📊 Current task count: ${initialTaskCount}`);

    // Create a task for each stage
    console.log('\n📝 Creating test tasks for each stage...');
    for (const stage of STAGES) {
      const task = await createTask(stage);
      createdTasks.push(task);
      console.log(`✅ Created "${stage}" task: ${task.id.substring(0, 8)}...`);
    }

    // Verify tasks were persisted
    console.log('\n🔍 Verifying persistence...');
    const updatedTasks = await fetchTasks();
    const updatedTaskCount = updatedTasks.length;
    console.log(`📊 New task count: ${updatedTaskCount} (${updatedTaskCount - initialTaskCount} added)`);

    // Assert expected task count
    if (updatedTaskCount < initialTaskCount + STAGES.length) {
      throw new Error(`Expected at least ${initialTaskCount + STAGES.length} tasks, but found ${updatedTaskCount}`);
    }

    // Verify all created tasks are in the fetched list
    const createdIds = new Set(createdTasks.map(task => task.id));
    const fetchedIds = new Set(updatedTasks.map(task => task.id));
    
    const missingIds = [...createdIds].filter(id => !fetchedIds.has(id));
    if (missingIds.length > 0) {
      throw new Error(`Some created tasks are missing: ${missingIds.map(id => id.substring(0, 8)).join(', ')}`);
    }

    // Verify all tasks have valid UUIDs
    console.log('\n🔍 Verifying UUID format for all tasks...');
    const invalidUuidTasks = updatedTasks.filter(task => 
      !isValidUuid(task.id) || 
      !isValidUuid(task.projectId)
    );

    if (invalidUuidTasks.length > 0) {
      throw new Error(`Found ${invalidUuidTasks.length} tasks with invalid UUID format`);
    }
    console.log('✅ All task IDs are valid UUIDs');

    // Success!
    console.log('\n🎉 Test passed!');
    console.log(`✅ Created ${createdTasks.length} tasks successfully`);
    console.log(`✅ Verified ${updatedTaskCount} total tasks`);
    console.log(`✅ All tasks have valid UUID format`);
    console.log('-------------------------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});