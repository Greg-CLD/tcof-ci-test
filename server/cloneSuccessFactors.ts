/**
 * Success Factors Clone Utility
 * 
 * This module provides functions to:
 * 1. Clone all canonical Success Factor tasks into a project
 * 2. Ensure every project has all Success Factor tasks
 * 3. Fix missing Success Factor tasks in existing projects
 */

import { db, sql } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { projectTasks } from '../shared/schema';

const DEBUG_CLONE = process.env.DEBUG_TASKS === 'true';

// Define Success Factor stages
const VALID_STAGES = ['identification', 'definition', 'delivery', 'closure'];

// Cache for Success Factor definitions to avoid repeated DB lookups
let cachedFactors: any[] = [];

// Import additional schema elements
import { successFactors, successFactorTasks } from '../shared/schema';

/**
 * Get all canonical Success Factors from the database
 * 
 * @returns Array of Success Factors
 */
export async function getAllSuccessFactors() {
  if (cachedFactors.length > 0) {
    return cachedFactors;
  }

  try {
    // Query all Success Factors directly using SQL to avoid column issues
    const factors = await db.select({
      id: successFactors.id,
      title: successFactors.title,
      description: successFactors.description
    }).from(successFactors);
    
    if (DEBUG_CLONE) {
      console.log(`[SUCCESS_FACTOR_CLONE] Found ${factors.length} canonical Success Factors`);
    }
    
    // If no factors found and we're in development, create default ones
    if (factors.length === 0) {
      // Return hardcoded canonical success factors for development
      // This ensures the system works even without database entries
      return [
        { id: '2f565bf9-70c7-5c41-93e7-c6c4cde32312', title: 'Be Ready to Adapt', description: 'Adapt as new information comes to light' },
        { id: '70befcd2-051d-59a0-82ca-37d84aabcc4d', title: 'Find a Leader', description: 'Ensure there is clear accountability' },
        { id: '9e51a3b6-0679-5d95-a48f-56fece3b35ef', title: 'Have a Plan', description: 'Create a structured approach' }
        // Other success factors would be added here
      ];
    }
    
    cachedFactors = factors;
    return factors;
  } catch (error) {
    console.error('[SUCCESS_FACTOR_CLONE] Error fetching Success Factors:', error);
    // Return minimal hardcoded set for development
    return [
      { id: '2f565bf9-70c7-5c41-93e7-c6c4cde32312', title: 'Be Ready to Adapt', description: 'Adapt as new information comes to light' },
      { id: '70befcd2-051d-59a0-82ca-37d84aabcc4d', title: 'Find a Leader', description: 'Ensure there is clear accountability' },
      { id: '9e51a3b6-0679-5d95-a48f-56fece3b35ef', title: 'Have a Plan', description: 'Create a structured approach' }
    ];
  }
}

/**
 * Get all tasks for a specific Success Factor across all stages
 * 
 * @param factorId The Success Factor ID
 * @returns Array of tasks for the Success Factor
 */
export async function getSuccessFactorTasks(factorId: string) {
  try {
    // Query tasks for the Success Factor from the database
    const tasks = await db.query.successFactorTasks.findMany({
      where: (sfTasks, { eq }) => eq(sfTasks.factorId, factorId)
    });
    
    if (DEBUG_CLONE) {
      console.log(`[SUCCESS_FACTOR_CLONE] Found ${tasks.length} tasks for Success Factor ${factorId}`);
    }
    
    return tasks;
  } catch (error) {
    console.error(`[SUCCESS_FACTOR_CLONE] Error fetching tasks for Success Factor ${factorId}:`, error);
    return [];
  }
}

/**
 * Clone Success Factor tasks into a project
 * 
 * @param projectId The project ID to clone tasks into
 * @param factorId The Success Factor ID to clone tasks from
 * @returns Number of tasks cloned
 */
export async function cloneSuccessFactorTasks(projectId: string, factorId: string) {
  try {
    // Get tasks for the Success Factor
    const sfTasks = await getSuccessFactorTasks(factorId);
    
    if (sfTasks.length === 0) {
      if (DEBUG_CLONE) {
        console.log(`[SUCCESS_FACTOR_CLONE] No tasks found for Success Factor ${factorId}`);
      }
      return 0;
    }
    
    // Track how many tasks are cloned
    let clonedCount = 0;
    
    // Clone each task that doesn't already exist - process one stage at a time
    for (const sfTask of sfTasks) {
      const stage = sfTask.stage?.toLowerCase() || 'identification';
      
      // Skip if stage is not valid
      if (!VALID_STAGES.includes(stage)) {
        if (DEBUG_CLONE) {
          console.log(`[SUCCESS_FACTOR_CLONE] Skipping task with invalid stage: ${stage}`);
        }
        continue;
      }
      
      // CRITICAL FIX: Check if a task with this exact source ID and stage already exists
      // This uses a direct database query to ensure we don't create duplicates
      const existingTasksInStage = await db.query.projectTasks.findMany({
        where: (tasks, { and, eq }) => and(
          eq(tasks.projectId, projectId),
          eq(tasks.origin, 'factor'),
          eq(tasks.sourceId, factorId),
          eq(tasks.stage, stage)
        )
      });
      
      // If any task already exists in this specific stage, skip creating another one
      if (existingTasksInStage.length > 0) {
        if (DEBUG_CLONE) {
          console.log(`[SUCCESS_FACTOR_CLONE] Task already exists for Success Factor ${factorId} in stage ${stage} (count: ${existingTasksInStage.length})`);
        }
        continue;
      }
      
      // Create the task in the project with proper field mappings
      await db.insert(projectTasks).values({
        id: uuidv4(),
        projectId: projectId,
        text: sfTask.text,
        completed: false,
        origin: 'factor',
        sourceId: factorId,
        stage: stage,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: null,
        priority: null,
        dueDate: null,
        owner: null,
        status: 'pending'
      });
      
      clonedCount++;
      
      if (DEBUG_CLONE) {
        console.log(`[SUCCESS_FACTOR_CLONE] Cloned task for Success Factor ${factorId} in stage ${stage}`);
      }
    }
    
    return clonedCount;
  } catch (error) {
    console.error(`[SUCCESS_FACTOR_CLONE] Error cloning tasks for Success Factor ${factorId}:`, error);
    return 0;
  }
}

/**
 * Clone all Success Factor tasks into a project
 * 
 * @param projectId The project ID to clone tasks into
 * @returns Number of tasks cloned
 */
export async function cloneAllSuccessFactorTasks(projectId: string) {
  try {
    // Get all Success Factors
    const factors = await getAllSuccessFactors();
    
    if (factors.length === 0) {
      console.error('[SUCCESS_FACTOR_CLONE] No Success Factors found in the database');
      return 0;
    }
    
    // Track how many tasks are cloned
    let totalCloned = 0;
    
    // Clone tasks for each Success Factor
    for (const factor of factors) {
      const clonedCount = await cloneSuccessFactorTasks(projectId, factor.id);
      totalCloned += clonedCount;
    }
    
    if (DEBUG_CLONE) {
      console.log(`[SUCCESS_FACTOR_CLONE] Cloned ${totalCloned} Success Factor tasks into project ${projectId}`);
    }
    
    return totalCloned;
  } catch (error) {
    console.error('[SUCCESS_FACTOR_CLONE] Error cloning Success Factor tasks:', error);
    return 0;
  }
}

/**
 * Backfill Success Factor tasks for all existing projects
 * 
 * @returns Number of projects updated
 */
export async function backfillSuccessFactorTasks() {
  try {
    // Get all projects
    const projects = await db.query.projects.findMany();
    
    if (projects.length === 0) {
      console.log('[SUCCESS_FACTOR_CLONE] No projects found to backfill');
      return 0;
    }
    
    console.log(`[SUCCESS_FACTOR_CLONE] Backfilling Success Factor tasks for ${projects.length} projects`);
    
    // Track how many projects are updated
    let updatedCount = 0;
    
    // Clone tasks for each project
    for (const project of projects) {
      const clonedCount = await cloneAllSuccessFactorTasks(project.id);
      
      if (clonedCount > 0) {
        updatedCount++;
        console.log(`[SUCCESS_FACTOR_CLONE] Backfilled ${clonedCount} Success Factor tasks for project ${project.id}`);
      }
    }
    
    console.log(`[SUCCESS_FACTOR_CLONE] Backfilled Success Factor tasks for ${updatedCount} projects`);
    
    return updatedCount;
  } catch (error) {
    console.error('[SUCCESS_FACTOR_CLONE] Error backfilling Success Factor tasks:', error);
    return 0;
  }
}

/**
 * Remove duplicate Success Factor tasks in a project
 * Keeps the most recently created task for each sourceId/stage pair
 */
export async function deduplicateSuccessFactorTasks(projectId: string) {
  try {
    const { rows } = await db.execute(sql`
      DELETE FROM project_tasks
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY project_id, source_id, stage
                   ORDER BY created_at DESC
                 ) as rn
          FROM project_tasks
          WHERE project_id = ${projectId} AND origin = 'factor'
        ) t WHERE t.rn > 1
      )
      RETURNING id
    `);

    if (DEBUG_CLONE && rows?.length) {
      console.log(
        `[SUCCESS_FACTOR_CLONE] Removed ${rows.length} duplicate Success Factor tasks in project ${projectId}`
      );
    }

    return rows?.length ?? 0;
  } catch (error) {
    console.error('[SUCCESS_FACTOR_CLONE] Error deduplicating Success Factor tasks:', error);
    return 0;
  }
}

/**
 * Ensure all Success Factor tasks exist for a project
 * Called whenever a project is accessed to ensure it has all required tasks
 * 
 * @param projectId The project ID to ensure tasks for
 * @returns True if all Success Factor tasks exist, false otherwise
 */
export async function ensureSuccessFactorTasks(projectId: string) {
  try {
    // Clone all Success Factor tasks into the project
    const clonedCount = await cloneAllSuccessFactorTasks(projectId);

    // Clean up any duplicate Success Factor tasks that may already exist
    const removed = await deduplicateSuccessFactorTasks(projectId);

    if (DEBUG_CLONE) {
      if (clonedCount > 0) {
        console.log(`[SUCCESS_FACTOR_CLONE] Added ${clonedCount} missing Success Factor tasks to project ${projectId}`);
      } else {
        console.log(`[SUCCESS_FACTOR_CLONE] All Success Factor tasks already exist for project ${projectId}`);
      }
      if (removed > 0) {
        console.log(`[SUCCESS_FACTOR_CLONE] Removed ${removed} duplicate Success Factor tasks from project ${projectId}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`[SUCCESS_FACTOR_CLONE] Error ensuring Success Factor tasks for project ${projectId}:`, error);
    return false;
  }
}

// Export default functions
export default {
  getAllSuccessFactors,
  getSuccessFactorTasks,
  cloneSuccessFactorTasks,
  cloneAllSuccessFactorTasks,
  backfillSuccessFactorTasks,
  deduplicateSuccessFactorTasks,
  ensureSuccessFactorTasks
};