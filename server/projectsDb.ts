/**
 * Projects database module
 * Provides centralized project storage and persistence
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';

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
  projectId: string;
  text: string;
  stage: 'identification' | 'definition' | 'delivery' | 'closure';
  origin: 'heuristic' | 'factor' | 'policy';
  sourceId: string;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Project policy data type
export interface ProjectPolicy {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Project plan data type - supports the Block system
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

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize projects data file if it doesn't exist
if (!fs.existsSync(PROJECTS_FILE)) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('Created empty projects.json file');
}

// Initialize project tasks data file if it doesn't exist
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('Created empty project_tasks.json file');
}

// Initialize project policies data file if it doesn't exist
if (!fs.existsSync(POLICIES_FILE)) {
  fs.writeFileSync(POLICIES_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('Created empty project_policies.json file');
}

// Initialize project plans data file if it doesn't exist
if (!fs.existsSync(PLANS_FILE)) {
  fs.writeFileSync(PLANS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('Created empty project_plans.json file');
}

/**
 * Load all projects from the data file
 */
function loadProjects(): Project[] {
  try {
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
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving projects:', error);
    return false;
  }
}

/**
 * Load all project tasks from the data file
 */
function loadProjectTasks(): ProjectTask[] {
  try {
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading project tasks:', error);
    return [];
  }
}

/**
 * Save project tasks to the data file
 */
function saveProjectTasks(tasks: ProjectTask[]): boolean {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving project tasks:', error);
    return false;
  }
}

/**
 * Load all project policies from the data file
 */
function loadProjectPolicies(): ProjectPolicy[] {
  try {
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
    fs.writeFileSync(POLICIES_FILE, JSON.stringify(policies, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving project policies:', error);
    return false;
  }
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
  createProject: async (
    userId: number,
    data: { 
      name: string; 
      description?: string;
      sector?: string;
      customSector?: string;
      orgType?: string;
      teamSize?: string;
      currentStage?: string;
      organisationId?: string;
    }
  ): Promise<Project | null> => {
    try {
      // Create new project object
      const project: Project = {
        id: uuidv4(),
        userId,
        name: data.name,
        description: data.description || '',
        sector: data.sector,
        customSector: data.customSector,
        orgType: data.orgType,
        teamSize: data.teamSize,
        currentStage: data.currentStage,
        organisationId: data.organisationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Load existing projects
      const projects = loadProjects();

      // Add new project
      projects.push(project);

      // Save updated projects list
      const saved = saveProjects(projects);
      
      if (saved) {
        console.log(`Project saved → ${project.id}`);
        return project;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  },

  /**
   * Get all projects, optionally filtered by ID
   * @param projectId Optional project ID to filter for
   * @returns Array of all projects or a single project if ID is provided
   */
  getProjects: async (projectId?: string | number): Promise<Project[]> => {
    try {
      // Load all projects
      const projects = loadProjects();
      
      console.log(`Getting projects, total count: ${projects.length}`);
      
      // If projectId is provided, filter for that specific project
      if (projectId) {
        // Special case: If we have a numeric ID like "3", it may be a UI-assigned identifier
        // rather than the actual UUID in the database.
        if (!isNaN(Number(projectId))) {
          const numericId = Number(projectId);
          
          // Attempt 1: Exact match (in case UUID starts with a number)
          const exactMatches = projects.filter(p => p.id === String(projectId) || p.id === projectId);
          if (exactMatches.length > 0) {
            console.log(`Found ${exactMatches.length} exact matches for ID ${projectId}`);
            return exactMatches;
          }
          
          // Attempt 2: Try to interpret as a position (ID "3" could mean the 3rd project)
          if (numericId > 0 && numericId <= projects.length) {
            const indexMatch = [projects[numericId - 1]];
            console.log(`Returning project at position ${numericId}:`, indexMatch[0].id);
            return indexMatch;
          }
          
          // Attempt 3: If we have fewer than 10 projects total, return the first one
          // as a fallback for numeric IDs in the single digits
          if (projects.length > 0 && numericId < 10) {
            console.log(`Using first project as fallback for ID ${projectId}:`, projects[0].id);
            return [projects[0]];
          }
        }
        
        // Standard UUID lookup
        const searchId = typeof projectId === 'number' ? String(projectId) : projectId;
        
        const filteredProjects = projects.filter(p => 
          p.id === searchId || p.id === projectId
        );
        
        console.log(`Filtered for project ID ${projectId} using UUID comparison, found: ${filteredProjects.length}`);
        return filteredProjects;
      }
      
      return projects;
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  },

  /**
   * List all projects for a user, optionally filtered by organization
   * @param userId User ID
   * @param organisationId Optional organization ID filter
   * @returns Array of projects for the user
   */
  listProjects: async (userId: number, organisationId?: string): Promise<Project[]> => {
    try {
      // Load all projects
      const projects = loadProjects();
      
      // Filter projects by user ID
      let userProjects = projects.filter(p => p.userId === userId);
      
      // If organisationId is provided, filter by that too
      if (organisationId) {
        userProjects = userProjects.filter(p => p.organisationId === organisationId);
        console.log(`Found ${userProjects.length} projects for user ${userId} in organisation ${organisationId}`);
      } else {
        console.log(`Found ${userProjects.length} projects for user ${userId}`);
      }
      
      return userProjects;
    } catch (error) {
      console.error('Error listing projects:', error);
      return [];
    }
  },

  /**
   * Get a single project by ID
   * @param projectId Project ID
   * @returns The project or null if not found
   */
  getProject: async (projectId: string | number): Promise<Project | null> => {
    try {
      // Load all projects
      const projects = loadProjects();
      
      console.log(`Getting project with ID: ${projectId} (type: ${typeof projectId})`);
      
      // Special case: If we have a numeric ID like "3", it may be a UI-assigned identifier
      // rather than the actual UUID in the database. Check if this is the case.
      if (!isNaN(Number(projectId))) {
        // This might be a numeric position/index identifier from the client
        const numericId = Number(projectId);
        
        // Get all projects for current user
        // For numeric ID "3", try looking at the 3rd project for the user or project at index 2
        console.log(`Checking if ${projectId} is a positional ID or real UUID`);
        
        // Attempt 1: First check for an exact string match (in case the UUID happens to start with a number)
        const exactMatch = projects.find(p => p.id === String(projectId) || p.id === projectId);
        if (exactMatch) {
          console.log(`Found exact match for ID ${projectId}:`, exactMatch);
          return exactMatch;
        }
        
        // Attempt 2: Try to interpret as an array index for the user's projects
        // (projectId "3" could refer to the 3rd project, which is at index 2)
        const indexMatch = numericId > 0 && numericId <= projects.length ? 
                            projects[numericId - 1] : 
                            null;
        if (indexMatch) {
          console.log(`Found project at position ${numericId}:`, indexMatch);
          return indexMatch;
        }
        
        // Attempt 3: If we have fewer than 10 projects, try using the first one as a fallback
        // This is a last resort to avoid breaking the UI experience
        if (projects.length > 0 && numericId < 10) {
          console.log(`Using first project as fallback for ID ${projectId}:`, projects[0]);
          return projects[0];
        }
      }
      
      // Standard UUID lookup: Convert numeric IDs to strings for comparison if needed
      const searchId = typeof projectId === 'number' ? String(projectId) : projectId;
      
      // Find project by ID
      const project = projects.find(p => {
        console.log(`Comparing project ID: ${p.id} with searchId: ${searchId}`);
        return p.id === searchId || p.id === projectId;
      });
      
      if (!project) {
        console.log(`Project with ID ${projectId} not found using UUID comparison`);
      } else {
        console.log(`Found project by UUID: `, project);
      }
      
      return project || null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  },

  /**
   * Update a project
   * @param projectId Project ID
   * @param data Updated project data
   * @returns The updated project or null if update failed
   */
  updateProject: async (
    projectId: string,
    data: { 
      name?: string; 
      description?: string;
      sector?: string;
      customSector?: string;
      orgType?: string;
      teamSize?: string;
      currentStage?: string;
      selectedOutcomeIds?: string[];
      organisationId?: string;
    }
  ): Promise<Project | null> => {
    try {
      // Load all projects
      const projects = loadProjects();
      
      // Find project index
      const index = projects.findIndex(p => p.id === projectId);
      
      if (index === -1) {
        return null;
      }
      
      // Update project
      projects[index] = {
        ...projects[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      // Save updated projects list
      const saved = saveProjects(projects);
      
      if (saved) {
        return projects[index];
      }
      
      return null;
    } catch (error) {
      console.error('Error updating project:', error);
      return null;
    }
  },

  /**
   * Delete a project
   * @param projectId Project ID
   * @returns Success status
   */
  deleteProject: async (projectId: string | number): Promise<boolean> => {
    try {
      // Load all projects
      const projects = loadProjects();
      
      console.log(`Deleting project with ID: ${projectId} (type: ${typeof projectId})`);
      
      // Convert numeric IDs to strings for comparison if needed
      const searchId = typeof projectId === 'number' ? String(projectId) : projectId;
      
      // Show all projects for debugging
      console.log('Current projects:', projects.map(p => ({ id: p.id, name: p.name })));
      
      // Filter out the project to delete, handling both string and number comparisons
      const updatedProjects = projects.filter(p => {
        // Keep projects that DON'T match the ID we want to delete
        const keepProject = p.id !== searchId && p.id !== projectId;
        if (!keepProject) {
          console.log(`Found matching project to delete: ${p.id}`);
        }
        return keepProject;
      });
      
      if (updatedProjects.length === projects.length) {
        // No project was removed
        console.log(`No project found with ID ${projectId} to delete`);
        return false;
      }
      
      // Save updated projects list
      console.log(`Removing project ${projectId}, projects count: ${projects.length} -> ${updatedProjects.length}`);
      const result = saveProjects(updatedProjects);
      console.log(`Project deletion result: ${result}`);
      return result;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  },
  
  /**
   * Get all tasks for a project
   * @param projectId Project ID
   * @returns Array of tasks for the project
   */
  getProjectTasks: async (projectId: string): Promise<ProjectTask[]> => {
    try {
      // Load all tasks
      const tasks = loadProjectTasks();
      
      // Filter tasks by project ID
      const projectTasks = tasks.filter(t => t.projectId === projectId);
      
      console.log(`Found ${projectTasks.length} tasks for project ${projectId}`);
      
      return projectTasks;
    } catch (error) {
      console.error('Error getting project tasks:', error);
      return [];
    }
  },
  
  /**
   * Create a new task for a project
   * @param taskData Task data
   * @returns The created task or null if creation failed
   */
  createProjectTask: async (
    taskData: {
      projectId: string;
      text: string;
      stage: 'identification' | 'definition' | 'delivery' | 'closure';
      origin: 'heuristic' | 'factor' | 'policy';
      sourceId: string;
      completed?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<ProjectTask | null> => {
    try {
      // Create new task object
      const task: ProjectTask = {
        id: uuidv4(),
        projectId: taskData.projectId,
        text: taskData.text,
        stage: taskData.stage,
        origin: taskData.origin,
        sourceId: taskData.sourceId,
        completed: taskData.completed || false,
        createdAt: taskData.createdAt || new Date().toISOString(),
        updatedAt: taskData.updatedAt || new Date().toISOString(),
      };
      
      // Load existing tasks
      const tasks = loadProjectTasks();
      
      // Add new task
      tasks.push(task);
      
      // Save updated tasks list
      const saved = saveProjectTasks(tasks);
      
      if (saved) {
        console.log(`Task saved → ${task.id}`);
        return task;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating project task:', error);
      return null;
    }
  },
  
  /**
   * Update a project task
   * @param taskId Task ID
   * @param data Updated task data
   * @returns The updated task or null if update failed
   */
  updateProjectTask: async (
    taskId: string,
    data: {
      text?: string;
      stage?: 'identification' | 'definition' | 'delivery' | 'closure';
      completed?: boolean;
    }
  ): Promise<ProjectTask | null> => {
    try {
      // Load all tasks
      const tasks = loadProjectTasks();
      
      // Find task index
      const index = tasks.findIndex(t => t.id === taskId);
      
      if (index === -1) {
        return null;
      }
      
      // Update task
      tasks[index] = {
        ...tasks[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      // Save updated tasks list
      const saved = saveProjectTasks(tasks);
      
      if (saved) {
        return tasks[index];
      }
      
      return null;
    } catch (error) {
      console.error('Error updating project task:', error);
      return null;
    }
  },
  
  /**
   * Delete a project task
   * @param taskId Task ID
   * @returns Success status
   */
  deleteProjectTask: async (taskId: string): Promise<boolean> => {
    try {
      // Load all tasks
      const tasks = loadProjectTasks();
      
      // Filter out the task to delete
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      
      if (updatedTasks.length === tasks.length) {
        // No task was removed
        console.log(`No task found with ID ${taskId} to delete`);
        return false;
      }
      
      // Save updated tasks list
      console.log(`Removing task ${taskId}, tasks count: ${tasks.length} -> ${updatedTasks.length}`);
      const result = saveProjectTasks(updatedTasks);
      console.log(`Task deletion result: ${result}`);
      return result;
    } catch (error) {
      console.error('Error deleting project task:', error);
      return false;
    }
  },

  /**
   * Get all policies for a project
   * @param projectId Project ID
   * @returns Array of policies for the project
   */
  getProjectPolicies: async (projectId: string): Promise<ProjectPolicy[]> => {
    try {
      // Load all policies
      const policies = loadProjectPolicies();
      
      // Filter policies by project ID
      const projectPolicies = policies.filter(p => p.projectId === projectId);
      
      console.log(`Found ${projectPolicies.length} policies for project ${projectId}`);
      
      return projectPolicies;
    } catch (error) {
      console.error('Error getting project policies:', error);
      return [];
    }
  },
  
  /**
   * Create a new policy for a project
   * @param policyData Policy data
   * @returns The created policy or null if creation failed
   */
  createProjectPolicy: async (
    policyData: {
      projectId: string;
      name: string;
    }
  ): Promise<ProjectPolicy | null> => {
    try {
      // Create new policy object
      const policy: ProjectPolicy = {
        id: uuidv4(),
        projectId: policyData.projectId,
        name: policyData.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Load existing policies
      const policies = loadProjectPolicies();
      
      // Add new policy
      policies.push(policy);
      
      // Save updated policies list
      const saved = saveProjectPolicies(policies);
      
      if (saved) {
        console.log(`Policy saved → ${policy.id}`);
        return policy;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating project policy:', error);
      return null;
    }
  },
  
  /**
   * Update a project policy
   * @param policyId Policy ID
   * @param data Updated policy data
   * @returns The updated policy or null if update failed
   */
  updateProjectPolicy: async (
    policyId: string,
    data: {
      name?: string;
    }
  ): Promise<ProjectPolicy | null> => {
    try {
      // Load all policies
      const policies = loadProjectPolicies();
      
      // Find policy index
      const index = policies.findIndex(p => p.id === policyId);
      
      if (index === -1) {
        return null;
      }
      
      // Update policy
      policies[index] = {
        ...policies[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      // Save updated policies list
      const saved = saveProjectPolicies(policies);
      
      if (saved) {
        return policies[index];
      }
      
      return null;
    } catch (error) {
      console.error('Error updating project policy:', error);
      return null;
    }
  },
  
  /**
   * Delete a project policy
   * @param policyId Policy ID
   * @returns Success status
   */
  deleteProjectPolicy: async (policyId: string): Promise<boolean> => {
    try {
      // Load all policies
      const policies = loadProjectPolicies();
      
      // Filter out the policy to delete
      const updatedPolicies = policies.filter(p => p.id !== policyId);
      
      if (updatedPolicies.length === policies.length) {
        // No policy was removed
        console.log(`No policy found with ID ${policyId} to delete`);
        return false;
      }
      
      // Save updated policies list
      console.log(`Removing policy ${policyId}, policies count: ${policies.length} -> ${updatedPolicies.length}`);
      const result = saveProjectPolicies(updatedPolicies);
      
      // Also delete any tasks associated with this policy
      const tasks = loadProjectTasks();
      const filteredTasks = tasks.filter(t => !(t.origin === 'policy' && t.sourceId === policyId));
      
      if (filteredTasks.length !== tasks.length) {
        console.log(`Removing ${tasks.length - filteredTasks.length} tasks associated with policy ${policyId}`);
        saveProjectTasks(filteredTasks);
      }
      
      console.log(`Policy deletion result: ${result}`);
      return result;
    } catch (error) {
      console.error('Error deleting project policy:', error);
      return false;
    }
  }
};