/**
 * Success Factor Clone Utility
 * 
 * This module ensures that all canonical Success Factors are properly
 * added to the project_tasks table when a project is created.
 */
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { projectTasks } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import * as factorsDb from './factorsDb';

interface FactorTask {
  id: string;
  title: string;
  description: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

/**
 * Ensures all success factors are properly cloned to project_tasks table
 * 
 * @param projectId The project ID to clone tasks for
 * @returns Promise<number> Number of tasks created
 */
export async function cloneSuccessFactorsToProject(projectId: string): Promise<number> {
  try {
    // Get all success factors
    const successFactors = await factorsDb.getFactors();
    if (!successFactors || successFactors.length === 0) {
      console.error(`No success factors found to clone to project ${projectId}`);
      return 0;
    }
    
    console.log(`Cloning ${successFactors.length} success factors to project ${projectId}`);
    let createdCount = 0;
    
    // For each success factor, create tasks for each stage
    for (const factor of successFactors) {
      // For each stage (identification, definition, delivery, closure)
      for (const stage of Object.keys(factor.tasks)) {
        const normalizedStage = stage.toLowerCase();
        const tasks = factor.tasks[stage as keyof typeof factor.tasks];
        
        // For each task in this stage
        for (const taskText of tasks) {
          if (!taskText || taskText.trim() === '') continue;
          
          // Check if task already exists by source_id
          const existingTasks = await db.select()
            .from(projectTasks)
            .where(
              and(
                eq(projectTasks.projectId, projectId),
                eq(projectTasks.sourceId, factor.id),
                eq(projectTasks.stage, normalizedStage),
                eq(projectTasks.text, taskText)
              )
            )
            .limit(1);
          
          // Skip if task already exists
          if (existingTasks.length > 0) {
            console.log(`Task already exists for project ${projectId}, factor ${factor.id}, stage ${normalizedStage}, text "${taskText.substring(0, 20)}..."`);
            continue;
          }
          
          // Create the task
          const newTask = {
            id: uuidv4(),
            projectId: projectId,
            text: taskText,
            stage: normalizedStage,
            origin: 'factor',
            source: 'factor', // Duplicate of origin for consistent filtering
            sourceId: factor.id,
            completed: false,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await db.insert(projectTasks).values(newTask);
          createdCount++;
        }
      }
    }
    
    console.log(`Successfully created ${createdCount} Success Factor tasks for project ${projectId}`);
    return createdCount;
  } catch (error) {
    console.error(`Error cloning success factors to project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Back-fill script to add missing Success Factor tasks to existing projects
 * 
 * @returns Promise<{projectCount: number, taskCount: number}>
 */
export async function backfillSuccessFactorsForAllProjects(): Promise<{projectCount: number, taskCount: number}> {
  try {
    // Get all projects
    const projects = await db.select({ id: projectTasks.projectId })
      .from(projectTasks)
      .groupBy(projectTasks.projectId);
    
    console.log(`Backfilling Success Factor tasks for ${projects.length} projects`);
    
    let totalTaskCount = 0;
    let updatedProjectCount = 0;
    
    // For each project, ensure all success factors are cloned
    for (const project of projects) {
      try {
        const taskCount = await cloneSuccessFactorsToProject(project.id);
        if (taskCount > 0) {
          updatedProjectCount++;
          totalTaskCount += taskCount;
        }
      } catch (err) {
        console.error(`Error backfilling project ${project.id}:`, err);
        // Continue with next project
      }
    }
    
    console.log(`Backfill complete: Added ${totalTaskCount} tasks to ${updatedProjectCount} projects`);
    return {
      projectCount: updatedProjectCount,
      taskCount: totalTaskCount
    };
  } catch (error) {
    console.error('Error in backfill operation:', error);
    throw error;
  }
}