/**
 * Projects database module
 * Provides centralized project storage and persistence
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { db } from './db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { projectTasks as projectTasksTable } from '@shared/schema';

// Path to projects data file
const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const TASKS_FILE = path.join(DATA_DIR, 'project_tasks.json');
const POLICIES_FILE = path.join(DATA_DIR, 'project_policies.json');
const PLANS_FILE = path.join(DATA_DIR, 'project_plans.json');

// Project data type
export interface Project {
  id: string;
  userId: number;
  name: string;
  description?: string;
  sector?: string;
  customSector?: string;
  orgType?: string;
  teamSize?: string;
  currentStage?: string;
  selectedOutcomeIds?: string[];
  organisationId?: string;
  createdAt: string;
  updatedAt: string;
}

// Project task data type
export interface ProjectTask {
  id: string;
  projectId: string;  // Always treat as string for consistency across client and server
  text: string;
  stage: 'identification' | 'definition' | 'delivery' | 'closure';
  origin: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceId: string;   // Required for consistent tracking
  completed: boolean; // Default to false, not nullable
  notes: string;      // Default to empty string, not nullable
  priority: string;   // Default to empty string, not nullable
  dueDate: string;    // Default to empty string, not nullable
  owner: string;      // Default to empty string, not nullable
  status: string;     // Default to 'pending', not nullable
  createdAt: string;  // String format for client side compatibility
  updatedAt: string;  // String format for client side compatibility
}

// Project policy data type
export interface ProjectPolicy {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Project plan data type
export interface ProjectPlan {
  id: string | number;
  projectId: string;
  blocks: {
    [blockId: string]: {
      id?: string | number;
      successFactors?: any[];
      personalHeuristics?: any[];
      tasks?: any[];
      stakeholders?: any[];
      timeline?: any;
      deliveryApproach?: string;
      deliveryNotes?: string;
      completed?: boolean;
      createdAt?: number;
      updatedAt?: number;
    }
  };
  lastUpdated: number;
}

/**
 * Helper function to convert database task record to a ProjectTask object
 * @param dbTask Database task record
 * @param projectId Optional project ID to override the task's project ID
 * @returns ProjectTask object with proper type safety
 */
function convertDbTaskToProjectTask(dbTask: any, projectId?: string): ProjectTask {
  // Safely determine stage with proper fallback
  let stage: 'identification' | 'definition' | 'delivery' | 'closure' = 'identification';
  if (dbTask.stage) {
    const stageStr = String(dbTask.stage).toLowerCase();
    if (['identification', 'definition', 'delivery', 'closure'].includes(stageStr)) {
      stage = stageStr as 'identification' | 'definition' | 'delivery' | 'closure';
    }
  }
  
  // Safely determine origin with proper fallback
  let origin: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework' = 'custom';
  if (dbTask.origin) {
    const originStr = String(dbTask.origin).toLowerCase();
    if (['heuristic', 'factor', 'policy', 'custom', 'framework'].includes(originStr)) {
      origin = originStr as 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
    }
  }
  
  // Format dates safely
  let createdAt = new Date().toISOString();
  if (dbTask.createdAt) {
    try {
      createdAt = dbTask.createdAt instanceof Date
        ? dbTask.createdAt.toISOString()
        : new Date(String(dbTask.createdAt)).toISOString();
    } catch (e) {
      console.error('Error parsing createdAt date:', e);
    }
  }
  
  let updatedAt = new Date().toISOString();
  if (dbTask.updatedAt) {
    try {
      updatedAt = dbTask.updatedAt instanceof Date
        ? dbTask.updatedAt.toISOString()
        : new Date(String(dbTask.updatedAt)).toISOString();
    } catch (e) {
      console.error('Error parsing updatedAt date:', e);
    }
  }
  
  // Create a well-typed ProjectTask object with fallbacks for all fields
  return {
    id: String(dbTask.id || ''),
    projectId: projectId || String(dbTask.projectId || ''),
    text: String(dbTask.text || ''),
    stage: stage,
    origin: origin,
    sourceId: String(dbTask.sourceId || ''),
    completed: Boolean(dbTask.completed),
    notes: String(dbTask.notes || ''),
    priority: String(dbTask.priority || ''),
    dueDate: String(dbTask.dueDate || ''),
    owner: String(dbTask.owner || ''),
    status: String(dbTask.status || 'To Do'),
    createdAt: createdAt,
    updatedAt: updatedAt
  };
}

/**
 * Load project tasks from the database using Drizzle ORM
 * @param projectId Optional project ID to filter tasks
 * @returns Array of ProjectTask objects
 */
async function loadProjectTasks(projectId?: string): Promise<ProjectTask[]> {
  try {
    // If no project ID provided, return all tasks
    if (!projectId) {
      console.log('Loading all project tasks (no project ID filter)');
      const allTasks = await db.select().from(projectTasksTable);
      return allTasks.map(task => convertDbTaskToProjectTask(task));
    }
    
    // Always convert the project ID to a UUID format for database operations
    const normalizedProjectId = validateProjectUUID(projectId);
    console.log(`Normalized project ID for task loading: ${normalizedProjectId}`);
    
    // Use Drizzle's type-safe query builder with proper eq operator
    const tasks = await db.select()
      .from(projectTasksTable)
      .where(eq(projectTasksTable.projectId, normalizedProjectId));
    
    // Handle empty results
    if (!tasks || tasks.length === 0) {
      console.log(`No tasks found for project ${normalizedProjectId}`);
      return [];
    }
    
    console.log(`Loaded ${tasks.length} tasks from database for project ${normalizedProjectId}`);
    
    // Debug output for the first task
    if (tasks.length > 0) {
      console.log('First task from Drizzle:', JSON.stringify(tasks[0]));
    }
    
    // Convert all tasks to ProjectTask objects using our helper function
    return tasks.map(task => convertDbTaskToProjectTask(task, normalizedProjectId));
  } catch (error) {
    console.error(`Error loading tasks for project ${projectId}:`, error);
    return [];
  }
}

/**
 * IMPROVED: Handle both numeric IDs and UUIDs
 * This function normalizes project IDs for database operations
 * - If it's a number or numeric string, converts to deterministic UUID
 * - If it's already a UUID, uses it directly
 */
function validateProjectUUID(projectId: unknown): string {
  // Handle null/undefined with a meaningful error
  if (projectId === null || projectId === undefined) {
    throw new Error('Project ID cannot be null or undefined');
  }
  
  // Import UUID utilities from our shared utility module (using .cjs extension for CommonJS compatibility)
  const { isValidUUID, isNumericId } = require('./utils/uuid-utils.cjs');
  
  // Convert to string for consistency
  const idString = String(projectId);
  
  // Reject numeric IDs - no longer supported
  if (isNumericId(idString)) {
    throw new Error(`Numeric project IDs are no longer supported: ${idString}`);
  }
  
  // Check if a valid UUID
  if (isValidUUID(idString)) {
    // If a valid UUID, use it directly
    return idString.toLowerCase();
  }
  
  // If not a valid UUID, throw an error
  throw new Error(`Invalid project ID format: ${idString}`);
}

/**
 * Project database operations
 */
export const projectsDb = {
  /**
   * Create a new project
   * @param userId User ID of the project owner
   * @param data Project data
   * @returns The created project record or null if creation failed
   */
  createProject: (userId: number, data: Partial<Project>): Project | null => {
    try {
      const projects = loadProjects();
      
      const project: Project = {
        id: data.id || uuidv4(),
        userId: userId,
        name: data.name || 'New Project',
        description: data.description || '',
        sector: data.sector || '',
        customSector: data.customSector || '',
        orgType: data.orgType || '',
        teamSize: data.teamSize || '',
        currentStage: data.currentStage || '',
        selectedOutcomeIds: data.selectedOutcomeIds || [],
        organisationId: data.organisationId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      projects.push(project);
      
      if (saveProjects(projects)) {
        return project;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  },
  
  // Load all project plans
  getPlans: () => loadProjectPlans(),
  
  getTasksForSource: async (projectId: string, sourceId: string): Promise<ProjectTask[]> => {
    try {
      const tasks = await loadProjectTasks(projectId);
      return tasks.filter(task => task.sourceId === sourceId);
    } catch (error) {
      console.error(`Error getting tasks for source ${sourceId}:`, error);
      return [];
    }
  },
  
  getProjectTasksBySourceId: async (projectId: string, sourceId: string): Promise<ProjectTask[]> => {
    try {
      const tasks = await loadProjectTasks(projectId);
      return tasks.filter(task => task.sourceId === sourceId);
    } catch (error) {
      console.error(`Error getting tasks for source ${sourceId}:`, error);
      return [];
    }
  },
  
  getProjectTasks: async (projectId: string): Promise<ProjectTask[]> => {
    try {
      return await loadProjectTasks(projectId);
    } catch (error) {
      console.error(`Error getting tasks for project ${projectId}:`, error);
      return [];
    }
  },
  
  createProjectTask: async (taskData: Partial<ProjectTask>): Promise<ProjectTask | null> => {
    console.log(`Creating task for project ${taskData.projectId}:`, taskData.text);
    try {
      if (!taskData.projectId) {
        console.error('Cannot create task: missing projectId');
        return null;
      }
      
      // Normalize the project ID if needed
      const normalizedProjectId = validateProjectUUID(taskData.projectId);
      taskData.projectId = normalizedProjectId;
      
      // Create the task with normalized projectId
      const task = await projectsDb.createTask(taskData);
      if (task) {
        console.log(`Successfully created task ${task.id} for project ${normalizedProjectId}`);
      } else {
        console.error(`Failed to create task for project ${normalizedProjectId}`);
      }
      return task;
    } catch (error) {
      console.error(`Error creating task for project ${taskData.projectId}:`, error);
      return null;
    }
  },
  
  updateProjectTask: async (projectId: string, taskId: string, data: Partial<ProjectTask>): Promise<ProjectTask | null> => {
    console.log(`Updating task ${taskId} for project ${projectId}`);
    // Ensure task belongs to the specified project for safety
    try {
      // Normalize project ID
      const normalizedProjectId = validateProjectUUID(projectId);
      
      // First get the task to ensure it exists and belongs to this project
      const tasks = await loadProjectTasks(normalizedProjectId);
      const taskExists = tasks.find(t => t.id === taskId);
      
      if (!taskExists) {
        console.error(`Task ${taskId} not found in project ${normalizedProjectId}`);
        return null;
      }
      
      // If task exists and belongs to the project, update it
      return await projectsDb.updateTask(taskId, data);
    } catch (error) {
      console.error(`Error updating task ${taskId} for project ${projectId}:`, error);
      return null;
    }
  },
  
  deleteProjectTask: async (projectId: string, taskId: string): Promise<boolean> => {
    console.log(`Deleting task ${taskId} from project ${projectId}`);
    try {
      // Normalize project ID
      const normalizedProjectId = validateProjectUUID(projectId);
      
      // First get the task to ensure it exists and belongs to this project
      const tasks = await loadProjectTasks(normalizedProjectId);
      const taskExists = tasks.find(t => t.id === taskId);
      
      if (!taskExists) {
        console.error(`Task ${taskId} not found in project ${normalizedProjectId}`);
        return false;
      }
      
      // If task exists and belongs to the project, delete it
      return await projectsDb.deleteTask(taskId);
    } catch (error) {
      console.error(`Error deleting task ${taskId} from project ${projectId}:`, error);
      return false;
    }
  },
  
  getTasksForProject: async (projectId: string): Promise<ProjectTask[]> => {
    try {
      return await loadProjectTasks(projectId);
