#!/usr/bin/env node
/**
 * Checklist Task Persistence Smoke Test
 * 
 * Usage:
 *   node scripts/assert-checklist.cjs <PROJECT_UUID> <EXPECTED_COUNT>
 * 
 * Example:
 *   node scripts/assert-checklist.cjs bc55c1a2-0cdf-4108-aa9e-44b44baea3b8 4
 * 
 * Description:
 *   This script verifies that the checklist task persistence works correctly:
 *   - Creates one test task for each stage (identification, definition, delivery, closure)
 *   - Ensures all IDs are valid UUIDs
 *   - Verifies tasks are properly stored and can be retrieved
 *   - Asserts that at least the expected number of tasks are returned
 */

const fetch = require('node-fetch');
const { v4: uuidv4, validate: isValidUuid } = require('uuid');

// Constants and configuration
const API_BASE_URL = 'http://localhost:5000/api';
const STAGES = ['identification', 'definition', 'delivery', 'closure'];
const ORIGIN_TYPES = ['custom', 'heuristic', 'factor', 'policy', 'framework'];

// Command line arguments
const projectId = process.argv[2];
const expectedCount = parseInt(process.argv[3] || '4', 10);

// Validation
if (!projectId || !isValidUuid(projectId)) {
  console.error('Error: Please provide a valid project UUID as the first argument');
  console.error('Usage: node scripts/assert-checklist.cjs <PROJECT_UUID> <EXPECTED_COUNT>');
  process.exit(1);
}

if (isNaN(expectedCount) || expectedCount < 1) {
  console.error('Error: Expected count must be a positive number');
  process.exit(1);
}

/**
 * Main test function
 */
async function runTest() {
  console.log(`🧪 Running checklist task persistence smoke test`);
  console.log(`🔍 Project ID: ${projectId}`);
  console.log(`✅ Expected minimum task count: ${expectedCount}`);
  console.log('-------------------------------------------');

  const createdTasks = [];
  let initialTaskCount = 0;

  try {
    // First get initial task count
    console.log('📋 Checking initial task count...');
    const initialTasks = await fetchTasks();
    initialTaskCount = initialTasks.length;
    console.log(`📊 Initial task count: ${initialTaskCount}`);

    // Create a task for each stage
    console.log('\n📝 Creating test tasks for each stage...');
    for (const stage of STAGES) {
      const task = await createTask(stage);
      createdTasks.push(task);
      console.log(`✅ Created task for stage "${stage}": ${task.id.substring(0, 8)}...`);
    }

    // Verify tasks were persisted
    console.log('\n🔍 Verifying task persistence...');
    const updatedTasks = await fetchTasks();
    const updatedTaskCount = updatedTasks.length;
    console.log(`📊 Updated task count: ${updatedTaskCount} (${updatedTaskCount - initialTaskCount} added)`);

    // Assert expected task count
    if (updatedTaskCount < initialTaskCount + STAGES.length) {
      throw new Error(`Task count verification failed. Expected at least ${initialTaskCount + STAGES.length} tasks, but got ${updatedTaskCount}`);
    }

    // Verify all created tasks are in the fetched list
    const createdIds = new Set(createdTasks.map(task => task.id));
    const fetchedIds = new Set(updatedTasks.map(task => task.id));
    
    const missingIds = [...createdIds].filter(id => !fetchedIds.has(id));
    if (missingIds.length > 0) {
      throw new Error(`Some created tasks are missing from the fetched list: ${missingIds.join(', ')}`);
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
    console.log('\n🎉 Smoke test passed!');
    console.log(`✅ Successfully created ${createdTasks.length} tasks`);
    console.log(`✅ Verified total of ${updatedTaskCount} tasks`);
    console.log(`✅ All tasks have valid UUID format`);
    console.log('-------------------------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Smoke test failed: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      try {
        const errorText = await error.response.text();
        console.error(`Response: ${errorText}`);
      } catch (e) {
        console.error('Could not parse error response');
      }
    }
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Fetch all tasks for the project
 */
async function fetchTasks() {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Create a test task for the given stage
 */
async function createTask(stage) {
  // Generate a random origin type
  const origin = ORIGIN_TYPES[Math.floor(Math.random() * ORIGIN_TYPES.length)];
  
  // Create a unique task with timestamp
  const timestamp = new Date().toISOString();
  const taskId = uuidv4();
  const sourceId = `smoke-test-${uuidv4()}`;
  
  const taskData = {
    id: taskId,
    projectId,
    text: `Smoke test task - ${stage} (${timestamp})`,
    stage,
    origin,
    sourceId,
    completed: false,
    priority: "medium",
    status: "To Do",
    notes: "Created by smoke test script"
  };
  
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create task for stage "${stage}": ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Run the test
runTest().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});