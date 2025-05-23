/**
 * Task Persistence Fix - Direct Implementation
 * 
 * This module contains a direct implementation of the task persistence fix 
 * that can be used independently from projectsDb.ts.
 * 
 * It properly maps camelCase properties to snake_case database columns
 * when updating tasks, ensuring that task changes persist after page reload.
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

/**
 * Find a task by ID or sourceId within a project
 */
async function findTaskInProject(projectId, taskId) {
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
  
  if (tasks.length > 0) {
    return {
      task: tasks[0],
      lookupMethod: 'id'
    };
  }
  
  // Try sourceId lookup if direct ID lookup failed
  const sourceIdTasks = await db.select()
    .from(projectTasks)
    .where(
      and(
        eq(projectTasks.projectId, projectId),
        eq(projectTasks.sourceId, taskId)
      )
    )
    .limit(1);
  
  if (sourceIdTasks.length > 0) {
    return {
      task: sourceIdTasks[0],
      lookupMethod: 'sourceId'
    };
  }
  
  // Task not found
  return { task: null, lookupMethod: null };
}

/**
 * Update a task with proper camelCase to snake_case mapping
 */
async function updateTaskWithMapping(projectId, taskId, updateData) {
  try {
    // Find the task
    const { task, lookupMethod } = await findTaskInProject(projectId, taskId);
    
    if (!task) {
      console.error(`[TASK_FIX] Task not found with ID or sourceId: ${taskId} in project ${projectId}`);
      return { success: false, error: 'Task not found', status: 404 };
    }
    
    console.log(`[TASK_FIX] Found task via ${lookupMethod} lookup, ID: ${task.id}`);
    
    // Map camelCase to snake_case for the database update
    const mappedData = mapCamelToSnakeCase(updateData);
    
    // Execute the update
    const [updatedTask] = await db.update(projectTasks)
      .set(mappedData)
      .where(
        and(
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.id, task.id)
        )
      )
      .returning();
    
    if (!updatedTask) {
      console.error(`[TASK_FIX] Database update failed for task ${task.id}`);
      return { success: false, error: 'Update failed', status: 500 };
    }
    
    // Convert to API response
    const apiResponse = dbTaskToApiResponse(updatedTask);
    
    console.log(`[TASK_FIX] Task updated successfully: ${task.id}`);
    return { success: true, data: apiResponse, status: 200 };
  } catch (error) {
    console.error(`[TASK_FIX] Error updating task:`, error);
    return { success: false, error: error.message || 'Internal server error', status: 500 };
  }
}

/**
 * Set up a direct route handler for task updates
 */
function setupDirectTaskUpdateRoute(app) {
  // Add a direct task update endpoint
  app.put('/api/direct/projects/:projectId/tasks/:taskId', async (req, res) => {
    const { projectId, taskId } = req.params;
    
    console.log(`[DIRECT_TASK_UPDATE] Processing update for project=${projectId}, task=${taskId}`);
    
    // Use our direct implementation
    const result = await updateTaskWithMapping(projectId, taskId, req.body);
    
    // Return the appropriate response
    return res.status(result.status).json(result.success ? result.data : { error: result.error });
  });

  // Apply middleware to intercept normal task route
  app.put('/api/projects/:projectId/tasks/:taskId', async (req, res, next) => {
    try {
      const { projectId, taskId } = req.params;
      
      console.log(`[TASK_FIX_MIDDLEWARE] Intercepting task update request to ${req.path}`);
      
      // Use our direct implementation
      const result = await updateTaskWithMapping(projectId, taskId, req.body);
      
      if (result.success) {
        // If successful, send the response directly
        return res.status(result.status).json(result.data);
      } else {
        // Let the normal route handler deal with errors
        return next();
      }
    } catch (error) {
      console.error('[TASK_FIX_MIDDLEWARE] Error:', error);
      return next();
    }
  });
  
  console.log('[TASK_FIX] Direct task update routes have been set up');
}

module.exports = {
  mapCamelToSnakeCase,
  dbTaskToApiResponse,
  findTaskInProject,
  updateTaskWithMapping,
  setupDirectTaskUpdateRoute
};