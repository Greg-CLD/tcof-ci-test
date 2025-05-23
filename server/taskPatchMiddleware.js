/**
 * Task Patch Middleware
 * 
 * This module provides a middleware that intercepts task update requests
 * and applies the proper camelCase to snake_case mapping for database operations.
 */

const { projectTasks } = require('../shared/schema');
const { eq, and } = require('drizzle-orm');
const { db } = require('./db');

/**
 * Maps camelCase property names to snake_case database column names
 * 
 * @param {Object} data The task data with camelCase properties
 * @returns {Object} An object with snake_case property names for database
 */
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
 * Converts database snake_case to camelCase for API responses
 * 
 * @param {Object} dbTask Database task object
 * @returns {Object} API response with camelCase properties
 */
function convertDbToApiTask(dbTask) {
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

/**
 * Task update middleware
 * 
 * This middleware intercepts PUT requests to /api/projects/:projectId/tasks/:taskId
 * and applies the proper camelCase to snake_case mapping for database operations.
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object 
 * @param {Function} next Express next function
 */
async function taskUpdateMiddleware(req, res, next) {
  // Only process PUT requests to the task update endpoint
  if (req.method !== 'PUT' || !req.path.match(/\/api\/projects\/[^\/]+\/tasks\/[^\/]+$/)) {
    return next();
  }
  
  console.log('[TASK_PATCH] Intercepting task update request:', req.path);
  
  try {
    const projectId = req.params.projectId;
    let taskId = req.params.taskId;
    
    console.log(`[TASK_PATCH] Processing task update for project=${projectId}, task=${taskId}`);
    console.log(`[TASK_PATCH] Update data:`, req.body);
    
    // Try direct ID lookup first
    const tasks = await db.select()
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.id, taskId)
        )
      )
      .limit(1);
    
    // If no task found, try source_id lookup
    if (tasks.length === 0) {
      console.log(`[TASK_PATCH] Task not found by direct ID, trying sourceId lookup`);
      
      const sourceIdTasks = await db.select()
        .from(projectTasks)
        .where(
          and(
            eq(projectTasks.projectId, projectId),
            eq(projectTasks.sourceId, taskId)
          )
        )
        .limit(1);
      
      if (sourceIdTasks.length === 0) {
        console.error(`[TASK_PATCH] Task not found with ID or sourceId: ${taskId}`);
        return res.status(404).json({
          error: 'Task not found',
          message: 'No task found with the provided ID'
        });
      }
      
      // Use the actual database ID
      taskId = sourceIdTasks[0].id;
      console.log(`[TASK_PATCH] Found task via sourceId lookup, using actual ID: ${taskId}`);
    }
    
    // Convert camelCase to snake_case for the database update
    const mappedData = mapCamelToSnakeCase(req.body);
    console.log(`[TASK_PATCH] Mapped data for database:`, mappedData);
    
    // Execute the update with the proper mapping
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
      console.error(`[TASK_PATCH] Database update failed for task ${taskId}`);
      return res.status(500).json({
        error: 'Update failed',
        message: 'Failed to update the task in the database'
      });
    }
    
    // Convert back to camelCase for the API response
    const apiResponse = convertDbToApiTask(updatedTask);
    console.log(`[TASK_PATCH] Task updated successfully:`, apiResponse);
    
    // Send the response and end the request
    return res.status(200).json(apiResponse);
  } catch (error) {
    console.error(`[TASK_PATCH] Error in task update middleware:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred during task update'
    });
  }
}

module.exports = { taskUpdateMiddleware, mapCamelToSnakeCase };