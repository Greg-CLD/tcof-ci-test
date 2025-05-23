/**
 * Alternative Task Update Implementation
 * 
 * This module provides a separate implementation for task updates
 * that bypasses the problematic projectsDb.ts file.
 */

const { projectTasks: projectTasksTable } = require('../shared/schema');
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
 * Set up a direct middleware for the task update endpoint
 */
function setupTaskRoute(app) {
  // Task update handler
  const taskUpdateHandler = async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      
      console.log(`[ALT_TASK_UPDATE] Processing update for project=${projectId}, task=${taskId}`);
      
      // Try to find task by ID first
      let tasks = await db.select()
        .from(projectTasksTable)
        .where(
          and(
            eq(projectTasksTable.projectId, projectId),
            eq(projectTasksTable.id, taskId)
          )
        )
        .limit(1);
      
      // If not found by ID, try by sourceId
      if (tasks.length === 0) {
        console.log(`[ALT_TASK_UPDATE] Task not found by ID, trying sourceId lookup`);
        
        tasks = await db.select()
          .from(projectTasksTable)
          .where(
            and(
              eq(projectTasksTable.projectId, projectId),
              eq(projectTasksTable.sourceId, taskId)
            )
          )
          .limit(1);
        
        if (tasks.length === 0) {
          console.log(`[ALT_TASK_UPDATE] Task not found with ID or sourceId: ${taskId}`);
          return res.status(404).json({ error: 'Task not found' });
        }
      }
      
      const task = tasks[0];
      const actualTaskId = task.id;
      const lookupMethod = task.id === taskId ? 'id' : 'sourceId';
      
      console.log(`[ALT_TASK_UPDATE] Found task via ${lookupMethod}, actual ID: ${actualTaskId}`);
      
      // Map camelCase to snake_case for database update
      const mappedData = mapCamelToSnakeCase(req.body);
      console.log(`[ALT_TASK_UPDATE] Mapped update data:`, mappedData);
      
      // Execute the update
      const [updatedTask] = await db.update(projectTasksTable)
        .set(mappedData)
        .where(
          and(
            eq(projectTasksTable.projectId, projectId),
            eq(projectTasksTable.id, actualTaskId)
          )
        )
        .returning();
      
      if (!updatedTask) {
        console.error(`[ALT_TASK_UPDATE] Update failed for task ${actualTaskId}`);
        return res.status(500).json({ error: 'Update failed' });
      }
      
      // Convert to API response format
      let responseId = updatedTask.id;
      
      // For canonical success factor tasks, use sourceId as the returned ID
      if (updatedTask.source_id && 
         (updatedTask.origin === 'success-factor' || updatedTask.origin === 'factor') && 
         !updatedTask.id.startsWith('custom-')) {
        console.log(`[ALT_TASK_UPDATE] Using sourceId for canonical task: ${updatedTask.source_id}`);
        responseId = updatedTask.source_id;
      } else if (lookupMethod === 'sourceId') {
        // If we found the task by sourceId, return that as the ID for consistency
        responseId = taskId;
      }
      
      const apiResponse = dbTaskToApiResponse(updatedTask);
      
      // Ensure the ID in the response matches what the client expects
      apiResponse.id = responseId;
      
      console.log(`[ALT_TASK_UPDATE] Task updated successfully: ${actualTaskId}, response ID: ${responseId}`);
      return res.status(200).json(apiResponse);
    } catch (error) {
      console.error(`[ALT_TASK_UPDATE] Error:`, error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  // Setup the route to override the default one
  app.put('/api/projects/:projectId/tasks/:taskId', taskUpdateHandler);
  
  // Add a test endpoint
  app.get('/api/task-fix-status', (req, res) => {
    res.status(200).json({
      status: 'active',
      message: 'Alternative task route is active'
    });
  });
  
  console.log('[ALT_TASK_ROUTE] Alternative task route has been set up');
}

module.exports = { setupTaskRoute };