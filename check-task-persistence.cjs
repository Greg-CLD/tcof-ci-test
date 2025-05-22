/**
 * Success Factor Task Toggle Persistence Test
 * 
 * This script directly inspects the database schema and tests task update functionality
 * to collect evidence about the 404 errors when toggling Success Factor tasks.
 */

const { Pool } = require('pg');
const fs = require('fs');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper functions
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    console.log(`Running SQL: ${sql}`);
    if (params.length > 0) {
      console.log(`With params: ${JSON.stringify(params)}`);
    }
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Log to JSON file for evidence
function logEvidence(title, data) {
  // Create a directory for evidence if it doesn't exist
  if (!fs.existsSync('./evidence')) {
    fs.mkdirSync('./evidence');
  }
  const filename = `./evidence/${title.toLowerCase().replace(/\s+/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Evidence saved to ${filename}`);
}

// 1. Get database schema for project_tasks table
async function getTableSchema() {
  console.log('\n===== DATABASE SCHEMA =====');
  const schema = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'project_tasks'
    ORDER BY ordinal_position
  `);
  
  console.log(`Found ${schema.length} columns in project_tasks table`);
  console.table(schema);
  logEvidence('table-schema', schema);
  return schema;
}

// 2. Get all tasks for a project
async function getAllProjectTasks() {
  console.log('\n===== EVIDENCE 2: ALL PROJECT TASKS =====');
  
  const tasks = await query(`
    SELECT *
    FROM project_tasks
    WHERE project_id = $1
    ORDER BY id
    LIMIT 50
  `, [PROJECT_ID]);
  
  console.log(`Found ${tasks.length} tasks for project ${PROJECT_ID}`);
  logEvidence('all-project-tasks', tasks);
  return tasks;
}

// 3. Get Success Factor tasks for a project
async function getSuccessFactorTasks() {
  console.log('\n===== SUCCESS FACTOR TASKS =====');
  
  const tasks = await query(`
    SELECT *
    FROM project_tasks
    WHERE project_id = $1 AND origin = 'factor'
    ORDER BY id
  `, [PROJECT_ID]);
  
  console.log(`Found ${tasks.length} Success Factor tasks for project ${PROJECT_ID}`);
  logEvidence('success-factor-tasks', tasks);
  return tasks;
}

// 4. Get a specific task by ID
async function getTaskById(taskId) {
  console.log(`\n===== TASK BY ID: ${taskId} =====`);
  
  const tasks = await query(`
    SELECT *
    FROM project_tasks
    WHERE id = $1
  `, [taskId]);
  
  if (tasks.length === 0) {
    console.log(`Task with ID ${taskId} not found`);
    return null;
  }
  
  console.log('Task details:');
  console.table(tasks[0]);
  logEvidence(`task-by-id-${taskId}`, tasks[0]);
  return tasks[0];
}

// 5. Get tasks by source_id
async function getTasksBySourceId(sourceId) {
  console.log(`\n===== TASKS BY SOURCE_ID: ${sourceId} =====`);
  
  const tasks = await query(`
    SELECT *
    FROM project_tasks
    WHERE source_id = $1
  `, [sourceId]);
  
  console.log(`Found ${tasks.length} tasks with source_id ${sourceId}`);
  
  if (tasks.length > 0) {
    console.table(tasks);
    logEvidence(`tasks-by-source-id-${sourceId}`, tasks);
  }
  
  return tasks;
}

// 6. Toggle task completion (simulate PUT request)
async function toggleTaskCompletion(task) {
  console.log('\n===== EVIDENCE 1: TASK TOGGLE SIMULATION =====');
  
  // Create the request payload that would be sent by the client
  const updatePayload = {
    id: task.id,
    completed: !task.completed,
    status: !task.completed ? 'Done' : 'To Do',
    origin: task.origin,
    sourceId: task.source_id || ''
  };
  
  console.log('PUT request would contain:');
  console.log(`URL: /api/projects/${PROJECT_ID}/tasks/${task.id}`);
  console.log('Request body:');
  console.log(JSON.stringify(updatePayload, null, 2));
  
  // Log the evidence
  logEvidence('put-request-payload', {
    url: `/api/projects/${PROJECT_ID}/tasks/${task.id}`,
    method: 'PUT',
    body: updatePayload
  });
  
  // Update the task directly in the database
  console.log('\nUpdating task directly in database...');
  const updatedTask = await query(`
    UPDATE project_tasks
    SET completed = $1, status = $2
    WHERE id = $3
    RETURNING *
  `, [!task.completed, !task.completed ? 'Done' : 'To Do', task.id]);
  
  if (updatedTask.length === 0) {
    console.log('Task update failed!');
    return null;
  }
  
  console.log('Task updated successfully:');
  console.table(updatedTask[0]);
  logEvidence('updated-task', updatedTask[0]);
  
  return updatedTask[0];
}

// 7. Create task mapping evidence
function createTaskMapping(tasks) {
  console.log('\n===== EVIDENCE 4: TASK MAPPING FOR UI =====');
  
  const mapping = tasks.map(task => ({
    id: task.id,
    sourceId: task.source_id || '<empty>',
    text: task.text.substring(0, 30) + (task.text.length > 30 ? '...' : ''),
    completed: task.completed,
    origin: task.origin,
    updateIdUsed: (task.origin === 'factor' && task.source_id) ? 'sourceId' : 'id'
  }));
  
  console.table(mapping.slice(0, 5));
  logEvidence('ui-task-mapping', mapping);
  
  return mapping;
}

// 8. Simulate 404 error scenario
async function simulate404ErrorScenario() {
  console.log('\n===== EVIDENCE 3: 404 ERROR SIMULATION =====');
  
  // Get a success factor task with source_id
  const sfTasks = await getSuccessFactorTasks();
  const taskWithSourceId = sfTasks.find(t => t.source_id && t.source_id !== '');
  
  if (!taskWithSourceId) {
    console.log('No Success Factor task with source_id found for testing');
    return;
  }
  
  // 1. Try to update the task using wrong ID format (this should cause 404)
  console.log('\n1. Scenario: Client sends PUT with wrong ID format');
  
  // Create a fake ID by modifying the UUID slightly
  const wrongId = taskWithSourceId.id.replace(/^.{4}/, 'ffff');
  
  // Build the simulated request
  const wrongIdScenario = {
    url: `/api/projects/${PROJECT_ID}/tasks/${wrongId}`,
    method: 'PUT',
    body: {
      id: wrongId,
      completed: !taskWithSourceId.completed,
      status: !taskWithSourceId.completed ? 'Done' : 'To Do',
      origin: taskWithSourceId.origin,
      sourceId: taskWithSourceId.source_id
    }
  };
  
  console.log('This would result in a 404 error because:');
  console.log(`- Client uses task ID: ${wrongId}`);
  console.log(`- But no task with this ID exists in the database`);
  
  logEvidence('404-wrong-id-scenario', wrongIdScenario);
  
  // 2. Try to update using sourceId in URL path (this would also cause 404)
  console.log('\n2. Scenario: Client tries to use sourceId in URL path');
  
  const sourceIdScenario = {
    url: `/api/projects/${PROJECT_ID}/tasks/${taskWithSourceId.source_id}`,
    method: 'PUT',
    body: {
      id: taskWithSourceId.id,
      completed: !taskWithSourceId.completed,
      status: !taskWithSourceId.completed ? 'Done' : 'To Do',
      origin: taskWithSourceId.origin,
      sourceId: taskWithSourceId.source_id
    }
  };
  
  console.log('This would result in a 404 error because:');
  console.log(`- Server looks up task by path ID: ${taskWithSourceId.source_id}`);
  console.log(`- But task lookup is by ID column, not source_id column`);
  
  logEvidence('404-sourceid-in-path-scenario', sourceIdScenario);
  
  return {
    task: taskWithSourceId,
    wrongIdScenario,
    sourceIdScenario
  };
}

// Main test function
async function runTest() {
  try {
    console.log('🔍 STARTING TASK TOGGLE PERSISTENCE TEST 🔍');
    
    // 1. Get table schema to understand the database structure
    const schema = await getTableSchema();
    
    // 2. Get all tasks for the project (before any changes)
    const allTasks = await getAllProjectTasks();
    
    // 3. Get Success Factor tasks specifically
    const sfTasks = await getSuccessFactorTasks();
    
    if (sfTasks.length === 0) {
      console.log('No Success Factor tasks found for testing!');
      return;
    }
    
    // 4. Create task mapping evidence for UI
    const taskMapping = createTaskMapping(sfTasks);
    
    // 5. Choose a task to toggle and test update
    const taskToToggle = sfTasks[0];
    console.log(`\nSelected task for toggle test:`);
    console.table(taskToToggle);
    
    // 6. Toggle the task completion
    const updatedTask = await toggleTaskCompletion(taskToToggle);
    
    // 7. Get the updated task to verify persistence
    if (updatedTask) {
      const verifiedTask = await getTaskById(updatedTask.id);
      
      console.log('\n✅ UPDATE VERIFICATION:');
      console.log(`- Before toggle: completed=${taskToToggle.completed}`);
      console.log(`- After toggle: completed=${verifiedTask.completed}`);
      console.log(`- Update persisted: ${verifiedTask.completed !== taskToToggle.completed ? 'YES ✓' : 'NO ✗'}`);
    }
    
    // 8. If task has source_id, test lookup by source_id too
    if (taskToToggle.source_id) {
      await getTasksBySourceId(taskToToggle.source_id);
    }
    
    // 9. Simulate 404 error scenarios
    await simulate404ErrorScenario();
    
    console.log('\n🏁 TEST COMPLETE');
    console.log('All evidence has been saved to the evidence/ directory');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
runTest();