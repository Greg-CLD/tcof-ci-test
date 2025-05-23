/**
 * Task Persistence Fix Middleware
 * 
 * This module provides a direct fix for the camelCase to snake_case mapping issue
 * that's preventing task updates from persisting in the database.
 */

const { projectTasks } = require('../../shared/schema');
const { eq, and } = require('drizzle-orm');
const { db } = require('../db');

/**
 * Maps camelCase property names to snake_case database column names
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
 * Task update middleware function
 */
async function handleTaskUpdate(req, res) {
  try {
    const projectId = req.params.projectId;
    let taskId = req.params.taskId;
    
    console.log(`[TASK_FIX] Processing update for task ${taskId} in project ${projectId}`);
    
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
      console.log(`[TASK_FIX] Task not found by direct ID, trying sourceId lookup`);
      
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
        console.error(`[TASK_FIX] Task not found with ID or sourceId: ${taskId}`);
        return res.status(404).json({
          error: 'Task not found',
          message: 'No task found with the provided ID'
        });
      }
      
      // Use the actual database ID
      taskId = sourceIdTasks[0].id;
      console.log(`[TASK_FIX] Found task via sourceId lookup, using actual ID: ${taskId}`);
    }
    
    // Convert camelCase to snake_case for the database update
    const mappedData = mapCamelToSnakeCase(req.body);
    console.log(`[TASK_FIX] Mapped data for database:`, mappedData);
    
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
      console.error(`[TASK_FIX] Database update failed for task ${taskId}`);
      return res.status(500).json({
        error: 'Update failed',
        message: 'Failed to update the task in the database'
      });
    }
    
    // Convert back to camelCase for the API response
    const apiResponse = {
      id: updatedTask.id,
      projectId: updatedTask.project_id || '',
      text: updatedTask.text || '',
      stage: updatedTask.stage || 'identification',
      origin: updatedTask.origin || 'custom',
      source: updatedTask.origin || 'custom', // Normalized duplicate of origin
      sourceId: updatedTask.source_id || '',
      completed: Boolean(updatedTask.completed),
      notes: updatedTask.notes || '',
      priority: updatedTask.priority || '',
      dueDate: updatedTask.due_date || '',
      owner: updatedTask.owner || '',
      status: updatedTask.status || 'To Do',
      createdAt: updatedTask.created_at ? new Date(updatedTask.created_at).toISOString() : new Date().toISOString(),
      updatedAt: updatedTask.updated_at ? new Date(updatedTask.updated_at).toISOString() : new Date().toISOString(),
      // Additional fields
      taskType: updatedTask.task_type || '',
      factorId: updatedTask.factor_id || '',
      sortOrder: updatedTask.sort_order !== undefined ? updatedTask.sort_order : 0,
      assignedTo: updatedTask.assigned_to || '',
      taskNotes: updatedTask.task_notes || ''
    };
    
    console.log(`[TASK_FIX] Task updated successfully:`, apiResponse);
    
    // Send the response
    return res.status(200).json(apiResponse);
  } catch (error) {
    console.error(`[TASK_FIX] Error in task update:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred during task update'
    });
  }
}

// Export the middleware
module.exports = { handleTaskUpdate };