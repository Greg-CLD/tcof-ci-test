/**
 * Success Factor Task Mapping Fix
 * 
 * This script demonstrates the proper camelCase to snake_case mapping needed 
 * for the updateTask method in projectsDb.ts to fix task persistence.
 * 
 * The fix addresses the core issue where task updates don't persist because
 * camelCase properties in the application code (projectId, sourceId) don't match
 * the snake_case column names in the database (project_id, source_id).
 */

const { Client } = require('pg');
require('dotenv').config();

// Connect to the database
async function connectToDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  console.log('Connected to database');
  return client;
}

// Helper function to log with timestamps
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Find a Success Factor task to update
async function findSuccessFactorTask(client, projectId) {
  const query = `
    SELECT * FROM project_tasks 
    WHERE project_id = $1 AND origin = 'factor'
    LIMIT 1
  `;
  
  const result = await client.query(query, [projectId]);
  
  if (result.rows.length === 0) {
    throw new Error(`No Success Factor tasks found for project ${projectId}`);
  }
  
  return result.rows[0];
}

// Find a project to work with
async function findProject(client) {
  const query = 'SELECT id, name FROM projects LIMIT 1';
  const result = await client.query(query);
  
  if (result.rows.length === 0) {
    throw new Error('No projects found in database');
  }
  
  return result.rows[0];
}

// *** CRITICAL FIX: This is the key function that needs to be implemented in projectsDb.ts ***
// Maps camelCase property names to snake_case database column names
function mapCamelToSnakeCase(data) {
  const updateData = {};
  
  // Direct field mappings (no conversion needed)
  if (data.text !== undefined) updateData.text = data.text;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.origin !== undefined) updateData.origin = data.origin;
  if (data.notes !== undefined) updateData.notes = data.notes === '' ? null : data.notes;
  if (data.priority !== undefined) updateData.priority = data.priority === '' ? null : data.priority;
  if (data.owner !== undefined) updateData.owner = data.owner === '' ? null : data.owner;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
  
  // CamelCase to snake_case mappings
  if (data.sourceId !== undefined) updateData.source_id = data.sourceId; 
  if (data.projectId !== undefined) updateData.project_id = data.projectId;
  if (data.dueDate !== undefined) updateData.due_date = data.dueDate === '' ? null : data.dueDate;
  
  // Additional fields from the ProjectTask interface
  if (data.taskType !== undefined) updateData.task_type = data.taskType === '' ? null : data.taskType;
  if (data.factorId !== undefined) updateData.factor_id = data.factorId === '' ? null : data.factorId;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo === '' ? null : data.assignedTo;
  if (data.taskNotes !== undefined) updateData.task_notes = data.taskNotes === '' ? null : data.taskNotes;
  
  // Handle dates
  if (data.createdAt !== undefined) {
    updateData.created_at = typeof data.createdAt === 'string' ? 
      new Date(data.createdAt) : data.createdAt;
  }
  
  // Always update the updatedAt timestamp
  updateData.updated_at = new Date();
  
  return updateData;
}

// Update a task using the proper camelCase to snake_case mapping
async function updateTask(client, taskId, data) {
  // First, map the camelCase properties to snake_case database columns
  const mappedData = mapCamelToSnakeCase(data);
  
  // Build SET clause for SQL UPDATE
  const setClauses = [];
  const values = [];
  let paramCounter = 1;
  
  for (const [key, value] of Object.entries(mappedData)) {
    setClauses.push(`${key} = $${paramCounter}`);
    values.push(value);
    paramCounter++;
  }
  
  // Add the task ID at the end for the WHERE clause
  values.push(taskId);
  
  // Create the full SQL query
  const query = `
    UPDATE project_tasks 
    SET ${setClauses.join(', ')}
    WHERE id = $${paramCounter}
    RETURNING *
  `;
  
  log(`Executing SQL: ${query}`);
  log(`With values: ${JSON.stringify(values)}`);
  
  try {
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`No rows updated for task ${taskId}`);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Error updating task:`, error);
    throw error;
  }
}

// Verify the task is correctly updated
async function getTaskById(client, taskId) {
  const query = 'SELECT * FROM project_tasks WHERE id = $1';
  const result = await client.query(query, [taskId]);
  
  if (result.rows.length === 0) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  return result.rows[0];
}

// Test the full fix
async function testTaskMappingFix() {
  let client;
  
  try {
    client = await connectToDatabase();
    
    // Step 1: Find a project to work with
    log('Step 1: Finding a project to work with...');
    const project = await findProject(client);
    log(`Found project: ${project.name} (${project.id})`);
    
    // Step 2: Find a Success Factor task to update
    log('Step 2: Finding a Success Factor task to update...');
    const task = await findSuccessFactorTask(client, project.id);
    log(`Found task: ${task.text} (${task.id})`);
    log(`Current completion state: ${task.completed}`);
    
    // Step 3: Update the task using our new mapping function
    log('Step 3: Updating task with proper camelCase to snake_case mapping...');
    const newCompletionState = !task.completed;
    const updateData = {
      completed: newCompletionState,
      // Include some camelCase properties to test the mapping
      sourceId: task.source_id,
      dueDate: '2025-06-30',
      taskNotes: 'Updated via mapping fix script'
    };
    
    log(`Update data before mapping: ${JSON.stringify(updateData)}`);
    const mappedData = mapCamelToSnakeCase(updateData);
    log(`Update data after mapping: ${JSON.stringify(mappedData)}`);
    
    // Perform the update
    const updatedTask = await updateTask(client, task.id, updateData);
    log(`Task updated successfully, new completion state: ${updatedTask.completed}`);
    
    // Step 4: Verify the update persisted
    log('Step 4: Verifying the update persisted...');
    const verifiedTask = await getTaskById(client, task.id);
    
    if (verifiedTask.completed === newCompletionState) {
      log('✅ SUCCESS: Task state persisted correctly!');
      log(`Verified status: ${verifiedTask.completed}`);
      log(`Task notes: ${verifiedTask.task_notes}`);
    } else {
      log('❌ FAILURE: Task state did not persist');
      log(`Expected: ${newCompletionState}, Actual: ${verifiedTask.completed}`);
    }
    
    // Step 5: Restore the original state
    log('Step 5: Restoring original task state...');
    const restoreData = {
      completed: task.completed,
      taskNotes: 'Restored via mapping fix script'
    };
    
    const restoredTask = await updateTask(client, task.id, restoreData);
    log(`Task restored to original state: ${restoredTask.completed}`);
    
    log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (client) {
      await client.end();
      log('Database connection closed');
    }
  }
}

// Run the test
testTaskMappingFix();

/**
 * How to fix projectsDb.ts:
 * 
 * 1. Add the mapCamelToSnakeCase function shown above
 * 
 * 2. Replace the current updateTask method with:
 * 
 * async updateTask(taskId: string, data: Partial<ProjectTask>) {
 *   // First find the task to make sure it exists
 *   const task = await this.getTaskById(data.projectId, taskId);
 *   
 *   if (!task) {
 *     console.error(`[TASK_UPDATE_ERROR] Task ${taskId} not found`);
 *     throw new Error(`Task ${taskId} not found`);
 *   }
 *   
 *   try {
 *     // Convert camelCase properties to snake_case database columns
 *     const mappedData = mapCamelToSnakeCase(data);
 *     
 *     // Check that we have valid data to update
 *     if (Object.keys(mappedData).length === 0) {
 *       console.error(`[TASK_UPDATE_ERROR] No valid update data provided`);
 *       throw new Error('No valid update data provided');
 *     }
 *     
 *     // Update the task in the database
 *     const [updatedTask] = await db.update(projectTasksTable)
 *       .set(mappedData)
 *       .where(eq(projectTasksTable.id, taskId))
 *       .returning();
 *     
 *     return updatedTask;
 *   } catch (error) {
 *     console.error(`[TASK_UPDATE_ERROR] Error updating task ${taskId}:`, error);
 *     throw error;
 *   }
 * }
 */