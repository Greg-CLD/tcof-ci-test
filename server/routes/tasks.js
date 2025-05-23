import express from "express";
import { projectsDb } from "../projectsDb.ts";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
// Use CommonJS require for uuid-utils
const { isValidUUID, isNumericId, convertNumericIdToUuid } = require("../utils/uuid-utils.cjs");

const router = express.Router();

/**
 * GET /api/projects/:projectId/tasks
 * Get all tasks for a specific project
 */
router.get("/:projectId/tasks", async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    // Validate project ID format
    if (isNumericId(projectId)) {
      // For backward compatibility - convert to UUID if it's a numeric ID
      console.log(`Converting numeric project ID ${projectId} to UUID format`);
      const uuidProjectId = convertNumericIdToUuid(projectId);
      // Get tasks for this project directly from database using the converted UUID
      const tasks = await projectsDb.getTasksForProject(uuidProjectId);
      console.log(`Found ${tasks.length} tasks for converted project ${uuidProjectId} (from ${projectId})`);
      return res.json(tasks);
    } else if (!isValidUUID(projectId)) {
      console.error(`Invalid project ID format: ${projectId}`);
      return res.status(400).json({ 
        message: "Invalid project ID format",
        details: "Project ID must be a valid UUID"
      });
    }
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user owns this project
    if (project.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to project" });
    }
    
    // Get tasks for this project directly from database
    const tasks = await projectsDb.getTasksForProject(projectId);
    
    console.log(`Found ${tasks.length} tasks for project ${projectId} in database`);
    
    return res.json(tasks);
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/projects/:projectId/tasks
 * Create a new task for a project or update task status without a plan
 * 
 * Two modes of operation:
 * 1. Traditional task creation - requires text, stage, origin, sourceId
 * 2. Plan-free task update - requires taskId, updates, stage, source
 */
router.post("/:projectId/tasks", isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    // Validate project ID format
    if (isNumericId(projectId)) {
      // For backward compatibility - convert to UUID if it's a numeric ID
      console.log(`Converting numeric project ID ${projectId} to UUID format for task creation`);
      const uuidProjectId = convertNumericIdToUuid(projectId);
      
      // Redirect to the UUID version of the endpoint
      // This maintains compatibility while enforcing UUID usage
      return res.status(307).json({
        message: "Project ID format has been updated",
        details: "Please use UUID format for project IDs",
        redirectTo: `/api/projects/${uuidProjectId}/tasks`
      });
    } else if (!isValidUUID(projectId)) {
      console.error(`Invalid project ID format for task creation: ${projectId}`);
      return res.status(400).json({ 
        message: "Invalid project ID format",
        details: "Project ID must be a valid UUID"
      });
    }
    
    // Check if we're in plan-free update mode (from Checklist.tsx)
    if (req.body.taskId && req.body.updates) {
      const { taskId, updates, stage, source } = req.body;
      
      console.log(`[TASK API] Plan-free task update for ${taskId} in project ${projectId}:`, updates);
      
      // Check if project exists and user has access
      const project = await projectsDb.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check access permissions
      if (project.userId !== userId) {
        // Add organization check here if needed
        return res.status(403).json({ message: "Unauthorized access to project" });
      }
      
      try {
        // Find existing task record or create a new one
        const existingTasks = await projectsDb.getProjectTasksBySourceId(projectId, taskId);
        const existingTask = existingTasks.length > 0 ? existingTasks[0] : null;
        
        if (existingTask) {
          // Update the existing task
          const updateData = {
            ...updates,
            sourceId: taskId,
            stage: stage.toLowerCase(),
            // Make sure we handle all possible fields
            notes: updates.notes,
            priority: updates.priority,
            dueDate: updates.dueDate,
            owner: updates.owner,
            status: updates.status
          };
          
          const updatedTask = await projectsDb.updateProjectTask(existingTask.id, updateData);
          
          return res.status(200).json({
            message: "Task updated successfully",
            success: true,
            task: updatedTask
          });
        } else {
          // Create a new task record
          const newTask = await projectsDb.createProjectTask({
            projectId,
            text: `Task for ${source} ${taskId}`, // Generic text as placeholder
            stage: stage.toLowerCase(),
            origin: source,
            sourceId: taskId,
            completed: updates.completed || false,
            notes: updates.notes || '',
            priority: updates.priority || 'medium',
            dueDate: updates.dueDate,
            owner: updates.owner || '',
            status: updates.status || 'To Do'
          });
          
          return res.status(201).json({
            message: "Task created successfully",
            success: true,
            task: newTask
          });
        }
      } catch (error) {
        console.error("Error updating task:", error);
        return res.status(500).json({ 
          message: "Failed to update task", 
          error: error.message 
        });
      }
    } else {
      // Traditional task creation
      const { text, stage, origin, sourceId, completed } = req.body;
      
      // Validate required fields for traditional task creation
      if (!text) {
        return res.status(400).json({ message: "Task text is required" });
      }
      
      if (!stage || !['identification', 'definition', 'delivery', 'closure'].includes(stage)) {
        return res.status(400).json({ message: "Valid stage is required (identification, definition, delivery, closure)" });
      }
      
      if (!origin || !['heuristic', 'factor', 'policy', 'custom', 'framework'].includes(origin)) {
        return res.status(400).json({ message: "Valid origin is required (heuristic, factor, policy, custom, framework)" });
      }
      
      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }
      
      // Check if project exists and user has access
      const project = await projectsDb.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user owns this project
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to project" });
      }
      
      // Create new task with all possible properties
      const newTask = await projectsDb.createProjectTask({
        projectId,
        text,
        stage,
        origin,
        sourceId,
        completed: completed || false,
        notes: req.body.notes || '',
        priority: req.body.priority || 'medium',
        dueDate: req.body.dueDate,
        owner: req.body.owner || '',
        status: req.body.status || (completed ? 'Done' : 'To Do')
      });
      
      if (!newTask) {
        return res.status(500).json({ message: "Failed to create task" });
      }
      
      console.log(`Created new task ${newTask.id} for project ${projectId}`);
      
      return res.status(201).json(newTask);
    }
  } catch (error) {
    console.error("Error handling task request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * PUT /api/projects/:projectId/tasks/:taskId
 * Update a specific task
 */
router.put("/:projectId/tasks/:taskId", isAuthenticated, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const userId = req.user.id;
    
    // Validate project ID format
    if (isNumericId(projectId)) {
      // For backward compatibility - convert to UUID if it's a numeric ID
      console.log(`Converting numeric project ID ${projectId} to UUID format for task update`);
      const uuidProjectId = convertNumericIdToUuid(projectId);
      
      // Redirect to the UUID version of the endpoint
      return res.status(307).json({
        message: "Project ID format has been updated",
        details: "Please use UUID format for project IDs",
        redirectTo: `/api/projects/${uuidProjectId}/tasks/${taskId}`
      });
    } else if (!isValidUUID(projectId)) {
      console.error(`Invalid project ID format for task update: ${projectId}`);
      return res.status(400).json({ 
        message: "Invalid project ID format",
        details: "Project ID must be a valid UUID"
      });
    }
    
    const { 
      text, 
      stage, 
      completed, 
      notes,
      priority,
      dueDate,
      owner,
      status,
      sourceId 
    } = req.body;
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user owns this project
    if (project.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to project" });
    }
    
    // Get all project tasks
    const tasks = await projectsDb.getTasksForProject(projectId);
    
    // Find the specific task
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Create update object with only provided fields
    const updateData = {};
    if (text !== undefined) updateData.text = text;
    if (stage !== undefined) updateData.stage = stage;
    if (completed !== undefined) updateData.completed = completed;
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (owner !== undefined) updateData.owner = owner;
    if (status !== undefined) updateData.status = status;
    if (sourceId !== undefined) updateData.sourceId = sourceId;
    
    // Update the task
    const updatedTask = await projectsDb.updateProjectTask(taskId, updateData);
    
    if (!updatedTask) {
      return res.status(500).json({ message: "Failed to update task" });
    }
    
    console.log(`Updated task ${taskId} for project ${projectId}`);
    
    return res.json(updatedTask);
  } catch (error) {
    console.error("Error updating project task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * DELETE /api/projects/:projectId/tasks/:taskId
 * Delete a specific task
 */
router.delete("/:projectId/tasks/:taskId", isAuthenticated, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const userId = req.user.id;
    
    // Validate project ID format
    if (isNumericId(projectId)) {
      // For backward compatibility - convert to UUID if it's a numeric ID
      console.log(`Converting numeric project ID ${projectId} to UUID format for task deletion`);
      const uuidProjectId = convertNumericIdToUuid(projectId);
      
      // Redirect to the UUID version of the endpoint
      return res.status(307).json({
        message: "Project ID format has been updated",
        details: "Please use UUID format for project IDs",
        redirectTo: `/api/projects/${uuidProjectId}/tasks/${taskId}`
      });
    } else if (!isValidUUID(projectId)) {
      console.error(`Invalid project ID format for task deletion: ${projectId}`);
      return res.status(400).json({ 
        message: "Invalid project ID format",
        details: "Project ID must be a valid UUID"
      });
    }
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user owns this project
    if (project.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to project" });
    }
    
    // Get all project tasks
    const tasks = await projectsDb.getTasksForProject(projectId);
    
    // Find the specific task
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Delete the task
    const result = await projectsDb.deleteProjectTask(taskId);
    
    if (!result) {
      return res.status(500).json({ message: "Failed to delete task" });
    }
    
    console.log(`Deleted task ${taskId} from project ${projectId}`);
    
    return res.json({ message: "Task deleted successfully", id: taskId });
  } catch (error) {
    console.error("Error deleting project task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;