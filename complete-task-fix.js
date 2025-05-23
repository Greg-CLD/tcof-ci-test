/**
 * Complete Task Persistence Fix
 * 
 * This script patches the API endpoint for task completion to ensure proper mapping 
 * between camelCase properties and snake_case database columns.
 */

const express = require('express');
const { projectTasksTable } = require('./shared/schema');
const { eq } = require('drizzle-orm');
const { db } = require('./server/db');

// Apply the task persistence patch to the Express app
module.exports = function applyTaskPersistencePatch(app) {
  // Intercept the PUT request to /api/projects/:projectId/tasks/:taskId
  app.put('/api/projects/:projectId/tasks/:taskId', async (req, res, next) => {
    try {
      console.log(`[TASK_PERSISTENCE_FIX] Handling task update for project=${req.params.projectId}, task=${req.params.taskId}`);
      console.log(`[TASK_PERSISTENCE_FIX] Task update data:`, req.body);
      
      // Lookup task to ensure it exists before trying to update
      const taskId = req.params.taskId;
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.id, taskId))
        .limit(1);
      
      if (tasks.length === 0) {
        // Try sourceId lookup if direct ID lookup failed
        const sourceIdTasks = await db.select()
          .from(projectTasksTable)
          .where(eq(projectTasksTable.sourceId, taskId))
          .limit(1);
        
        if (sourceIdTasks.length === 0) {
          console.error(`[TASK_PERSISTENCE_FIX] Task not found: id=${taskId}`);
          return res.status(404).json({ 
            error: 'Task not found',
            taskId: taskId,
            message: 'No task found with the specified ID'
          });
        }
        
        // Use the actual database ID for the update
        taskId = sourceIdTasks[0].id;
        console.log(`[TASK_PERSISTENCE_FIX] Found task via sourceId lookup, actual ID: ${taskId}`);
      }
      
      // Prepare data for update with proper snake_case mapping
      const updateData = mapCamelToSnakeCase(req.body);
      
      // Log the exact data being sent to the database
      console.log(`[TASK_PERSISTENCE_FIX] Mapped data for database update:`, updateData);
      
      // Execute the update with proper data mapping
      const [updatedTask] = await db.update(projectTasksTable)
        .set(updateData)
        .where(eq(projectTasksTable.id, taskId))
        .returning();
      
      if (!updatedTask) {
        console.error(`[TASK_PERSISTENCE_FIX] Update operation returned no results for task ${taskId}`);
        return res.status(500).json({ 
          error: 'Update failed',
          message: 'The database update operation did not return any results'
        });
      }
      
      // Convert snake_case database fields back to camelCase for API response
      const apiResponse = convertDbTaskToApiResponse(updatedTask);
      console.log(`[TASK_PERSISTENCE_FIX] Task updated successfully:`, apiResponse);
      
      // Return the updated task to the client
      return res.status(200).json(apiResponse);
    } catch (error) {
      console.error(`[TASK_PERSISTENCE_FIX] Error updating task:`, error);
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message || 'An unexpected error occurred' 
      });
    }
  });
  
  console.log('[TASK_PERSISTENCE_FIX] Task persistence patch applied successfully');
};

/**
 * Maps camelCase property names to snake_case database column names
 * 
 * @param {Object} data The task data with camelCase properties (from application code)
 * @returns {Object} An object with snake_case property names (for database columns)
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
  
  // Additional fields from expanded ProjectTask interface
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
 * Converts a database task object with snake_case columns to a camelCase API response
 * 
 * @param {Object} dbTask Task object from database with snake_case columns
 * @returns {Object} API response object with camelCase properties
 */
function convertDbTaskToApiResponse(dbTask) {
  return {
    id: dbTask.id,
    projectId: dbTask.project_id || '',
    text: dbTask.text || '',
    stage: dbTask.stage || 'identification',
    origin: dbTask.origin || 'custom',
    source: dbTask.origin || 'custom', // Normalized duplicate of origin
    sourceId: dbTask.source_id || '',
    completed: Boolean(dbTask.completed),
    notes: dbTask.notes || '',
    priority: dbTask.priority || '',
    dueDate: dbTask.due_date || '',
    owner: dbTask.owner || '',
    status: dbTask.status || 'To Do',
    createdAt: dbTask.created_at ? new Date(dbTask.created_at).toISOString() : new Date().toISOString(),
    updatedAt: dbTask.updated_at ? new Date(dbTask.updated_at).toISOString() : new Date().toISOString(),
    // Additional fields
    taskType: dbTask.task_type || '',
    factorId: dbTask.factor_id || '',
    sortOrder: dbTask.sort_order !== undefined ? dbTask.sort_order : 0,
    assignedTo: dbTask.assigned_to || '',
    taskNotes: dbTask.task_notes || ''
  };
}