/**
 * Alternative Task Route Implementation
 * 
 * This module provides a clean implementation of the task update route
 * that properly handles camelCase to snake_case conversion for database operations.
 */

const { mapCamelToSnakeCase, dbTaskToApiResponse } = require('./camelToSnake');
const { projectTasksTable } = require('../shared/schema');
const { eq } = require('drizzle-orm');
const { db } = require('./db');

/**
 * Sets up the alternative task route handler on the Express app
 * 
 * @param {Express} app The Express application instance
 */
function setupTaskRoute(app) {
  // Route handler for updating a task
  app.put('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const updateData = req.body;
      
      console.log(`[TASK_UPDATE_REQUEST] PUT /api/projects/${projectId}/tasks/${taskId}`, JSON.stringify(updateData, null, 2));
      
      // Get the existing task to verify it exists and belongs to the project
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(
          eq(projectTasksTable.id, taskId)
        )
        .limit(1);
      
      if (tasks.length === 0) {
        console.log(`[TASK_UPDATE_ERROR] Task not found: ${taskId}`);
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const task = tasks[0];
      
      // Verify the task belongs to the specified project
      if (task.project_id !== projectId) {
        console.log(`[TASK_UPDATE_ERROR] Task ${taskId} does not belong to project ${projectId}`);
        return res.status(403).json({ error: 'Task does not belong to this project' });
      }
      
      // Map camelCase properties from the request to snake_case database columns
      const dbUpdateData = mapCamelToSnakeCase(updateData);
      
      // Log the mapped update data
      console.log(`[TASK_UPDATE] Final update data for task ${taskId}:`, JSON.stringify(dbUpdateData, null, 2));
      
      // Perform the update
      const updatedTasks = await db.update(projectTasksTable)
        .set(dbUpdateData)
        .where(eq(projectTasksTable.id, taskId))
        .returning();
      
      if (updatedTasks.length === 0) {
        console.log(`[TASK_UPDATE_ERROR] Failed to update task ${taskId}`);
        return res.status(500).json({ error: 'Failed to update task' });
      }
      
      // Convert the updated task back to the API response format
      const updatedTask = dbTaskToApiResponse(updatedTasks[0]);
      
      console.log(`[TASK_UPDATE_SUCCESS] Task ${taskId} updated successfully`);
      
      // Return the updated task
      return res.json(updatedTask);
    } catch (error) {
      console.error('[TASK_UPDATE_ERROR] Error updating task:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  console.log('[ROUTES] Alternative task route handler registered');
}

module.exports = {
  setupTaskRoute
};