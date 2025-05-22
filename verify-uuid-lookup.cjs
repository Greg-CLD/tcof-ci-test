/**
 * Verify Success Factor Task UUID Lookup
 * 
 * This script tests the enhanced lookup capability by:
 * 1. Getting existing success factor tasks from the database
 * 2. Testing the lookup function with both full UUID and UUID-prefix formats
 */

require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Project ID to use for the test
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Function to clean a UUID by extracting just the standard parts
function cleanUuid(uuid) {
  if (!uuid || typeof uuid !== 'string') return null;
  // Extract the first 5 segments (standard UUID format)
  const parts = uuid.split('-');
  if (parts.length < 5) return uuid;
  return parts.slice(0, 5).join('-');
}

// Simulated version of our enhanced lookup function
function findTaskById(tasks, taskId) {
  console.log(`[TASK_LOOKUP] Looking for task with ID: ${taskId}`);
  
  // First try exact match (fastest)
  const exactMatch = tasks.find(task => task.id === taskId);
  if (exactMatch) {
    console.log(`[TASK_LOOKUP] Found task with exact ID match: ${taskId}`);
    return {
      success: true,
      task: exactMatch,
      method: 'exact-match'
    };
  }
  
  // If no exact match, try matching with clean UUID as prefix
  console.log(`[TASK_LOOKUP] No exact match, trying UUID prefix matching...`);
  
  for (const task of tasks) {
    // Extract the clean UUID from the task's ID (first 5 segments)
    const taskCleanId = cleanUuid(task.id);
    
    // Log the comparison for debugging
    console.log(`[TASK_LOOKUP] Comparing task ID: "${task.id}"`);
    console.log(`[TASK_LOOKUP] Clean UUID: "${taskCleanId}"`);
    console.log(`[TASK_LOOKUP] Looking for: "${taskId}"`);
    
    // KEY IMPROVEMENT: Check if taskId matches clean UUID OR if task.id starts with taskId
    if (taskCleanId === taskId || task.id.startsWith(taskId)) {
      console.log(`[TASK_LOOKUP] Found task with matching clean UUID or as prefix: ${task.id}`);
      return {
        success: true,
        task,
        method: 'prefix-match'
      };
    }
  }
  
  // No match found with special handling for factor tasks
  console.log(`[TASK_LOOKUP] Checking specifically for factor-origin tasks...`);
  for (const task of tasks) {
    if (task.origin === 'factor' || task.origin === 'success-factor') {
      const taskCleanId = cleanUuid(task.id);
      // Check if this factor task has a sourceId that matches or starts with the taskId
      if ((task.source_id && task.source_id === taskId) || 
          (task.source_id && task.source_id.startsWith(taskId)) ||
          (taskCleanId === taskId)) {
        console.log(`[TASK_LOOKUP] Found factor task with matching sourceId or clean UUID: ${task.id}`);
        return {
          success: true,
          task,
          method: 'factor-match'
        };
      }
    }
  }
  
  // If we get here, no match was found
  console.log(`[TASK_LOOKUP] Task not found. ID: ${taskId}`);
  console.log(`[TASK_LOOKUP] Available task IDs:`, tasks.map(t => t.id));
  return {
    success: false,
    error: `Task with ID ${taskId} not found`
  };
}

// Test the lookup function
async function runTest() {
  console.log('\n=== Verifying Enhanced UUID Lookup Logic ===\n');
  
  try {
    // Step 1: Get all tasks for the project
    console.log(`Getting tasks for project: ${PROJECT_ID}\n`);
    const tasksResult = await pool.query(
      'SELECT * FROM project_tasks WHERE project_id = $1',
      [PROJECT_ID]
    );
    
    const tasks = tasksResult.rows;
    console.log(`Found ${tasks.length} tasks in the project\n`);
    
    if (tasks.length === 0) {
      console.log('No tasks found for testing. Please create some tasks in the project first.');
      return;
    }
    
    // Step 2: Find a factor-origin task for testing
    console.log('Looking for factor-origin tasks to test with...');
    const factorTasks = tasks.filter(
      task => task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${factorTasks.length} factor-origin tasks\n`);
    
    if (factorTasks.length === 0) {
      console.log('No factor-origin tasks found for testing.');
      console.log('Testing with regular tasks instead...');
      
      // Test 1: Try exact ID lookup
      const testTask = tasks[0];
      console.log(`\nTest 1: Exact ID lookup for task: ${testTask.id}\n`);
      const exactResult = findTaskById(tasks, testTask.id);
      console.log(`Result: ${exactResult.success ? 'Found' : 'Not found'}`);
      console.log(`Method: ${exactResult.method || 'none'}\n`);
      
      // Test 2: Try prefix matching with the first part of the UUID
      const prefixId = testTask.id.split('-')[0];
      console.log(`\nTest 2: Prefix matching with: ${prefixId}\n`);
      const prefixResult = findTaskById(tasks, prefixId);
      console.log(`Result: ${prefixResult.success ? 'Found' : 'Not found'}`);
      console.log(`Method: ${prefixResult.method || 'none'}\n`);
      
    } else {
      // We have factor tasks to test with
      const factorTask = factorTasks[0];
      console.log('Selected factor task for testing:');
      console.log(`ID: ${factorTask.id}`);
      console.log(`Text: ${factorTask.text}`);
      console.log(`Origin: ${factorTask.origin}`);
      console.log(`Source ID: ${factorTask.source_id || 'none'}\n`);
      
      // Test 1: Try full ID lookup
      console.log(`\nTest 1: Full ID lookup for factor task: ${factorTask.id}\n`);
      const fullIdResult = findTaskById(tasks, factorTask.id);
      console.log(`Result: ${fullIdResult.success ? 'Found' : 'Not found'}`);
      console.log(`Method: ${fullIdResult.method || 'none'}\n`);
      
      // Test 2: Try clean UUID lookup (first 5 segments)
      const cleanId = cleanUuid(factorTask.id);
      console.log(`\nTest 2: Clean UUID lookup with: ${cleanId}\n`);
      const cleanIdResult = findTaskById(tasks, cleanId);
      console.log(`Result: ${cleanIdResult.success ? 'Found' : 'Not found'}`);
      console.log(`Method: ${cleanIdResult.method || 'none'}\n`);
      
      // Test 3: If available, try source ID lookup
      if (factorTask.source_id) {
        console.log(`\nTest 3: Source ID lookup with: ${factorTask.source_id}\n`);
        const sourceIdResult = findTaskById(tasks, factorTask.source_id);
        console.log(`Result: ${sourceIdResult.success ? 'Found' : 'Not found'}`);
        console.log(`Method: ${sourceIdResult.method || 'none'}\n`);
      }
    }
    
    console.log('=== Verification Complete ===');
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the test
runTest();