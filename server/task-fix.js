/**
 * Task Persistence Fix
 * 
 * This module provides a corrected implementation of the task update route
 * that properly maps between camelCase properties and snake_case database columns.
 * 
 * It's designed to be a drop-in replacement for the problematic code in projectsDb.ts
 */

import express from 'express';
import { db } from './db.js';
import { projectTasks } from './schema.js';
import { eq } from 'drizzle-orm';

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
 * Setup the task routes on the provided Express app
 */
export function setupTaskRoute(app) {
  // Task update endpoint
  app.put('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const updateData = req.body;
      
      console.log(`[TASK-FIX] Processing update for project=${projectId}, task=${taskId}`);
      
      // Try to find task by ID first
      const taskById = await db.query.projectTasks.findFirst({
        where: (tasks, { eq, and }) => and(
          eq(tasks.project_id, projectId),
          eq(tasks.id, taskId)
        )
      });
      
      // If not found by ID, try by sourceId
      let task = taskById;
      let lookupMethod = 'id';
      
      if (!task) {
        console.log(`[TASK-FIX] Task not found by ID, trying sourceId lookup`);
        
        const taskBySourceId = await db.query.projectTasks.findFirst({
          where: (tasks, { eq, and }) => and(
            eq(tasks.project_id, projectId),
            eq(tasks.source_id, taskId)
          )
        });
        
        if (taskBySourceId) {
          task = taskBySourceId;
          lookupMethod = 'sourceId';
        }
      }
      
      if (!task) {
        console.log(`[TASK-FIX] Task not found with ID or sourceId: ${taskId}`);
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const actualTaskId = task.id;
      console.log(`[TASK-FIX] Found task via ${lookupMethod}, actual ID: ${actualTaskId}`);
      
      // Map camelCase properties to snake_case
      const mappedData = mapCamelToSnakeCase(updateData);
      
      // Execute the update using Drizzle ORM
      const [updatedTask] = await db
        .update(projectTasks)
        .set(mappedData)
        .where(eq(projectTasks.id, actualTaskId))
        .returning();
      
      if (!updatedTask) {
        console.error(`[TASK-FIX] Update failed for task ${actualTaskId}`);
        return res.status(500).json({ error: 'Update failed' });
      }
      
      // Determine what ID to return in the response
      let responseId = updatedTask.id;
      
      // For canonical success factor tasks, use sourceId as the returned ID
      if (updatedTask.source_id && 
          (updatedTask.origin === 'success-factor' || updatedTask.origin === 'factor') && 
          !updatedTask.id.startsWith('custom-')) {
        console.log(`[TASK-FIX] Using sourceId for canonical task: ${updatedTask.source_id}`);
        responseId = updatedTask.source_id;
      } else if (lookupMethod === 'sourceId') {
        // If we found the task by sourceId, return that as the ID for consistency
        responseId = taskId;
      }
      
      const apiResponse = dbTaskToApiResponse(updatedTask);
      
      // Ensure the ID in the response matches what the client expects
      apiResponse.id = responseId;
      
      console.log(`[TASK-FIX] Task updated successfully: ${actualTaskId}, response ID: ${responseId}`);
      
      return res.status(200).json(apiResponse);
    } catch (error) {
      console.error(`[TASK-FIX] Error:`, error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });
  
  console.log('[TASK-FIX] Task persistence fix routes initialized');
}