/**
 * Success Factor Task Mapping Fix
 * 
 * This module specifically addresses the camelCase to snake_case mapping issue
 * that's preventing successful task persistence in the database.
 */

const { projectTasksTable } = require('./shared/schema');
const { eq } = require('drizzle-orm');
const { db } = require('./server/db');

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
 * Directly updates a task in the database with proper property mapping
 * This function bypasses the broken updateTask method in projectsDb.ts
 * 
 * @param {string} taskId ID of the task to update
 * @param {Object} data Task data with camelCase properties
 * @returns {Promise<Object|null>} Updated task or null if update failed
 */
async function updateTaskDirectly(taskId, data) {
  try {
    console.log(`[FIX] Updating task ${taskId} directly with mapped data`);
    
    // Convert camelCase properties to snake_case database columns
    const mappedData = mapCamelToSnakeCase(data);
    
    console.log(`[FIX] Mapped data:`, mappedData);
    
    // Execute the update
    const [updatedTask] = await db.update(projectTasksTable)
      .set(mappedData)
      .where(eq(projectTasksTable.id, taskId))
      .returning();
    
    return updatedTask;
  } catch (error) {
    console.error(`[FIX_ERROR] Failed to update task ${taskId} directly:`, error);
    return null;
  }
}

/**
 * Lookup a task by sourceId in a specific project
 * 
 * @param {string} projectId The project ID
 * @param {string} sourceId The source ID to look for
 * @returns {Promise<Object|null>} Task object or null if not found
 */
async function findTaskBySourceId(projectId, sourceId) {
  try {
    console.log(`[FIX] Looking up task by sourceId: ${sourceId} in project: ${projectId}`);
    
    const tasks = await db.select()
      .from(projectTasksTable)
      .where(
        eq(projectTasksTable.projectId, projectId),
        eq(projectTasksTable.sourceId, sourceId)
      )
      .limit(1);
    
    if (tasks.length > 0) {
      console.log(`[FIX] Found task with ID: ${tasks[0].id}`);
      return tasks[0];
    }
    
    console.log(`[FIX] No task found with sourceId: ${sourceId} in project: ${projectId}`);
    return null;
  } catch (error) {
    console.error(`[FIX_ERROR] Failed to find task by sourceId ${sourceId}:`, error);
    return null;
  }
}

// Export the functions
module.exports = {
  mapCamelToSnakeCase,
  updateTaskDirectly,
  findTaskBySourceId
};