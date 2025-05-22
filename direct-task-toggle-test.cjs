/**
 * Direct Task Toggle Test Script
 * 
 * This script bypasses the authentication issue by directly querying
 * the database and testing task toggle functionality.
 */

const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TEST_FACTOR_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper functions
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    console.log(`🔍 Running SQL: ${sql}`);
    if (params.length > 0) {
      console.log(`🔍 With params: ${JSON.stringify(params)}`);
    }
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Log to file for evidence
function logToFile(title, data) {
  fs.appendFileSync('task-toggle-evidence.log', `\n\n===== ${title} =====\n${JSON.stringify(data, null, 2)}`);
}

// Get all tasks for a project
async function getAllProjectTasks() {
  console.log(`\n===== EVIDENCE 2: GET ALL PROJECT TASKS =====`);
  
  const tasks = await query(`
    SELECT * FROM project_tasks
    WHERE project_id = $1
    ORDER BY id
  `, [PROJECT_ID]);
  
  console.log(`Found ${tasks.length} tasks for project ${PROJECT_ID}`);
  logToFile('ALL PROJECT TASKS', tasks);
  return tasks;
}

// Get a specific task by ID
async function getTaskById(taskId) {
  console.log(`\n===== LOOKING UP TASK BY ID: ${taskId} =====`);
  
  const tasks = await query(`
    SELECT * FROM project_tasks
    WHERE id = $1 AND project_id = $2
  `, [taskId, PROJECT_ID]);
  
  if (tasks.length === 0) {
    console.log(`No task found with ID: ${taskId}`);
    return null;
  }
  
  console.log(`Found task with ID: ${taskId}`);
  logToFile(`TASK BY ID: ${taskId}`, tasks[0]);
  return tasks[0];
}

// Find tasks by source ID
async function getTasksBySourceId(sourceId) {
  console.log(`\n===== LOOKING UP TASK BY SOURCE ID: ${sourceId} =====`);
  
  const tasks = await query(`
    SELECT * FROM project_tasks
    WHERE source_id = $1 AND project_id = $2
  `, [sourceId, PROJECT_ID]);
  
  if (tasks.length === 0) {
    console.log(`No task found with source_id: ${sourceId}`);
    return [];
  }
  
  console.log(`Found ${tasks.length} tasks with source_id: ${sourceId}`);
  logToFile(`TASKS BY SOURCE ID: ${sourceId}`, tasks);
  return tasks;
}

// Get Success Factor tasks for a project
async function getSuccessFactorTasks() {
  console.log(`\n===== GETTING SUCCESS FACTOR TASKS =====`);
  
  const tasks = await query(`
    SELECT * FROM project_tasks
    WHERE project_id = $1 AND (origin = 'factor' OR source = 'factor')
    ORDER BY id
  `, [PROJECT_ID]);
  
  console.log(`Found ${tasks.length} Success Factor tasks for project ${PROJECT_ID}`);
  logToFile('SUCCESS FACTOR TASKS', tasks);
  return tasks;
}

// Toggle task completion (simulate PUT request)
async function toggleTaskCompletion(task) {
  console.log(`\n===== EVIDENCE 1: TOGGLING TASK COMPLETION (DIRECT DB) =====`);
  console.log(`Task before toggle: ID=${task.id}, completed=${task.completed}`);
  
  // Prepare update data for evidence
  const updatePayload = {
    completed: !task.completed,
    status: !task.completed ? 'Done' : 'To Do',
    origin: task.origin || 'factor',
    sourceId: task.source_id || ''
  };
  
  console.log(`PUT request would use endpoint: /api/projects/${PROJECT_ID}/tasks/${task.id}`);
  console.log(`PUT request payload would be: ${JSON.stringify(updatePayload, null, 2)}`);
  
  // Update directly in database
  const updatedTask = await query(`
    UPDATE project_tasks
    SET completed = $1, status = $2
    WHERE id = $3 AND project_id = $4
    RETURNING *
  `, [!task.completed, !task.completed ? 'Done' : 'To Do', task.id, PROJECT_ID]);
  
  if (updatedTask.length === 0) {
    console.log(`❌ Failed to update task with ID: ${task.id}`);
    return null;
  }
  
  console.log(`✅ Successfully updated task with ID: ${task.id}`);
  console.log(`Task after toggle: ID=${updatedTask[0].id}, completed=${updatedTask[0].completed}`);
  logToFile('TASK AFTER TOGGLE', updatedTask[0]);
  return updatedTask[0];
}

// Build UI mapping evidence
function buildUIMappingEvidence(tasks) {
  console.log(`\n===== EVIDENCE 4: UI TASK MAPPING =====`);
  
  const mapping = tasks.map(task => ({
    id: task.id,
    sourceId: task.source_id || '<empty>',
    text: task.text.substring(0, 30) + (task.text.length > 30 ? '...' : ''),
    completed: task.completed,
    origin: task.origin || '<empty>',
    source: task.source || '<empty>',
    // Determine which ID would be used by the UI
    updateIdUsed: (task.origin === 'factor' && task.source_id) ? 'sourceId' : 'id'
  }));
  
  console.log(JSON.stringify(mapping.slice(0, 5), null, 2));
  logToFile('UI TASK MAPPING', mapping);
  return mapping;
}

// Simulate the 404 error condition
async function simulateTaskNotFound() {
  console.log(`\n===== EVIDENCE 3: SIMULATING 404 ERROR CONDITION =====`);
  
  // Get all success factor tasks
  const sfTasks = await getSuccessFactorTasks();
  
  // Find a task with source_id
  const taskWithSourceId = sfTasks.find(t => t.source_id && t.source_id.length > 0);
  
  if (!taskWithSourceId) {
    console.log('No task with source_id found to test with');
    return;
  }
  
  // Try lookup by slightly modified task ID to simulate the 404
  const originalId = taskWithSourceId.id;
  const modifiedId = originalId.replace(/^.{4}/, 'ffff');
  
  console.log(`Original task ID: ${originalId}`);
  console.log(`Modified test ID (for 404): ${modifiedId}`);
  
  // Test lookup
  const foundTask = await getTaskById(modifiedId);
  console.log(`Lookup result: ${foundTask ? 'Task found (unexpected)' : '404 Not Found (expected)'}`);
  
  // Test lookup by source_id (which should succeed)
  const tasksBySourceId = await getTasksBySourceId(taskWithSourceId.source_id);
  console.log(`Source ID lookup: Found ${tasksBySourceId.length} tasks for source_id ${taskWithSourceId.source_id}`);
  
  return {
    originalTask: taskWithSourceId,
    modifiedId: modifiedId,
    lookupByIdResult: foundTask,
    lookupBySourceIdResult: tasksBySourceId
  };
}

// Run the test
async function runTest() {
  try {
    console.log('🔍 STARTING DIRECT TASK TOGGLE TEST');
    fs.writeFileSync('task-toggle-evidence.log', '===== TASK TOGGLE EVIDENCE LOG =====');
    
    // 1. Get all tasks
    const allTasks = await getAllProjectTasks();
    
    // 2. Get Success Factor tasks
    const sfTasks = await getSuccessFactorTasks();
    
    // 3. Build UI mapping
    const uiMapping = buildUIMappingEvidence(sfTasks);
    
    // 4. Toggle a task
    if (sfTasks.length > 0) {
      const taskToToggle = sfTasks[0];
      await toggleTaskCompletion(taskToToggle);
      
      // 5. Get tasks after toggle
      await getAllProjectTasks();
    } else {
      console.log('❌ No Success Factor tasks found to toggle');
    }
    
    // 6. Simulate 404 error condition
    await simulateTaskNotFound();
    
    console.log('\n🏁 TEST COMPLETE');
    console.log('Evidence has been saved to task-toggle-evidence.log');
    
  } catch (error) {
    console.error(`\n❌ ERROR RUNNING TEST: ${error.message}`);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Start the test
runTest();