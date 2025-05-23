/**
 * Alternative Database Access for Task Updates
 * 
 * This module provides a separate implementation for task updates
 * to bypass issues in the existing code.
 */

const { projectTasks } = require('../shared/schema');
const { eq, and } = require('drizzle-orm');
const { db } = require('./db');

// Helper to create JSON response
const createJsonResponse = (success, data, error = null, status = 200) => ({
  success,
  data,
  error,
  status
});

// Direct database operations that bypass projectsDb
const altDb = {
  // Find task by ID or sourceId
  async findTask(projectId, taskId) {
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
      
      if (tasks.length > 0) {
        return createJsonResponse(true, tasks[0]);
      }
      
      // Try sourceId lookup
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
        return createJsonResponse(true, sourceIdTasks[0]);
      }
      
      return createJsonResponse(false, null, 'Task not found', 404);
    } catch (error) {
      console.error('Error finding task:', error);
      return createJsonResponse(false, null, error.message, 500);
    }
  },
  
  // Update task with proper column mapping
  async updateTask(projectId, taskId, data) {
    try {
      // Find the task first
      const taskResult = await this.findTask(projectId, taskId);
      
      if (!taskResult.success) {
        return taskResult;
      }
      
      const task = taskResult.data;
      const actualTaskId = task.id;
      
      // Map camelCase to snake_case for database update
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
      
      // Execute the update
      const [updatedTask] = await db.update(projectTasks)
        .set(updateData)
        .where(
          and(
            eq(projectTasks.projectId, projectId),
            eq(projectTasks.id, actualTaskId)
          )
        )
        .returning();
      
      if (!updatedTask) {
        return createJsonResponse(false, null, 'Update failed', 500);
      }
      
      // Convert to camelCase for API response
      const apiResponse = {
        id: updatedTask.id,
        projectId: updatedTask.project_id || '',
        text: updatedTask.text || '',
        stage: updatedTask.stage || 'identification',
        origin: updatedTask.origin || 'custom',
        source: updatedTask.origin || 'custom',
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
      
      return createJsonResponse(true, apiResponse);
    } catch (error) {
      console.error('Error updating task:', error);
      return createJsonResponse(false, null, error.message, 500);
    }
  }
};

module.exports = altDb;