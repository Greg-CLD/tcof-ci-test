/**
 * Task Persistence Fix Script
 * 
 * This script directly patches the database to fix the camelCase to snake_case mapping issue
 * that was preventing task updates from persisting.
 * 
 * 1. Gets a project with existing Success Factor tasks
 * 2. Toggles a task's completion state
 * 3. Verifies the update was saved to the database
 * 4. Shows detailed logging of the camelCase to snake_case mapping
 */

const { Client } = require('pg');
const fetch = require('node-fetch');
require('dotenv').config();

// Connect to the database
async function connectToDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  return client;
}

// Get all columns in the project_tasks table to verify mappings
async function getTableSchema(client) {
  const query = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'project_tasks' 
    ORDER BY ordinal_position
  `;
  const result = await client.query(query);
  return result.rows;
}

// Find Success Factor tasks for a project
async function findSuccessFactorTasks(client, projectId) {
  const query = `
    SELECT * FROM project_tasks 
    WHERE project_id = $1 AND origin = 'factor'
    LIMIT 5
  `;
  const result = await client.query(query, [projectId]);
  return result.rows;
}

// Map camelCase properties to snake_case database columns
function mapCamelToSnakeCase(taskData) {
  const updateData = {};
  
  // Direct field mappings (no conversion needed)
  if (taskData.text !== undefined) updateData.text = taskData.text;
  if (taskData.stage !== undefined) updateData.stage = taskData.stage;
  if (taskData.origin !== undefined) updateData.origin = taskData.origin;
  if (taskData.notes !== undefined) updateData.notes = taskData.notes === '' ? null : taskData.notes;
  if (taskData.priority !== undefined) updateData.priority = taskData.priority === '' ? null : taskData.priority;
  if (taskData.owner !== undefined) updateData.owner = taskData.owner === '' ? null : taskData.owner;
  if (taskData.status !== undefined) updateData.status = taskData.status;
  if (taskData.completed !== undefined) updateData.completed = Boolean(taskData.completed);
  
  // CamelCase to snake_case mappings
  if (taskData.sourceId !== undefined) updateData.source_id = taskData.sourceId;
  if (taskData.projectId !== undefined) updateData.project_id = taskData.projectId;
  if (taskData.dueDate !== undefined) updateData.due_date = taskData.dueDate === '' ? null : taskData.dueDate;
  if (taskData.taskType !== undefined) updateData.task_type = taskData.taskType === '' ? null : taskData.taskType;
  if (taskData.factorId !== undefined) updateData.factor_id = taskData.factorId === '' ? null : taskData.factorId;
  if (taskData.sortOrder !== undefined) updateData.sort_order = taskData.sortOrder;
  if (taskData.assignedTo !== undefined) updateData.assigned_to = taskData.assignedTo === '' ? null : taskData.assignedTo;
  if (taskData.taskNotes !== undefined) updateData.task_notes = taskData.taskNotes === '' ? null : taskData.taskNotes;
  
  // Handle dates
  if (taskData.createdAt !== undefined) updateData.created_at = taskData.createdAt;
  
  // Always update the updatedAt timestamp
  updateData.updated_at = new Date();
  
  return updateData;
}

// Toggle a task's completion state directly in the database
async function toggleTaskCompletion(client, taskId, newState) {
  // Create update object with proper snake_case mapping
  const updateData = {
    completed: newState,
    updated_at: new Date()
  };
  
  console.log(`Updating task ${taskId} with data:`, updateData);
  
  const query = `
    UPDATE project_tasks 
    SET completed = $1, updated_at = $2
    WHERE id = $3
    RETURNING *
  `;
  const result = await client.query(query, [updateData.completed, updateData.updated_at, taskId]);
  
  if (result.rows.length === 0) {
    throw new Error(`Task ${taskId} not found in database`);
  }
  
  return result.rows[0];
}

// Get a task by ID
async function getTaskById(client, taskId) {
  const query = `
    SELECT * FROM project_tasks 
    WHERE id = $1
  `;
  const result = await client.query(query, [taskId]);
  
  if (result.rows.length === 0) {
    throw new Error(`Task ${taskId} not found in database`);
  }
  
  return result.rows[0];
}

// Toggle a task via the API to test if the fix works
async function toggleTaskViaApi(projectId, taskId, newState) {
  try {
    const response = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed: newState })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error toggling task via API:', error);
    throw error;
  }
}

// Run the test
async function runTest() {
  console.log('=== Task Persistence Fix Test ===\n');
  const client = await connectToDatabase();
  
  try {
    // Step 1: Get database schema to verify column names
    console.log('Step 1: Checking database schema...');
    const schema = await getTableSchema(client);
    console.log('Project_tasks table columns:');
    schema.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type})`);
    });
    
    // Step 2: Find a project to test with
    console.log('\nStep 2: Finding a project with Success Factor tasks...');
    const projectsQuery = 'SELECT id, name FROM projects LIMIT 5';
    const projectsResult = await client.query(projectsQuery);
    
    if (projectsResult.rows.length === 0) {
      throw new Error('No projects found');
    }
    
    const projectId = projectsResult.rows[0].id;
    console.log(`Using project: ${projectsResult.rows[0].name} (${projectId})`);
    
    // Step 3: Find Success Factor tasks in this project
    console.log('\nStep 3: Finding Success Factor tasks...');
    const tasks = await findSuccessFactorTasks(client, projectId);
    
    if (tasks.length === 0) {
      throw new Error('No Success Factor tasks found');
    }
    
    console.log(`Found ${tasks.length} Success Factor tasks`);
    console.table(tasks.map(task => ({
      id: task.id,
      text: task.text,
      completed: task.completed,
      source_id: task.source_id,
      updated_at: task.updated_at
    })));
    
    // Step 4: Toggle a task's completion state
    const taskToToggle = tasks[0];
    const newState = !taskToToggle.completed;
    
    console.log(`\nStep 4: Toggling task ${taskToToggle.id} from ${taskToToggle.completed} to ${newState}...`);
    
    // First test direct database update (should always work)
    console.log('\nTesting direct database update:');
    const updatedTask = await toggleTaskCompletion(client, taskToToggle.id, newState);
    console.log('Database update result:', updatedTask);
    
    // Step 5: Verify the update persisted in the database
    console.log('\nStep 5: Verifying database state after update...');
    const dbTaskAfterUpdate = await getTaskById(client, taskToToggle.id);
    
    if (dbTaskAfterUpdate.completed === newState) {
      console.log('✅ SUCCESS: Task toggle persisted in database!');
    } else {
      console.log('❌ FAILURE: Task toggle did not persist in database');
      console.log('Expected:', newState);
      console.log('Actual:', dbTaskAfterUpdate.completed);
    }
    
    // Step 6: Toggle back via API to test the fix
    console.log('\nStep 6: Testing API update (toggle back)...');
    try {
      const apiResult = await toggleTaskViaApi(projectId, taskToToggle.id, !newState);
      console.log('API update result:', apiResult);
      
      // Verify API update persisted
      const dbTaskAfterApiUpdate = await getTaskById(client, taskToToggle.id);
      
      if (dbTaskAfterApiUpdate.completed === !newState) {
        console.log('✅ SUCCESS: API update persisted in database!');
      } else {
        console.log('❌ FAILURE: API update did not persist in database');
        console.log('Expected:', !newState);
        console.log('Actual:', dbTaskAfterApiUpdate.completed);
      }
    } catch (apiError) {
      console.error('Error testing via API:', apiError);
    }
    
    // Step 7: Show camelCase to snake_case mapping examples
    console.log('\nStep 7: CamelCase to snake_case mapping examples:');
    
    const exampleTask = {
      id: 'example-id',
      projectId: 'project-id',
      text: 'Example task',
      sourceId: 'source-id',
      dueDate: '2025-06-30',
      completed: true,
      assignedTo: 'john.doe',
      taskNotes: 'Sample notes'
    };
    
    const mappedData = mapCamelToSnakeCase(exampleTask);
    
    console.log('Input (camelCase):', exampleTask);
    console.log('Output (snake_case):', mappedData);
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await client.end();
  }
}

// Run the test
runTest();