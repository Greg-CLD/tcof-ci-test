/**
 * Task Persistence Fix Patch
 * 
 * This module provides a direct patch to fix the task persistence issue
 * by adding a proper mechanism to map camelCase properties to snake_case
 * database columns.
 */

const { projectTasks } = require('../shared/schema');
const { eq, and } = require('drizzle-orm');
const { db } = require('./db');

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
 * Apply the task persistence fix to Express app
 */
function applyTaskPersistencePatch(app) {
  console.log('[TASK_PERSISTENCE_PATCH] Applying task persistence fix');
  
  // Intercept the task update endpoint
  app.put('/api/projects/:projectId/tasks/:taskId', async (req, res, next) => {
    // Get request parameters
    const projectId = req.params.projectId;
    let taskId = req.params.taskId;
    
    console.log(`[TASK_PERSISTENCE_PATCH] Intercepting task update: project=${projectId}, task=${taskId}`);
    
    try {
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
      
      // If no task found by direct ID, try sourceId lookup
      if (tasks.length === 0) {
        console.log(`[TASK_PERSISTENCE_PATCH] No task found by direct ID, trying sourceId lookup`);
        
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
          console.log(`[TASK_PERSISTENCE_PATCH] Task not found with either ID or sourceId`);
          return next(); // Let the normal route handler deal with 404
        }
        
        // Use the actual database ID for the update
        taskId = sourceIdTasks[0].id;
        console.log(`[TASK_PERSISTENCE_PATCH] Found task via sourceId, actual ID: ${taskId}`);
      }
      
      // Map camelCase to snake_case for database update
      const mappedData = mapCamelToSnakeCase(req.body);
      console.log(`[TASK_PERSISTENCE_PATCH] Mapped update data:`, mappedData);
      
      // Execute the update with proper column mapping
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
        console.error(`[TASK_PERSISTENCE_PATCH] Update failed for task ${taskId}`);
        return next(); // Let the normal route handler deal with error
      }
      
      // Convert back to camelCase for API response
      const apiResponse = {
        id: updatedTask.id,
        projectId: updatedTask.project_id || '',
        text: updatedTask.text || '',
        stage: updatedTask.stage || 'identification',
        origin: updatedTask.origin || 'custom',
        source: updatedTask.origin || 'custom', // Normalized duplicate
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
      
      console.log(`[TASK_PERSISTENCE_PATCH] Task updated successfully`);
      
      // Return the response directly
      return res.status(200).json(apiResponse);
    } catch (error) {
      console.error(`[TASK_PERSISTENCE_PATCH] Error:`, error);
      return next(); // Pass to normal route handler for error
    }
  });
  
  console.log('[TASK_PERSISTENCE_PATCH] Task persistence patch applied successfully');
}

module.exports = { applyTaskPersistencePatch };