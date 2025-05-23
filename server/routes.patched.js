/**
 * API Routes for the application
 */
const express = require('express');
const { db } = require('./db');
const { eq, and } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');
const { projectsDb } = require('./projectsDb');
const { usersDb } = require('./usersDb');
const { projectTasks: projectTasksTable } = require('../shared/schema');
const { applyTaskPersistencePatch } = require('../complete-task-fix');

// Create router
const router = express.Router();

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Apply task persistence patch to the router
// This ensures proper snake_case mapping for database columns
applyTaskPersistencePatch(router);

// User routes
router.get('/users/current', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        error: 'Not authenticated',
        redirectTo: '/login'
      });
    }
    
    const user = await usersDb.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Projects routes
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const projects = await projectsDb.getUserProjects(req.session.userId);
    res.json(projects);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { name, description, sector, customSector, orgType, teamSize, currentStage, budget, technicalContext, timelineMonths, nextStage } = req.body;
    
    const project = await projectsDb.createProject(req.session.userId, {
      name,
      description,
      sector,
      customSector,
      orgType,
      teamSize,
      currentStage,
      budget,
      technicalContext,
      timelineMonths,
      nextStage
    });
    
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/projects/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const updatedProject = await projectsDb.updateProject(projectId, req.body);
    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/projects/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await projectsDb.deleteProject(projectId);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Project tasks routes
router.get('/projects/:projectId/tasks', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const tasks = await projectsDb.getTasksForProject(projectId);
    res.json(tasks);
  } catch (error) {
    console.error('Error getting project tasks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects/:projectId/tasks', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { text, stage, origin, sourceId, completed, notes, priority, dueDate, owner, status } = req.body;
    
    const task = await projectsDb.createTask({
      id: uuidv4(),
      projectId,
      text,
      stage: stage || 'identification',
      origin: origin || 'custom',
      sourceId,
      completed: Boolean(completed),
      notes,
      priority,
      dueDate,
      owner,
      status: status || 'To Do'
    });
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating project task:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Note: We're not using the standard route handler for PUT /projects/:projectId/tasks/:taskId
// as it's being intercepted by our task persistence patch above
// This provides proper camelCase to snake_case mapping for all task updates

router.delete('/projects/:projectId/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await projectsDb.deleteTask(taskId);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting project task:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Project plan routes
router.get('/projects/:projectId/plan', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const plan = await projectsDb.getPlan(projectId);
    res.json(plan);
  } catch (error) {
    console.error('Error getting project plan:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/projects/:projectId/plan/:blockKey', requireAuth, async (req, res) => {
  try {
    const { projectId, blockKey } = req.params;
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const updatedPlan = await projectsDb.updatePlanBlock(projectId, blockKey, req.body);
    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating project plan block:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;