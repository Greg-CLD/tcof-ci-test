import express from 'express';
import fs from 'fs';
import path from 'path';
import { projectsDb } from '../projectsDb.js';
import { isAuthenticated } from '../auth.js';

const router = express.Router();
const FRAMEWORK_TASKS_DIR = path.join(process.cwd(), 'data', 'framework-tasks');

// Ensure framework tasks directory exists
if (!fs.existsSync(FRAMEWORK_TASKS_DIR)) {
  fs.mkdirSync(FRAMEWORK_TASKS_DIR, { recursive: true });
}

// Default framework tasks
const frameworkTasks = {
  'praxis': [
    { id: 'praxis-1', name: 'Create project mandate', description: 'Document the high-level objectives and constraints' },
    { id: 'praxis-2', name: 'Develop business case', description: 'Justify the investment and define expected benefits' },
    { id: 'praxis-3', name: 'Establish governance structure', description: 'Define roles, responsibilities and decision processes' },
    { id: 'praxis-4', name: 'Create work breakdown structure', description: 'Break down the project into manageable components' },
    { id: 'praxis-5', name: 'Define quality management approach', description: 'Set quality standards and review processes' }
  ],
  'green_book': [
    { id: 'green_book-1', name: 'Develop strategic outline case', description: 'Define the strategic context and fit' },
    { id: 'green_book-2', name: 'Conduct cost-benefit analysis', description: 'Analyze economic costs and benefits of options' },
    { id: 'green_book-3', name: 'Assess affordability', description: 'Ensure the project is financially viable' },
    { id: 'green_book-4', name: 'Establish evaluation criteria', description: 'Define how success will be measured' },
    { id: 'green_book-5', name: 'Create benefits realization plan', description: 'Plan for tracking and realizing benefits' }
  ],
  'agilepm': [
    { id: 'agilepm-1', name: 'Define minimum viable product', description: 'Identify core features for initial release' },
    { id: 'agilepm-2', name: 'Create product backlog', description: 'Prioritize features and requirements' },
    { id: 'agilepm-3', name: 'Establish sprint cadence', description: 'Define iteration length and rituals' },
    { id: 'agilepm-4', name: 'Set up information radiators', description: 'Create visual management tools for team progress' },
    { id: 'agilepm-5', name: 'Define done criteria', description: 'Establish acceptance criteria for deliverables' }
  ],
  'safe': [
    { id: 'safe-1', name: 'Create program backlog', description: 'Define and prioritize program epics' },
    { id: 'safe-2', name: 'Establish release train', description: 'Organize teams and define program increment' },
    { id: 'safe-3', name: 'Plan program increment', description: 'Coordinate team of teams planning' },
    { id: 'safe-4', name: 'Identify value streams', description: 'Map value delivery from concept to customer' },
    { id: 'safe-5', name: 'Create architectural runway', description: 'Establish technical foundation for future features' }
  ],
  'custom': [
    { id: 'custom-1', name: 'Define custom approach', description: 'Document your tailored approach' },
    { id: 'custom-2', name: 'Create custom governance', description: 'Define your governance structure' },
    { id: 'custom-3', name: 'Establish custom reporting', description: 'Define your reporting structure and cadence' }
  ]
};

// Load project framework tasks
async function loadFrameworkTasks(projectId) {
  try {
    const filePath = path.join(FRAMEWORK_TASKS_DIR, `${projectId}.json`);
    
    if (!fs.existsSync(filePath)) {
      // Return empty array if no file exists
      return [];
    }
    
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error(`Error loading framework tasks for project ${projectId}:`, error);
    throw error;
  }
}

// Save project framework tasks
async function saveFrameworkTasks(projectId, tasksData) {
  try {
    const filePath = path.join(FRAMEWORK_TASKS_DIR, `${projectId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(tasksData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving framework tasks for project ${projectId}:`, error);
    throw error;
  }
}

// Get framework tasks for a project based on selected frameworks
async function getFrameworkTasksHandler(req, res) {
  try {
    const { projectId } = req.params;
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to project' });
    }
    
    // Get selected frameworks for the project
    const frameworksModulePath = path.join(process.cwd(), 'server', 'routes', 'frameworks-router.js');
    const frameworksModule = await import(frameworksModulePath);
    const loadProject = frameworksModule.loadProject;
    
    const frameworksData = await loadProject(projectId);
    const selectedFrameworks = frameworksData.selectedFrameworks || [];
    
    // Get saved framework tasks for the project
    const savedTasks = await loadFrameworkTasks(projectId);
    
    // Generate task list based on selected frameworks
    const result = {
      frameworks: {},
      savedTasks: savedTasks
    };
    
    // Include tasks only for selected frameworks
    for (const frameworkCode of selectedFrameworks) {
      if (frameworkTasks[frameworkCode]) {
        result.frameworks[frameworkCode] = {
          tasks: frameworkTasks[frameworkCode]
        };
      }
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting framework tasks:', error);
    return res.status(500).json({ message: 'Failed to get framework tasks' });
  }
}

// Save a task assignment for a framework
async function saveFrameworkTaskHandler(req, res) {
  try {
    const { projectId } = req.params;
    const { taskId, frameworkCode, stage, included } = req.body;
    
    if (!taskId || !frameworkCode) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to project' });
    }
    
    // Get existing tasks
    const savedTasks = await loadFrameworkTasks(projectId);
    
    // Find if task already exists
    const existingTaskIndex = savedTasks.findIndex(
      task => task.taskId === taskId && task.frameworkCode === frameworkCode
    );
    
    if (existingTaskIndex >= 0) {
      // Update existing task
      savedTasks[existingTaskIndex] = {
        ...savedTasks[existingTaskIndex],
        stage: stage || savedTasks[existingTaskIndex].stage,
        included: included !== undefined ? included : savedTasks[existingTaskIndex].included
      };
    } else {
      // Add new task
      savedTasks.push({
        taskId,
        frameworkCode,
        stage: stage || 'Identification',
        included: included !== undefined ? included : true,
        addedAt: new Date().toISOString()
      });
    }
    
    // Save updated tasks
    await saveFrameworkTasks(projectId, savedTasks);
    
    return res.status(200).json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error saving framework task:', error);
    return res.status(500).json({ message: 'Failed to save framework task' });
  }
}

// Define routes
router.get('/:projectId/framework-tasks', isAuthenticated, getFrameworkTasksHandler);
router.post('/:projectId/framework-tasks', isAuthenticated, saveFrameworkTaskHandler);

export default router;