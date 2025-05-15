
  updateTask: async (taskId: string, data: Partial<ProjectTask>): Promise<ProjectTask | null> => {
    try {
      // Sanitize input data to ensure types match and handle empty strings properly
      const updateData: any = {};
      
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