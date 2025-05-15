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
  budget?: string;
  technicalContext?: string;
  timelineMonths?: string;
  nextStage?: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

// Project task data type
export interface ProjectTask {
  id: string;
  projectId: string;
  text: string;
  stage: string;
  origin: string;
  sourceId: string;
  completed: boolean;
  notes: string;
  priority: string;
  dueDate: string;
  owner: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Project policy data type
export interface ProjectPolicy {
  projectId: string;
  type: string;
  enabled: boolean;
  config: any;
}

// Project plan data type
export interface ProjectPlan {
  projectId: string;
  block1: BlockData;
  block2: BlockData;
  block3: BlockData;
  checklistOutput: any;
}

// Block data type for plan storage
export interface BlockData {
  completed: boolean;
  data: any;
  stepStatus: Record<string, boolean>;
}

/**
 * Helper to convert a numeric ID to a UUID
 * This helps migrate from old numeric IDs to UUIDs
 * WARNING: This is for compatibility with existing data only
 * New projects should always use UUIDs directly
 */
export function validateProjectUUID(idString: string): string {
  // If it's already a UUID, return it directly
  if (idString.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return idString;
  }
  
  // Otherwise it's likely an old numeric ID format
  // Throw an error as we no longer support non-UUID formats
  throw new Error(`Invalid project ID format: ${idString}`);
}

/**
 * Helper to convert a DB task to a ProjectTask
 */
function convertDbTaskToProjectTask(dbTask: any): ProjectTask {
  // Convert dates to strings for consistent interface
  let createdAt = dbTask.createdAt;
  if (createdAt instanceof Date) {
    try {
      createdAt = createdAt.toISOString();
    } catch (e) {
      console.error('Error parsing createdAt date:', e);
    }
  }
  
  let updatedAt = dbTask.updatedAt;
  if (updatedAt instanceof Date) {
    try {
      updatedAt = updatedAt.toISOString();
    } catch (e) {
      console.error('Error parsing updatedAt date:', e);
    }
  }
  
  return {
    id: dbTask.id,
    projectId: dbTask.projectId,
    text: dbTask.text || '',
    stage: dbTask.stage || '',
    origin: dbTask.origin || 'custom',
    sourceId: dbTask.sourceId || '',
    completed: !!dbTask.completed,
    notes: dbTask.notes || '',
    priority: dbTask.priority || '',
    dueDate: dbTask.dueDate || '',
    owner: dbTask.owner || '',
    status: dbTask.status || 'To Do',
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString()
  };
}

/**
 * Project database operations
 */
export const projectsDb = {
  /**
   * Create a new project
   */
  createProject(userId, data) {
    try {
      const now = new Date().toISOString();
      const project = {
        id: uuidv4(),
        userId,
        name: data.name || 'New Project',
        description: data.description || '',
        sector: data.sector || '',
        customSector: data.customSector || '',
        orgType: data.orgType || '',
        teamSize: data.teamSize || '',
        currentStage: data.currentStage || '',
        budget: data.budget || '',
        technicalContext: data.technicalContext || '',
        timelineMonths: data.timelineMonths || '',
        nextStage: data.nextStage || '',
        progress: data.progress || 0,
        createdAt: now,
        updatedAt: now
      };
      
      const projects = loadProjects();
      projects.push(project);
      saveProjects(projects);
      
      // Also create an empty plan structure for this project
      const plans = loadProjectPlans();
      const emptyPlan = {
        projectId: project.id,
        block1: { completed: false, data: {}, stepStatus: {} },
        block2: { completed: false, data: {}, stepStatus: {} },
        block3: { completed: false, data: {}, stepStatus: {} },
        checklistOutput: null
      };
      plans.push(emptyPlan);
      saveProjectPlans(plans);
      
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  },
  
  // Get tasks for source
  async getTasksForSource(projectId, sourceId) {
    try {
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(and(
          eq(projectTasksTable.projectId, projectId),
          eq(projectTasksTable.sourceId, sourceId)
        ))
        .orderBy(asc(projectTasksTable.createdAt));
      
      return tasks.map(task => convertDbTaskToProjectTask(task));
    } catch (error) {
      console.error(`Error getting tasks for source ${sourceId}:`, error);
      return [];
    }
  },
  
  // Alias to match naming conventions
  async getSourceTasks(sourceId) {
    try {
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.sourceId, sourceId))
        .orderBy(asc(projectTasksTable.createdAt));
      
      return tasks.map(task => convertDbTaskToProjectTask(task));
    } catch (error) {
      console.error(`Error getting tasks for source ${sourceId}:`, error);
      return [];
    }
  },
  
  // Get all tasks for a project
  async getTasksForProject(projectId) {
    try {
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.projectId, projectId))
        .orderBy(asc(projectTasksTable.createdAt));
      
      return tasks.map(task => convertDbTaskToProjectTask(task));
    } catch (error) {
      console.error(`Error getting tasks for project ${projectId}:`, error);
      return [];
    }
  },
  
  // Create a task for a project
  async createTask(taskData) {
    if (!taskData.projectId) {
      console.error('Cannot create task: missing projectId');
      return null;
    }
    
    console.log('Validating task data:', {
      projectId: taskData.projectId,
      text: taskData.text,
      stage: taskData.stage,
      hasId: !!taskData.id
    });

    try {
      const normalizedProjectId = validateProjectUUID(taskData.projectId);
      console.log(`Creating task for normalized project ID: ${normalizedProjectId}`);
      
      // Convert empty values to appropriate defaults
      const task = {
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
      
      console.log('Task object prepared for insert:', JSON.stringify(task, null, 2));
      
      // Save the task to the database using Drizzle insert
      console.log('Starting database insert operation');
      
      // Properly sanitize values for database insertion:
      // 1. Convert empty strings to null for any nullable fields
      // 2. Ensure dates are handled correctly
      const insertValues = {
        id: task.id,
        projectId: task.projectId,
        text: task.text || '',
        stage: task.stage || 'identification',
        origin: task.origin || 'custom',
        sourceId: task.sourceId || '',
        completed: Boolean(task.completed), 
        // Handle possible empty strings by converting them to null
        notes: task.notes === '' ? null : task.notes,
        priority: task.priority === '' ? null : task.priority,
        dueDate: task.dueDate === '' ? null : task.dueDate,
        owner: task.owner === '' ? null : task.owner,
        status: task.status || 'To Do',
        createdAt: new Date(),  // Always use current date
        updatedAt: new Date()   // Always use current date
      };
      console.log('Insert values:', JSON.stringify(insertValues, null, 2));
      
      const [savedTask] = await db.insert(projectTasksTable)
        .values(insertValues)
        .returning();
      
      console.log('Database operation result:', savedTask ? 'Success' : 'Failed (null)');
      
      if (savedTask) {
        console.log('Saved task from DB:', JSON.stringify(savedTask, null, 2));
        return convertDbTaskToProjectTask(savedTask);
      }
      
      console.error('Task creation failed: Database returned null after insert');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error.stack : '';
      
      console.error('Error creating task:', {
        message: errorMessage,
        stack: errorDetails,
        taskData: {
          id: taskData.id,
          projectId: taskData.projectId,
          text: taskData.text,
          stage: taskData.stage
        }
      });
      return null;
    }
  },
  
  // Update an existing task
  async updateTask(taskId, data) {
    try {
      // Sanitize input data to ensure types match and handle empty strings properly
      const updateData = {};
      
      // Only update fields that are provided, with proper empty string handling
      if (data.text !== undefined) updateData.text = String(data.text);
      if (data.stage !== undefined) updateData.stage = String(data.stage);
      if (data.origin !== undefined) updateData.origin = String(data.origin);
      if (data.sourceId !== undefined) updateData.sourceId = String(data.sourceId);
      if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
      
      // For nullable fields, convert empty strings to null
      if (data.notes !== undefined) updateData.notes = data.notes === '' ? null : String(data.notes);
      if (data.priority !== undefined) updateData.priority = data.priority === '' ? null : String(data.priority);
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate === '' ? null : String(data.dueDate);
      if (data.owner !== undefined) updateData.owner = data.owner === '' ? null : String(data.owner);
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
  
  // Delete a task
  async deleteTask(taskId) {
    try {
      await db.delete(projectTasksTable)
        .where(eq(projectTasksTable.id, taskId));
      
      return true;
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      return false;
    }
  },
  
  // Get all projects
  getProjects() {
    try {
      return loadProjects();
    } catch (error) {
      console.error('Error getting all projects:', error);
      return [];
    }
  },
  
  // Get projects for a specific user
  getUserProjects(userId) {
    try {
      const projects = loadProjects().filter(project => project.userId === userId);
      return projects;
    } catch (error) {
      console.error(`Error getting projects for user ${userId}:`, error);
      return [];
    }
  },
  
  // Get a specific project by ID
  getProject(projectId) {
    try {
      const projects = loadProjects();
      const project = projects.find(p => p.id === projectId);
      return project || null;
    } catch (error) {
      console.error(`Error getting project ${projectId}:`, error);
      return null;
    }
  },
  
  // Update a project
  updateProject(projectId, data) {
    try {
      const projects = loadProjects();
      const index = projects.findIndex(p => p.id === projectId);
      
      if (index !== -1) {
        // Update only the fields that are provided
        const project = projects[index];
        const updatedProject = {
          ...project,
          name: data.name !== undefined ? data.name : project.name,
          description: data.description !== undefined ? data.description : project.description,
          sector: data.sector !== undefined ? data.sector : project.sector,
          customSector: data.customSector !== undefined ? data.customSector : project.customSector,
          orgType: data.orgType !== undefined ? data.orgType : project.orgType,
          teamSize: data.teamSize !== undefined ? data.teamSize : project.teamSize,
          currentStage: data.currentStage !== undefined ? data.currentStage : project.currentStage,
          budget: data.budget !== undefined ? data.budget : project.budget,
          technicalContext: data.technicalContext !== undefined ? data.technicalContext : project.technicalContext,
          timelineMonths: data.timelineMonths !== undefined ? data.timelineMonths : project.timelineMonths,
          nextStage: data.nextStage !== undefined ? data.nextStage : project.nextStage,
          progress: data.progress !== undefined ? data.progress : project.progress,
          updatedAt: new Date().toISOString()
        };
        
        projects[index] = updatedProject;
        saveProjects(projects);
        
        return updatedProject;
      }
      
      return null;
    } catch (error) {
      console.error(`Error updating project ${projectId}:`, error);
      return null;
    }
  },
  
  // Delete a project
  deleteProject(projectId) {
    try {
      const projects = loadProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);
      
      if (filteredProjects.length !== projects.length) {
        saveProjects(filteredProjects);
        
        // Also remove project plans
        const plans = loadProjectPlans();
        const filteredPlans = plans.filter(p => p.projectId !== projectId);
        saveProjectPlans(filteredPlans);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error deleting project ${projectId}:`, error);
      return false;
    }
  },
  
  // Get a plan for a project
  getPlan(projectId) {
    try {
      const plans = loadProjectPlans();
      const plan = plans.find(p => p.projectId === projectId);
      
      if (plan) {
        return plan;
      }
      
      // Create a new plan if one doesn't exist
      return this.createPlan(projectId);
    } catch (error) {
      console.error(`Error getting plan for project ${projectId}:`, error);
      return null;
    }
  },
  
  // Create a plan for a project
  createPlan(projectId) {
    try {
      const plans = loadProjectPlans();
      
      // Check if plan already exists
      const existingPlan = plans.find(p => p.projectId === projectId);
      if (existingPlan) {
        return existingPlan;
      }
      
      // Create a new plan
      const newPlan = {
        projectId,
        block1: { completed: false, data: {}, stepStatus: {} },
        block2: { completed: false, data: {}, stepStatus: {} },
        block3: { completed: false, data: {}, stepStatus: {} },
        checklistOutput: null
      };
      
      plans.push(newPlan);
      saveProjectPlans(plans);
      
      return newPlan;
    } catch (error) {
      console.error(`Error creating plan for project ${projectId}:`, error);
      return null;
    }
  },
  
  // Update a specific block in a plan
  updatePlanBlock(projectId, blockKey, blockData) {
    try {
      const plans = loadProjectPlans();
      const index = plans.findIndex(p => p.projectId === projectId);
      
      if (index !== -1) {
        const plan = plans[index];
        
        // Update only the specified block
        if (blockKey === 'block1' || blockKey === 'block2' || blockKey === 'block3' || blockKey === 'checklistOutput') {
          plans[index] = {
            ...plan,
            [blockKey]: blockKey === 'checklistOutput' 
              ? blockData // For checklistOutput, just set the full value
              : {
                  ...plan[blockKey],
                  ...blockData,
                  // If stepStatus is provided, merge it with existing status
                  stepStatus: blockData.stepStatus 
                    ? { ...plan[blockKey].stepStatus, ...blockData.stepStatus }
                    : plan[blockKey].stepStatus
                }
          };
          
          saveProjectPlans(plans);
          return plans[index];
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error updating plan block for project ${projectId}:`, error);
      return null;
    }
  },
  
  // Get a specific block from a plan
  getPlanBlock(projectId, blockKey) {
    try {
      const plan = this.getPlan(projectId);
      
      if (plan && (blockKey === 'block1' || blockKey === 'block2' || blockKey === 'block3' || blockKey === 'checklistOutput')) {
        return plan[blockKey];
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting plan block for project ${projectId}:`, error);
      return null;
    }
  },
  
  // Delete a plan
  deletePlan(projectId) {
    try {
      const plans = loadProjectPlans();
      const filteredPlans = plans.filter(p => p.projectId !== projectId);
      
      if (filteredPlans.length !== plans.length) {
        saveProjectPlans(filteredPlans);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error deleting plan for project ${projectId}:`, error);
      return false;
    }
  },
  
  // Get all plans
  getPlans() {
    try {
      return loadProjectPlans();
    } catch (error) {
      console.error('Error getting all plans:', error);
      return [];
    }
  }
};

/**
 * Load projects from the data file
 */
function loadProjects(): Project[] {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
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
 * Load project policies from the data file
 */
function loadProjectPolicies(): ProjectPolicy[] {
  try {
    if (!fs.existsSync(POLICIES_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
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
 * Load project plans from the data file
 */
function loadProjectPlans(): ProjectPlan[] {
  try {
    if (!fs.existsSync(PLANS_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
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
