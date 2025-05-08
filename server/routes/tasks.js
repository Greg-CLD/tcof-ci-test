import express from "express";
import { projectsDb } from "../projectsDb.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

/**
 * GET /api/projects/:projectId/tasks
 * Get all tasks for a specific project
 */
router.get("/:projectId/tasks", isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user owns this project
    if (project.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to project" });
    }
    
    // Get tasks for this project
    const tasks = await projectsDb.getProjectTasks(projectId);
    
    console.log(`Found ${tasks.length} tasks for project ${projectId}`);
    
    return res.json(tasks);
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/projects/:projectId/tasks
 * Create a new task for a project
 */
router.post("/:projectId/tasks", isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { text, stage, origin, sourceId, completed } = req.body;
    
    // Validate required fields
    if (!text) {
      return res.status(400).json({ message: "Task text is required" });
    }
    
    if (!stage || !['identification', 'definition', 'delivery', 'closure'].includes(stage)) {
      return res.status(400).json({ message: "Valid stage is required (identification, definition, delivery, closure)" });
    }
    
    if (!origin || !['heuristic', 'factor'].includes(origin)) {
      return res.status(400).json({ message: "Valid origin is required (heuristic, factor)" });
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
    
    // Create new task
    const newTask = await projectsDb.createProjectTask({
      projectId,
      text,
      stage,
      origin,
      sourceId,
      completed: completed || false
    });
    
    if (!newTask) {
      return res.status(500).json({ message: "Failed to create task" });
    }
    
    console.log(`Created new task ${newTask.id} for project ${projectId}`);
    
    return res.status(201).json(newTask);
  } catch (error) {
    console.error("Error creating project task:", error);
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
    const { text, stage, completed } = req.body;
    
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
    const tasks = await projectsDb.getProjectTasks(projectId);
    
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
    const tasks = await projectsDb.getProjectTasks(projectId);
    
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