/**
 * Task Persistence Fix
 * 
 * This module provides a direct route that handles task updates
 * with proper property mapping between camelCase and snake_case.
 */

// Import required dependencies
const { projectTasks } = require('../shared/schema');
const { eq, and } = require('drizzle-orm');
const { db } = require('./db');

/**
 * Convert data from camelCase to snake_case for database operations
 */
function mapToSnakeCase(data) {
  const result = {};
  
  // Direct mappings (no conversion needed)
  if (data.text !== undefined) result.text = data.text;
  if (data.stage !== undefined) result.stage = data.stage;
  if (data.origin !== undefined) result.origin = data.origin;
  if (data.notes !== undefined) result.notes = data.notes === '' ? null : data.notes;
  if (data.priority !== undefined) result.priority = data.priority === '' ? null : data.priority;
  if (data.owner !== undefined) result.owner = data.owner === '' ? null : data.owner;
  if (data.status !== undefined) result.status = data.status;
  if (data.completed !== undefined) result.completed = Boolean(data.completed);
  
  // CamelCase to snake_case conversions
  if (data.sourceId !== undefined) result.source_id = data.sourceId;
  if (data.projectId !== undefined) result.project_id = data.projectId;
  if (data.dueDate !== undefined) result.due_date = data.dueDate === '' ? null : data.dueDate;
  if (data.taskType !== undefined) result.task_type = data.taskType === '' ? null : data.taskType;
  if (data.factorId !== undefined) result.factor_id = data.factorId === '' ? null : data.factorId;
  if (data.sortOrder !== undefined) result.sort_order = data.sortOrder;
  if (data.assignedTo !== undefined) result.assigned_to = data.assignedTo === '' ? null : data.assignedTo;
  if (data.taskNotes !== undefined) result.task_notes = data.taskNotes === '' ? null : data.taskNotes;
  
  // Always update timestamp
  result.updated_at = new Date();
  
  return result;
}

/**
 * Convert database record with snake_case to camelCase for API response
 */
function mapToCamelCase(dbTask) {
  return {
    id: dbTask.id,
    projectId: dbTask.project_id || '',
    text: dbTask.text || '',
    stage: dbTask.stage || 'identification',
    origin: dbTask.origin || 'custom',
    source: dbTask.origin || 'custom', // For compatibility
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

/**
 * Add task endpoints to Express app
 */
function addTaskEndpoints(app) {
  // Add the fixed task update endpoint
  app.put('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      let taskId = req.params.taskId;
      
      console.log(`[TASK_FIX] Processing task update for project=${projectId}, task=${taskId}`);
      
      // Find task by ID first
      let tasks = await db.select()
        .from(projectTasks)
        .where(
          and(
            eq(projectTasks.projectId, projectId),
            eq(projectTasks.id, taskId)
          )
        )
        .limit(1);
      
      // If not found by ID, try source_id lookup
      if (tasks.length === 0) {
        console.log(`[TASK_FIX] Task not found by ID, trying sourceId lookup`);
        
        tasks = await db.select()
          .from(projectTasks)
          .where(
            and(
              eq(projectTasks.projectId, projectId),
              eq(projectTasks.sourceId, taskId)
            )
          )
          .limit(1);
        
        if (tasks.length === 0) {
          console.log(`[TASK_FIX] Task not found: ${taskId}`);
          return res.status(404).json({ error: 'Task not found' });
        }
        
        // Use the actual database ID
        taskId = tasks[0].id;
        console.log(`[TASK_FIX] Found task via sourceId, using ID: ${taskId}`);
      }
      
      // Map camelCase to snake_case for database
      const mappedData = mapToSnakeCase(req.body);
      console.log(`[TASK_FIX] Mapped update data:`, mappedData);
      
      // Execute the update
      const [updatedTask] = await db.update(projectTasks)
        .set(mappedData)
        .where(
          and(
            eq(projectTasks.projectId, projectId),
            eq(projectTasks.id, taskId)
          )
        )
        .returning();
      
      if (!updatedTask) {
        console.error(`[TASK_FIX] Update failed`);
        return res.status(500).json({ error: 'Update failed' });
      }
      
      // Map database record to API response format
      const response = mapToCamelCase(updatedTask);
      
      console.log(`[TASK_FIX] Task updated successfully`);
      return res.status(200).json(response);
    } catch (error) {
      console.error('[TASK_FIX] Error updating task:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  console.log('[TASK_FIX] Task persistence fix routes added successfully');
}

module.exports = { addTaskEndpoints };