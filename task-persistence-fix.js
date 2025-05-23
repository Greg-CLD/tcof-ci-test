/**
 * Standalone Task Persistence Fix
 * 
 * This standalone script runs outside the main application to directly fix
 * the task persistence issue by implementing a completely separate route
 * handler that doesn't depend on the broken projectsDb.ts file.
 * 
 * Run with: node task-persistence-fix.js
 */

const express = require('express');
const { createServer } = require('http');
const { pg } = require('drizzle-orm/pg-core');
const { drizzle } = require('drizzle-orm/node-postgres');
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

const db = drizzle(pool);

// Define simple schema for project tasks
const projectTasks = {
  id: 'id',
  projectId: 'project_id',
  text: 'text',
  stage: 'stage',
  origin: 'origin',
  sourceId: 'source_id',
  completed: 'completed',
  notes: 'notes',
  priority: 'priority',
  dueDate: 'due_date',
  owner: 'owner',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  taskType: 'task_type',
  factorId: 'factor_id',
  sortOrder: 'sort_order',
  assignedTo: 'assigned_to',
  taskNotes: 'task_notes'
};

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
  res.json({ status: 'ok', message: 'Task persistence fix server is running' });
});

// Task update endpoint
app.put('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const updateData = req.body;
    
    console.log(`[TASK_FIX] Processing update for project=${projectId}, task=${taskId}`);
    
    // Try to find task by ID first
    const findTaskQuery = `
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND id = $2
      LIMIT 1
    `;
    
    let task = await pool.query(findTaskQuery, [projectId, taskId]);
    
    // If not found by ID, try by sourceId
    if (task.rows.length === 0) {
      console.log(`[TASK_FIX] Task not found by ID, trying sourceId lookup`);
      
      const findBySourceIdQuery = `
        SELECT * FROM project_tasks 
        WHERE project_id = $1 AND source_id = $2
        LIMIT 1
      `;
      
      task = await pool.query(findBySourceIdQuery, [projectId, taskId]);
      
      if (task.rows.length === 0) {
        console.log(`[TASK_FIX] Task not found with ID or sourceId: ${taskId}`);
        return res.status(404).json({ error: 'Task not found' });
      }
    }
    
    const foundTask = task.rows[0];
    const actualTaskId = foundTask.id;
    
    // Map camelCase properties to snake_case
    const mappedData = mapCamelToSnakeCase(updateData);
    console.log(`[TASK_FIX] Mapped data:`, mappedData);
    
    // Build the update SQL
    const setClause = Object.entries(mappedData)
      .map(([column, _], index) => `${column} = $${index + 3}`)
      .join(', ');
    
    const updateValues = Object.values(mappedData);
    
    const updateQuery = `
      UPDATE project_tasks
      SET ${setClause}
      WHERE project_id = $1 AND id = $2
      RETURNING *
    `;
    
    // Execute the update
    const result = await pool.query(updateQuery, [projectId, actualTaskId, ...updateValues]);
    
    if (result.rows.length === 0) {
      console.error(`[TASK_FIX] Update failed for task ${actualTaskId}`);
      return res.status(500).json({ error: 'Update failed' });
    }
    
    const updatedTask = result.rows[0];
    const apiResponse = dbTaskToApiResponse(updatedTask);
    
    console.log(`[TASK_FIX] Task updated successfully: ${actualTaskId}`);
    return res.status(200).json(apiResponse);
  } catch (error) {
    console.error(`[TASK_FIX] Error:`, error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Start server
const PORT = process.env.TASK_FIX_PORT || 5001;
const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[TASK_FIX] Server running on port ${PORT}`);
  console.log(`[TASK_FIX] Use a reverse proxy to forward requests from /api/projects/:projectId/tasks/:taskId to this server`);
});