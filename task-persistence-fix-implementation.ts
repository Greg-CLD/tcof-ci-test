/**
 * Task Persistence Fix Implementation
 * 
 * This file contains the code that should be added to projectsDb.ts to fix
 * the task persistence issue. Since there are syntax errors in the main file,
 * we're providing this implementation separately for clarity.
 * 
 * The fix addresses the camelCase to snake_case conversion needed for proper
 * database interaction.
 */

import { ProjectTask } from './server/projectsDb';

/**
 * Maps camelCase property names to snake_case database column names
 * 
 * @param data The task data with camelCase properties (from application code)
 * @returns An object with snake_case property names (for database columns)
 */
function mapCamelToSnakeCase(data: Partial<ProjectTask>): Record<string, any> {
  const updateData: Record<string, any> = {};
  
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
  if (data.sourceId !== undefined) updateData.source_id = validateSourceId(data.sourceId);
  if (data.projectId !== undefined) updateData.project_id = data.projectId;
  if (data.dueDate !== undefined) updateData.due_date = data.dueDate === '' ? null : data.dueDate;
  
  // Additional fields from expanded ProjectTask interface
  if (data.taskType !== undefined) updateData.task_type = data.taskType === '' ? null : data.taskType;
  if (data.factorId !== undefined) updateData.factor_id = data.factorId === '' ? null : data.factorId;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo === '' ? null : data.assignedTo;
  if (data.taskNotes !== undefined) updateData.task_notes = data.taskNotes === '' ? null : data.taskNotes;
  
  // Handle dates
  if (data.createdAt !== undefined) {
    updateData.created_at = typeof data.createdAt === 'string' ? 
      new Date(data.createdAt) : data.createdAt;
  }
  
  // Always update the updatedAt timestamp
  updateData.updated_at = new Date();
  
  return updateData;
}

/**
 * Implementation of the fixed updateTask method
 * This is what should replace the current updateTask method in projectsDb.ts
 */
async function updateTask(taskId: string, data: Partial<ProjectTask>) {
  try {
    console.log(`Updating task ${taskId} with data:`, data);
    
    // First try to find task by sourceId
    const tasksBySourceId = await db.select()
      .from(projectTasksTable)
      .where(eq(projectTasksTable.sourceId, taskId));
    
    if (tasksBySourceId.length > 0) {
      console.log(`[TASK_LOOKUP] Found task via sourceId match`);
      return await this.updateTask(tasksBySourceId[0].id, data);
    }
    
    // Look up the task to make sure it exists before updating
    const task = await db.select()
      .from(projectTasksTable)
      .where(eq(projectTasksTable.id, taskId))
      .limit(1);
    
    if (task.length === 0) {
      console.error(`[TASK_UPDATE_ERROR] Task with ID ${taskId} not found`);
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Convert camelCase properties to snake_case database columns
    const mappedData = mapCamelToSnakeCase(data);
    
    // Check that we have valid data to update
    if (Object.keys(mappedData).length === 0) {
      console.error(`[TASK_UPDATE_ERROR] No valid update data provided for task ${taskId}`);
      throw new Error(`Cannot update task: no valid update data provided`);
    }
    
    console.log(`[TASK_UPDATE] Final update data for task ${taskId}:`, JSON.stringify(mappedData, null, 2));
    
    try {
      // Generate the SQL for logging purposes (before executing)
      const updateSQL = db.update(projectTasksTable)
        .set(mappedData)
        .where(eq(projectTasksTable.id, taskId))
        .toSQL();
      
      console.log('SQL to be executed:', updateSQL.sql);
      console.log('SQL parameters:', JSON.stringify(updateSQL.params, null, 2));
    } catch (sqlGenerationError) {
      // Log but continue - this is just for diagnostic purposes
      console.error(`[TASK_UPDATE_ERROR] Error generating SQL for task ${taskId}:`, sqlGenerationError);
    }
    
    try {
      // Update the task using Drizzle with the properly mapped data
      const [updatedTask] = await db.update(projectTasksTable)
        .set(mappedData)
        .where(eq(projectTasksTable.id, taskId))
        .returning();
      
      if (!updatedTask) {
        console.error(`[TASK_UPDATE_ERROR] No task updated for ID ${taskId}`);
        throw new Error(`Failed to update task ${taskId}: No rows affected`);
      }
      
      console.log(`[TASK_UPDATE] Successfully updated task ${taskId}`);
      
      // Verify the update actually happened
      const verifyTask = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.id, taskId))
        .limit(1);
      
      if (verifyTask.length === 0) {
        console.error(`[TASK_UPDATE_ERROR] Verification failed: Task ${taskId} not found after update`);
      } else {
        console.log(`[TASK_UPDATE] Verification success: Task ${taskId} found after update`);
        console.log(`[TASK_UPDATE] Task completed state: ${verifyTask[0].completed}`);
      }
      
      return convertDbTaskToProjectTask(updatedTask);
    } catch (updateError) {
      console.error(`[TASK_UPDATE_ERROR] Error updating task ${taskId}:`, updateError);
      console.error(`[TASK_UPDATE_ERROR] Stack trace:`, updateError instanceof Error ? updateError.stack : 'No stack available');
      throw updateError;
    }
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    throw error;
  }
}

/**
 * The createTask method also needs the camelCase to snake_case mapping
 * Here is the key part that should be updated:
 */
const createTaskWithMapping = async (taskData) => {
  // Generate a default UUID for sourceId if it would be null
  // This is necessary because the sourceId column has a NOT NULL constraint
  const validatedSourceId = validateSourceId(task.sourceId);
  const finalSourceId = validatedSourceId || uuidv4(); // Use a new UUID if source id is invalid or null
  
  // Map camelCase properties to snake_case database columns
  const insertValues = mapCamelToSnakeCase({
    id: task.id,
    projectId: task.projectId,
    text: task.text || '',
    stage: task.stage || 'identification',
    origin: task.origin || 'custom',
    sourceId: finalSourceId,
    completed: Boolean(task.completed), 
    notes: task.notes === '' ? null : task.notes,
    priority: task.priority === '' ? null : task.priority,
    dueDate: task.dueDate === '' ? null : task.dueDate,
    owner: task.owner === '' ? null : task.owner,
    status: task.status || 'To Do',
    sortOrder: task.sortOrder !== undefined ? task.sortOrder : 0
  });
  
  // Add specific values for a new task that shouldn't use updated_at from mapping
  insertValues.id = task.id;
  insertValues.created_at = new Date();
  insertValues.updated_at = new Date();
  
  // Execute the insert (existing code follows...)
};