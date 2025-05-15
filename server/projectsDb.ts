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
  
  // Convert to string for consistency
  const idString = String(projectId);
  
  // Check if already a valid UUID
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (UUID_PATTERN.test(idString)) {
    // If already a valid UUID, use it directly
    return idString.toLowerCase();
  }
  
  // If it's a numeric ID, convert to UUID in a deterministic way
  // We use a namespace UUID for consistent generation
  const NAMESPACE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard DNS namespace
  return uuidv5(idString, NAMESPACE_UUID);
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
    return await projectsDb.createTask(taskData);
  },
  
  updateProjectTask: async (taskId: string, data: Partial<ProjectTask>): Promise<ProjectTask | null> => {
    return await projectsDb.updateTask(taskId, data);
  },
  
  deleteProjectTask: async (taskId: string): Promise<boolean> => {
    return await projectsDb.deleteTask(taskId);
  },
  
  getTasksForProject: async (projectId: string): Promise<ProjectTask[]> => {
    try {
      return await loadProjectTasks(projectId);
    } catch (error) {
      console.error(`Error getting tasks for project ${projectId}:`, error);
      return [];
    }
  },
  
  createTask: async (taskData: Partial<ProjectTask>): Promise<ProjectTask | null> => {
    if (!taskData.projectId) {
      console.error('Cannot create task: missing projectId');
      return null;
    }
    
    try {
      const normalizedProjectId = validateProjectUUID(taskData.projectId);
      
      const task: ProjectTask = {
        id: taskData.id || uuidv4(),
        projectId: normalizedProjectId,
        text: taskData.text || '',
        stage: taskData.stage || 'identification',
        origin: taskData.origin || 'custom',
        sourceId: taskData.sourceId || '',
        completed: taskData.completed || false,
        notes: taskData.notes || '',
        priority: taskData.priority || '',
        dueDate: taskData.dueDate || '',
        owner: taskData.owner || '',
        status: taskData.status || 'To Do',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save the task to the database using Drizzle insert
      const [savedTask] = await db.insert(projectTasksTable)
        .values({
          id: task.id,
          projectId: task.projectId,
          text: task.text,
          stage: task.stage,
          origin: task.origin,
          sourceId: task.sourceId,
          completed: task.completed, 
          notes: task.notes,
          priority: task.priority,
          dueDate: task.dueDate,
          owner: task.owner,
          status: task.status,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      if (savedTask) {
        return convertDbTaskToProjectTask(savedTask);
      }
      
      return null;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  },
  
  updateTask: async (taskId: string, data: Partial<ProjectTask>): Promise<ProjectTask | null> => {
    try {
      // Sanitize input data to ensure types match
      const updateData: any = {};
      
      // Only update fields that are provided
      if (data.text !== undefined) updateData.text = String(data.text);
      if (data.stage !== undefined) updateData.stage = String(data.stage);
      if (data.origin !== undefined) updateData.origin = String(data.origin);
      if (data.sourceId !== undefined) updateData.sourceId = String(data.sourceId);
      if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
      if (data.notes !== undefined) updateData.notes = String(data.notes);
      if (data.priority !== undefined) updateData.priority = String(data.priority);
      if (data.dueDate !== undefined) updateData.dueDate = String(data.dueDate);
      if (data.owner !== undefined) updateData.owner = String(data.owner);
      if (data.status !== undefined) updateData.status = String(data.status);
      
      // Always update the updatedAt timestamp
      updateData.updatedAt = new Date();
      
      // Update the task using Drizzle
      const [updatedTask] = await db.update(projectTasksTable)
        .set(updateData)
        .where(eq(projectTasksTable.id, taskId))
        .returning();
      
      if (updatedTask) {
        return convertDbTaskToProjectTask(updatedTask);
      }
      
      return null;
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      return null;
    }
  },
  
  deleteTask: async (taskId: string): Promise<boolean> => {
    try {
      const result = await db.delete(projectTasksTable)
        .where(eq(projectTasksTable.id, taskId))
        .returning({ deletedId: projectTasksTable.id });
      
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      return false;
    }
  },
  
  getProjects: (projectId?: string): Project[] => {
    const projects = loadProjects();
    
    if (projectId) {
      return projects.filter(project => project.id === projectId);
    }
    
    return projects;
  },
  
  getUserProjects: (userId: number, organisationId?: string): Project[] => {
    const projects = loadProjects();
    
    if (organisationId) {
      return projects.filter(project => 
        project.userId === userId && project.organisationId === organisationId);
    }
    
    return projects.filter(project => project.userId === userId);
  },
  
  getProject: (projectId: string): Project | null => {
    const projects = loadProjects();
    return projects.find(project => project.id === projectId) || null;
  },
  
  updateProject: (projectId: string, data: Partial<Project>): Project | null => {
    try {
      const projects = loadProjects();
      const projectIndex = projects.findIndex(project => project.id === projectId);
      
      if (projectIndex === -1) {
        return null;
      }
      
      const updatedProject = {
        ...projects[projectIndex],
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      projects[projectIndex] = updatedProject;
      
      if (saveProjects(projects)) {
        return updatedProject;
      }
      
      return null;
    } catch (error) {
      console.error(`Error updating project ${projectId}:`, error);
      return null;
    }
  },
  
  deleteProject: (projectId: string): boolean => {
    try {
      const projects = loadProjects();
      const newProjects = projects.filter(project => project.id !== projectId);
      
      if (newProjects.length === projects.length) {
        // No project was filtered out, meaning the ID wasn't found
        return false;
      }
      
      return saveProjects(newProjects);
    } catch (error) {
      console.error(`Error deleting project ${projectId}:`, error);
      return false;
    }
  },
  
  getPlan: (projectId: string): ProjectPlan | null => {
    const plans = loadProjectPlans();
    return plans.find(plan => plan.projectId === projectId) || null;
  },
  
  createPlan: (projectId: string): ProjectPlan | null => {
    try {
      const plans = loadProjectPlans();
      
      const plan: ProjectPlan = {
        id: uuidv4(),
        projectId: projectId,
        blocks: {},
        lastUpdated: Date.now()
      };
      
      plans.push(plan);
      
      if (saveProjectPlans(plans)) {
        return plan;
      }
      
      return null;
    } catch (error) {
      console.error(`Error creating plan for project ${projectId}:`, error);
      return null;
    }
  },
  
  updatePlanBlock: (projectId: string, blockId: string, blockData: any): ProjectPlan | null => {
    try {
      const plans = loadProjectPlans();
      let plan: ProjectPlan;
      let planIndex = plans.findIndex(p => p.projectId === projectId);
      
      // If plan doesn't exist, create it
      if (planIndex === -1) {
        plan = {
          id: uuidv4(),
          projectId: projectId,
          blocks: {},
          lastUpdated: Date.now()
        };
        plans.push(plan);
        planIndex = plans.length - 1;
      } else {
        plan = plans[planIndex];
      }
      
      // Update the block
      plan.blocks[blockId] = {
        ...plan.blocks[blockId],
        ...blockData,
        updatedAt: Date.now()
      };
      
      plan.lastUpdated = Date.now();
      
      plans[planIndex] = plan;
      
      if (saveProjectPlans(plans)) {
        return plan;
      }
      
      return null;
    } catch (error) {
      console.error(`Error updating plan block for project ${projectId}:`, error);
      return null;
    }
  },
  
  getPlanBlock: (projectId: string, blockId: string): any | null => {
    const plan = projectsDb.getPlan(projectId);
    
    if (!plan || !plan.blocks[blockId]) {
      return null;
    }
    
    return plan.blocks[blockId];
  },
  
  deletePlan: (projectId: string): boolean => {
    try {
      const plans = loadProjectPlans();
      const newPlans = plans.filter(plan => plan.projectId !== projectId);
      
      if (newPlans.length === plans.length) {
        // No plan was filtered out, meaning the ID wasn't found
        return false;
      }
      
      return saveProjectPlans(newPlans);
    } catch (error) {
      console.error(`Error deleting plan for project ${projectId}:`, error);
      return false;
    }
  }
};

// Helper functions for data loading/saving

/**
 * Load all projects from the data file
 */
function loadProjects(): Project[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(PROJECTS_FILE)) {
      fs.writeFileSync(PROJECTS_FILE, JSON.stringify([]));
      return [];
    }
    
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

/**
 * Save projects to the data file
 */
function saveProjects(projects: Project[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving projects:', error);
    return false;
  }
}

/**
 * Load all project policies from the data file
 */
function loadProjectPolicies(): ProjectPolicy[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(POLICIES_FILE)) {
      fs.writeFileSync(POLICIES_FILE, JSON.stringify([]));
      return [];
    }
    
    const data = fs.readFileSync(POLICIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading project policies:', error);
    return [];
  }
}

/**
 * Save project policies to the data file
 */
function saveProjectPolicies(policies: ProjectPolicy[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(POLICIES_FILE, JSON.stringify(policies, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving project policies:', error);
    return false;
  }
}

/**
 * Load all project plans from the data file
 */
function loadProjectPlans(): ProjectPlan[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(PLANS_FILE)) {
      fs.writeFileSync(PLANS_FILE, JSON.stringify([]));
      return [];
    }
    
    const data = fs.readFileSync(PLANS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading project plans:', error);
    return [];
  }
}

/**
 * Save project plans to the data file
 */
function saveProjectPlans(plans: ProjectPlan[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving project plans:', error);
    return false;
  }
}

export default projectsDb;