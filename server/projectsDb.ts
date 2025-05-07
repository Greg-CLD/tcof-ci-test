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

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize projects data file if it doesn't exist
if (!fs.existsSync(PROJECTS_FILE)) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('Created empty projects.json file');
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
        // Convert numeric IDs to strings for comparison if needed
        const searchId = typeof projectId === 'number' ? String(projectId) : projectId;
        
        const filteredProjects = projects.filter(p => 
          p.id === searchId || p.id === projectId
        );
        
        console.log(`Filtered for project ID ${projectId}, found: ${filteredProjects.length}`);
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
      
      // Convert numeric IDs to strings for comparison if needed
      const searchId = typeof projectId === 'number' ? String(projectId) : projectId;
      
      // Find project by ID
      const project = projects.find(p => {
        console.log(`Comparing project ID: ${p.id} (${typeof p.id}) with searchId: ${searchId} (${typeof searchId})`);
        return p.id === searchId || p.id === projectId;
      });
      
      if (!project) {
        console.log(`Project with ID ${projectId} not found`);
      } else {
        console.log(`Found project: `, project);
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
  }
};