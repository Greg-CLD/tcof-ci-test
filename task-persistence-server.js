/**
 * Standalone Task Persistence Server
 * 
 * This script runs a completely separate server that handles task updates
 * without depending on the problematic projectsDb.ts file.
 * 
 * Run with: node task-persistence-server.js
 */

const express = require('express');
const { createServer } = require('http');
const { Pool } = require('pg');
const cors = require('cors');

// Create the app
const app = express();
app.use(express.json());
app.use(cors());

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Maps camelCase property names to snake_case database columns
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
  
  // CamelCase to snake_case mappings
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

// Define routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Task persistence server is running' });
});

// Task update endpoint
app.put('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const updateData = req.body;
    
    console.log(`[STANDALONE] Processing update for project=${projectId}, task=${taskId}`);
    console.log(`[STANDALONE] Request body:`, JSON.stringify(updateData, null, 2));
    
    // Try to find task by ID first
    const findTaskQuery = `
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND id = $2
      LIMIT 1
    `;
    
    let task = await pool.query(findTaskQuery, [projectId, taskId]);
    let lookupMethod = 'id';
    
    // If not found by ID, try by sourceId
    if (task.rows.length === 0) {
      console.log(`[STANDALONE] Task not found by ID, trying sourceId lookup`);
      
      const findBySourceIdQuery = `
        SELECT * FROM project_tasks 
        WHERE project_id = $1 AND source_id = $2
        LIMIT 1
      `;
      
      task = await pool.query(findBySourceIdQuery, [projectId, taskId]);
      lookupMethod = 'sourceId';
      
      if (task.rows.length === 0) {
        console.log(`[STANDALONE] Task not found with ID or sourceId: ${taskId}`);
        return res.status(404).json({ error: 'Task not found' });
      }
    }
    
    const foundTask = task.rows[0];
    const actualTaskId = foundTask.id;
    
    console.log(`[STANDALONE] Found task via ${lookupMethod}, actual ID: ${actualTaskId}`);
    
    // Map camelCase properties to snake_case
    const mappedData = mapCamelToSnakeCase(updateData);
    console.log(`[STANDALONE] Mapped data:`, JSON.stringify(mappedData, null, 2));
    
    // Build the update SQL
    const setClauses = [];
    const values = [projectId, actualTaskId];
    let paramIndex = 3;
    
    for (const [column, value] of Object.entries(mappedData)) {
      setClauses.push(`${column} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    const setClause = setClauses.join(', ');
    
    const updateQuery = `
      UPDATE project_tasks
      SET ${setClause}
      WHERE project_id = $1 AND id = $2
      RETURNING *
    `;
    
    console.log(`[STANDALONE] SQL query: ${updateQuery}`);
    console.log(`[STANDALONE] SQL parameters:`, JSON.stringify(values, null, 2));
    
    // Execute the update
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      console.error(`[STANDALONE] Update failed for task ${actualTaskId}`);
      return res.status(500).json({ error: 'Update failed' });
    }
    
    const updatedTask = result.rows[0];
    console.log(`[STANDALONE] Raw database response:`, JSON.stringify(updatedTask, null, 2));
    
    // Determine what ID to return in the response
    let responseId = updatedTask.id;
    
    // For canonical success factor tasks, use sourceId as the returned ID
    if (updatedTask.source_id && 
        (updatedTask.origin === 'success-factor' || updatedTask.origin === 'factor') && 
        !updatedTask.id.startsWith('custom-')) {
      console.log(`[STANDALONE] Using sourceId for canonical task: ${updatedTask.source_id}`);
      responseId = updatedTask.source_id;
    } else if (lookupMethod === 'sourceId') {
      // If we found the task by sourceId, return that as the ID for consistency
      responseId = taskId;
    }
    
    const apiResponse = dbTaskToApiResponse(updatedTask);
    
    // Ensure the ID in the response matches what the client expects
    apiResponse.id = responseId;
    
    console.log(`[STANDALONE] Task updated successfully: ${actualTaskId}, response ID: ${responseId}`);
    console.log(`[STANDALONE] API response:`, JSON.stringify(apiResponse, null, 2));
    
    return res.status(200).json(apiResponse);
  } catch (error) {
    console.error(`[STANDALONE] Error:`, error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Start server
const PORT = process.env.STANDALONE_PORT || 3100;
const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[STANDALONE] Task persistence server running on port ${PORT}`);
  console.log(`[STANDALONE] Use curl for testing:`);
  console.log(`curl -X PUT -H "Content-Type: application/json" -d '{"completed":true}' http://localhost:${PORT}/api/projects/YOUR_PROJECT_ID/tasks/YOUR_TASK_ID`);
});