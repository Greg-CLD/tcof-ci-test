/**
 * Direct Task Persistence Patch
 * 
 * This module implements a direct fix for the task persistence issues
 * by adding a route that completely overrides the existing route.
 */

const { projectTasks } = require('../shared/schema');
const { eq, and } = require('drizzle-orm');
const { db } = require('./db');

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
 * Apply the direct fix to the Express app
 */
function applyDirectPatch(app) {
  console.log('[DIRECT_PATCH] Applying direct task persistence patch');
  
  // Intercept task update requests
  app.use('/api/projects/:projectId/tasks/:taskId', async (req, res, next) => {
    // Only intercept PUT requests
    if (req.method !== 'PUT') {
      return next();
    }
    
    try {
      console.log('[DIRECT_PATCH] Intercepting task update request:', req.path);
      
      const projectId = req.params.projectId;
      let taskId = req.params.taskId;
      
      // Try to find task by ID first
      const tasks = await db.select()
        .from(projectTasks)
        .where(
          and(
            eq(projectTasks.projectId, projectId),
            eq(projectTasks.id, taskId)
          )
        )
        .limit(1);
      
      // If not found, try by sourceId
      if (tasks.length === 0) {
        console.log('[DIRECT_PATCH] Task not found by ID, trying sourceId lookup');
        
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
          console.log('[DIRECT_PATCH] Task not found with either ID or sourceId:', taskId);
          return res.status(404).json({ 
            error: 'Task not found',
            message: 'No task found with the provided ID or sourceId'
          });
        }
        
        // Use actual DB ID
        taskId = sourceIdTasks[0].id;
        console.log('[DIRECT_PATCH] Found task via sourceId, using actual ID:', taskId);
      }
      
      // Map camelCase to snake_case
      const mappedData = mapCamelToSnakeCase(req.body);
      console.log('[DIRECT_PATCH] Mapped data for database:', mappedData);
      
      // Update the task
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
        console.error('[DIRECT_PATCH] Failed to update task:', taskId);
        return res.status(500).json({ 
          error: 'Update failed',
          message: 'Failed to update the task in the database'
        });
      }
      
      // Convert to API response format
      const apiResponse = {
        id: updatedTask.id,
        projectId: updatedTask.project_id || '',
        text: updatedTask.text || '',
        stage: updatedTask.stage || 'identification',
        origin: updatedTask.origin || 'custom',
        source: updatedTask.origin || 'custom', // For compatibility
        sourceId: updatedTask.source_id || '',
        completed: Boolean(updatedTask.completed),
        notes: updatedTask.notes || '',
        priority: updatedTask.priority || '',
        dueDate: updatedTask.due_date || '',
        owner: updatedTask.owner || '',
        status: updatedTask.status || 'To Do',
        createdAt: updatedTask.created_at ? new Date(updatedTask.created_at).toISOString() : new Date().toISOString(),
        updatedAt: updatedTask.updated_at ? new Date(updatedTask.updated_at).toISOString() : new Date().toISOString(),
        taskType: updatedTask.task_type || '',
        factorId: updatedTask.factor_id || '',
        sortOrder: updatedTask.sort_order !== undefined ? updatedTask.sort_order : 0,
        assignedTo: updatedTask.assigned_to || '',
        taskNotes: updatedTask.task_notes || ''
      };
      
      console.log('[DIRECT_PATCH] Task updated successfully:', taskId);
      return res.status(200).json(apiResponse);
    } catch (error) {
      console.error('[DIRECT_PATCH] Error processing task update:', error);
      return next(); // Let normal error handler deal with it
    }
  });
  
  console.log('[DIRECT_PATCH] Direct task persistence patch applied successfully');
}

module.exports = { applyDirectPatch };