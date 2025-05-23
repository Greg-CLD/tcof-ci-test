/**
 * Task Persistence Fix - CommonJS Version
 * 
 * This script fixes the task persistence issues by:
 * 1. Patching the task update endpoint to properly map camelCase to snake_case
 * 2. Running a standalone Express server that handles task updates
 * 3. Not relying on the problematic projectsDb.ts file
 * 
 * To use:
 * 1. Run with: node fix-task-persistence.cjs
 * 2. It will start a server on port 3100 that handles task updates
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create and configure Express app
const app = express();
app.use(cors());
app.use(express.json());

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * Maps camelCase property names to snake_case database columns
 * This is the key function that fixes the persistence issue
 */
function mapCamelToSnakeCase(data) {
  const updateData = {};
  
  // Direct field mappings
  if (data.text !== undefined) updateData.text = data.text;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.origin !== undefined) updateData.origin = data.origin;
  if (data.notes !== undefined) updateData.notes = data.notes === '' ? null : data.notes;
  if (data.priority !== undefined) updateData.priority = data.priority === '' ? null : data.priority;
  if (data.owner !== undefined) updateData.owner = data.owner === '' ? null : data.owner;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
  
  // CamelCase to snake_case mappings - these were missing in the original code
  if (data.sourceId !== undefined) updateData.source_id = data.sourceId;
  if (data.projectId !== undefined) updateData.project_id = data.projectId;
  if (data.dueDate !== undefined) updateData.due_date = data.dueDate === '' ? null : data.dueDate;
  
  // Additional fields
  if (data.taskType !== undefined) updateData.task_type = data.taskType === '' ? null : data.taskType;
  if (data.factorId !== undefined) updateData.factor_id = data.factorId === '' ? null : data.factorId;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo === '' ? null : data.assignedTo;
  if (data.taskNotes !== undefined) updateData.task_notes = data.taskNotes === '' ? null : data.taskNotes;
  
  // Always update the updatedAt timestamp
  updateData.updated_at = new Date();
  
  return updateData;
}

/**
 * Convert database task object with snake_case columns to camelCase API response
 */
function dbTaskToApiResponse(dbTask) {
  return {
    id: dbTask.id,
    projectId: dbTask.project_id || '',
    text: dbTask.text || '',
    stage: dbTask.stage || 'identification',
    origin: dbTask.origin || 'custom',
    source: dbTask.origin || 'custom',
    sourceId: dbTask.source_id || '',
    completed: Boolean(dbTask.completed),
    notes: dbTask.notes || '',
    priority: dbTask.priority || '',
    dueDate: dbTask.due_date || '',
    owner: dbTask.owner || '',
    status: dbTask.status || 'To Do',
    createdAt: dbTask.created_at ? new Date(dbTask.created_at).toISOString() : new Date().toISOString(),
    updatedAt: dbTask.updated_at ? new Date(dbTask.updated_at).toISOString() : new Date().toISOString(),
    taskType: dbTask.task_type || '',
    factorId: dbTask.factor_id || '',
    sortOrder: dbTask.sort_order !== undefined ? dbTask.sort_order : 0,
    assignedTo: dbTask.assigned_to || '',
    taskNotes: dbTask.task_notes || ''
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Task persistence fix server is running' });
});

// Task update endpoint - fixes the original camelCase/snake_case mismatch
app.put('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const updateData = req.body;
    
    console.log(`Processing update for project=${projectId}, task=${taskId}`);
    console.log(`Request body:`, JSON.stringify(updateData, null, 2));
    
    // Try to find task by ID first
    let task;
    let lookupMethod = 'id';
    
    const findByIdQuery = `
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND id = $2
      LIMIT 1
    `;
    
    const idResult = await pool.query(findByIdQuery, [projectId, taskId]);
    
    if (idResult.rows.length > 0) {
      task = idResult.rows[0];
    } else {
      // If not found by ID, try by sourceId
      console.log(`Task not found by ID, trying sourceId lookup`);
      
      const findBySourceIdQuery = `
        SELECT * FROM project_tasks 
        WHERE project_id = $1 AND source_id = $2
        LIMIT 1
      `;
      
      const sourceIdResult = await pool.query(findBySourceIdQuery, [projectId, taskId]);
      
      if (sourceIdResult.rows.length > 0) {
        task = sourceIdResult.rows[0];
        lookupMethod = 'sourceId';
      }
    }
    
    if (!task) {
      console.log(`Task not found with ID or sourceId: ${taskId}`);
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const actualTaskId = task.id;
    console.log(`Found task via ${lookupMethod}, actual ID: ${actualTaskId}`);
    
    // Map camelCase properties to snake_case
    const mappedData = mapCamelToSnakeCase(updateData);
    console.log(`Mapped data:`, JSON.stringify(mappedData, null, 2));
    
    // Build the update SQL
    const setClauses = [];
    const values = [actualTaskId];
    let paramIndex = 2;
    
    for (const [column, value] of Object.entries(mappedData)) {
      setClauses.push(`${column} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    const setClause = setClauses.join(', ');
    
    const updateQuery = `
      UPDATE project_tasks
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    // Execute the update
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      console.error(`Update failed for task ${actualTaskId}`);
      return res.status(500).json({ error: 'Update failed' });
    }
    
    const updatedTask = result.rows[0];
    
    // Determine what ID to return in the response
    let responseId = updatedTask.id;
    
    // For canonical success factor tasks, use sourceId as the returned ID
    if (updatedTask.source_id && 
        (updatedTask.origin === 'success-factor' || updatedTask.origin === 'factor') && 
        !updatedTask.id.startsWith('custom-')) {
      console.log(`Using sourceId for canonical task: ${updatedTask.source_id}`);
      responseId = updatedTask.source_id;
    } else if (lookupMethod === 'sourceId') {
      // If we found the task by sourceId, return that as the ID for consistency
      responseId = taskId;
    }
    
    const apiResponse = dbTaskToApiResponse(updatedTask);
    
    // Ensure the ID in the response matches what the client expects
    apiResponse.id = responseId;
    
    console.log(`Task updated successfully: ${actualTaskId}, response ID: ${responseId}`);
    
    return res.status(200).json(apiResponse);
  } catch (error) {
    console.error(`Error:`, error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Proxy endpoint to handle direct API calls from the browser if needed
app.get('/proxy-api-url', (req, res) => {
  res.status(200).json({
    apiUrl: `http://localhost:3100`
  });
});

// Start server
const PORT = process.env.FIX_PORT || 3100;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Task persistence fix server running on port ${PORT}`);
  console.log(`Handling task update requests at: http://localhost:${PORT}/api/projects/:projectId/tasks/:taskId`);
  console.log(`Instructions: Use the server to update tasks by making PUT requests to the endpoint above`);
});