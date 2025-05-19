/**
 * Projects database module
 * Provides centralized project storage and persistence
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import { projectTasks as projectTasksTable } from '@shared/schema';

/**
 * Validates sourceId to ensure it's either a valid UUID or null
 */
function validateSourceId(sourceId: string | null | undefined): string | null {
  if (!sourceId) return null;
  return validateUuid(sourceId) ? sourceId : null;
}

/**
 * Data directory for file-based storage
 */
// Create dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const PLANS_FILE = path.join(DATA_DIR, 'plans.json');

/**
 * Project database interface
 */
const projectsDb = {
  /**
   * Get all tasks for a project from the database
   */
  async getProjectTasks(projectId: string) {
    try {
      // Query the database for all tasks related to this project
      console.log("Getting tasks for project", projectId);
      const tasks = await db.select().from(projectTasksTable)
        .where(eq(projectTasksTable.projectId, projectId))
        .orderBy(projectTasksTable.createdAt);
      
      console.log(`Retrieved ${tasks.length} tasks for project ${projectId}`);
      if (tasks.length > 0) {
        console.log("First task sample:", tasks[0]);
      }
      
      return tasks;
    } catch (error) {
      console.error("Error getting project tasks:", error);
      return [];
    }
  },

  /**
   * Create a new task for a project
   */
  async createTask(taskData: any) {
    try {
      console.log("Creating task with data:", taskData);
      
      // Validate sourceId to prevent database errors
      const validatedSourceId = validateSourceId(taskData.sourceId);
      
      // Prepare the data for insertion
      const dataToInsert = {
        ...taskData,
        sourceId: validatedSourceId,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the task into the database
      const [task] = await db.insert(projectTasksTable)
        .values(dataToInsert)
        .returning();
      
      console.log("Task created successfully:", task.id);
      return task;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  },
  
  /**
   * Update an existing task
   */
  async updateTask(taskId: string, projectId: string, updateData: any) {
    try {
      console.log(`Updating task ${taskId} for project ${projectId}:`, updateData);
      
      // If sourceId is being updated, validate it
      if (updateData.sourceId !== undefined) {
        updateData.sourceId = validateSourceId(updateData.sourceId);
      }
      
      // Always update the updatedAt timestamp
      updateData.updatedAt = new Date();
      
      // Update the task in the database
      const [updatedTask] = await db.update(projectTasksTable)
        .set(updateData)
        .where(
          and(
            eq(projectTasksTable.id, taskId),
            eq(projectTasksTable.projectId, projectId)
          )
        )
        .returning();
      
      if (!updatedTask) {
        console.error(`Task ${taskId} not found or not updated`);
        throw new Error(`Task with ID ${taskId} not found or couldn't be updated`);
      }
      
      console.log("Task updated successfully:", updatedTask);
      return updatedTask;
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a task
   */
  async deleteTask(taskId: string, projectId: string) {
    try {
      console.log(`Deleting task ${taskId} for project ${projectId}`);
      
      // Delete the task from the database
      const [deletedTask] = await db.delete(projectTasksTable)
        .where(
          and(
            eq(projectTasksTable.id, taskId),
            eq(projectTasksTable.projectId, projectId)
          )
        )
        .returning();
      
      if (!deletedTask) {
        console.error(`Task ${taskId} not found or not deleted`);
        throw new Error(`Task with ID ${taskId} not found or couldn't be deleted`);
      }
      
      console.log("Task deleted successfully:", deletedTask.id);
      return deletedTask;
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      throw error;
    }
  }
};

export { projectsDb };