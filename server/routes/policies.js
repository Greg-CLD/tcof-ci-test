import express from "express";
import { projectsDb } from "../projectsDb.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

/**
 * GET /api/projects/:projectId/policies
 * Get all policies for a specific project
 */
router.get("/:projectId/policies", isAuthenticated, async (req, res) => {
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
    
    // Get policies for this project
    const policies = await projectsDb.getProjectPolicies(projectId);
    
    console.log(`Found ${policies.length} policies for project ${projectId}`);
    
    return res.json(policies);
  } catch (error) {
    console.error("Error fetching project policies:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/projects/:projectId/policies
 * Create a new policy for a project
 */
router.post("/:projectId/policies", isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { name } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Policy name is required" });
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
    
    // Create new policy
    const newPolicy = await projectsDb.createProjectPolicy({
      projectId,
      name
    });
    
    if (!newPolicy) {
      return res.status(500).json({ message: "Failed to create policy" });
    }
    
    console.log(`Created new policy ${newPolicy.id} for project ${projectId}`);
    
    return res.status(201).json(newPolicy);
  } catch (error) {
    console.error("Error creating project policy:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * PUT /api/projects/:projectId/policies/:policyId
 * Update a specific policy
 */
router.put("/:projectId/policies/:policyId", isAuthenticated, async (req, res) => {
  try {
    const { projectId, policyId } = req.params;
    const userId = req.user.id;
    const { name } = req.body;
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user owns this project
    if (project.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to project" });
    }
    
    // Get all project policies
    const policies = await projectsDb.getProjectPolicies(projectId);
    
    // Find the specific policy
    const policy = policies.find(p => p.id === policyId);
    
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    
    // Create update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    
    // Update the policy
    const updatedPolicy = await projectsDb.updateProjectPolicy(policyId, updateData);
    
    if (!updatedPolicy) {
      return res.status(500).json({ message: "Failed to update policy" });
    }
    
    console.log(`Updated policy ${policyId} for project ${projectId}`);
    
    return res.json(updatedPolicy);
  } catch (error) {
    console.error("Error updating project policy:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * DELETE /api/projects/:projectId/policies/:policyId
 * Delete a specific policy and its associated tasks
 */
router.delete("/:projectId/policies/:policyId", isAuthenticated, async (req, res) => {
  try {
    const { projectId, policyId } = req.params;
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
    
    // Get all project policies
    const policies = await projectsDb.getProjectPolicies(projectId);
    
    // Find the specific policy
    const policy = policies.find(p => p.id === policyId);
    
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    
    // Delete the policy (this will also delete associated tasks)
    const result = await projectsDb.deleteProjectPolicy(policyId);
    
    if (!result) {
      return res.status(500).json({ message: "Failed to delete policy" });
    }
    
    console.log(`Deleted policy ${policyId} from project ${projectId}`);
    
    return res.json({ message: "Policy deleted successfully", id: policyId });
  } catch (error) {
    console.error("Error deleting project policy:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;