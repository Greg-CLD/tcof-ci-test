import express from "express";
import { db } from "@db";
import { projects } from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isOrgMember } from "../middlewares/isOrgMember.js";

const router = express.Router();

/**
 * GET /api/projects
 * Get all projects for the logged-in user (across all organisations)
 */
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`Found ${req.user.projects?.length || 0} projects for user ${userId}`);
    
    // Return user projects if already loaded with session
    if (req.user.projects?.length) {
      return res.json(req.user.projects);
    }
    
    // Otherwise, fetch from database
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, userId),
      orderBy: (projects, { desc }) => [desc(projects.lastUpdated)],
    });
    
    console.log(`Found ${userProjects.length} projects for user ${userId}`);
    
    // Cache projects in session
    req.user.projects = userProjects;
    
    return res.json(userProjects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    console.log(`Fetching detailed project: ${projectId}`);
    
    // Find the project
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId)
    });
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is authorized to view this project
    // If project has an organisationId, user must be a member of that organisation
    if (project.organisationId) {
      // We use isOrgMember middleware functionality directly
      try {
        const organisationId = project.organisationId;
        const userId = req.user.id;
        
        // Check if user is a member of this org
        const membership = await db.query.organisationMemberships.findFirst({
          where: (memberships, { and, eq }) => 
            and(
              eq(memberships.userId, userId),
              eq(memberships.organisationId, organisationId)
            )
        });
        
        if (!membership) {
          return res.status(403).json({ message: "You don't have permission to access this project" });
        }
      } catch (error) {
        console.error("Error checking org membership:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    } 
    // If project doesn't have organisationId, must be user's own project
    else if (project.userId !== req.user.id) {
      return res.status(403).json({ message: "You don't have permission to access this project" });
    }
    
    return res.json(project);
  } catch (error) {
    console.error("Error fetching project details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * PUT /api/projects/:id
 * Update a specific project by ID
 */
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    console.log('Updating project', req.params.id, req.body);
    
    // Get the project ID as integer (since our schema uses serial)
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      console.error(`Invalid project ID format: ${req.params.id}`);
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    // First, check if project exists and user has permission
    console.log(`Getting project with ID: ${projectId} (type: ${typeof projectId})`);
    
    // Find the project
    const allProjects = await db.query.projects.findMany();
    console.log("Available projects:", allProjects.map(p => ({ id: p.id, type: typeof p.id })));
    
    // Debug log to check all project IDs
    for (const project of allProjects) {
      console.log(`Comparing project ID: ${project.id} (${typeof project.id}) with searchId: ${projectId} (${typeof projectId})`);
    }
    
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId)
    });
    
    if (!project) {
      console.error(`Project with ID ${projectId} not found`);
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is authorized to edit this project
    if (project.organisationId) {
      // For organisation projects, check membership
      try {
        const organisationId = project.organisationId;
        const userId = req.user.id;
        
        // Check if user is a member of this org
        const membership = await db.query.organisationMemberships.findFirst({
          where: (memberships, { and, eq }) => 
            and(
              eq(memberships.userId, userId),
              eq(memberships.organisationId, organisationId)
            )
        });
        
        if (!membership) {
          return res.status(403).json({ message: "You don't have permission to edit this project" });
        }
      } catch (error) {
        console.error("Error checking org membership for project update:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    } 
    // For personal projects, check ownership
    else if (project.userId !== req.user.id) {
      return res.status(403).json({ message: "You don't have permission to edit this project" });
    }
    
    // Extract the fields we want to update
    const { sector, orgType, currentStage, customSector, isProfileComplete } = req.body;
    
    // Build update object with only provided fields
    const updateData = {};
    
    // Only include fields that are provided in the request
    if (sector !== undefined) updateData.sector = sector;
    if (orgType !== undefined) updateData.orgType = orgType;
    if (currentStage !== undefined) updateData.currentStage = currentStage;
    if (customSector !== undefined) updateData.customSector = customSector;
    if (isProfileComplete !== undefined) updateData.isProfileComplete = isProfileComplete;
    
    // Add lastUpdated field
    updateData.lastUpdated = new Date();
    
    console.log('Updating project with data:', updateData);
    
    // Perform the update
    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();
    
    console.log('Project updated successfully:', updatedProject);
    
    return res.status(200).json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a specific project by ID
 */
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      console.log(`Invalid project ID format for deletion: ${req.params.id}`);
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    console.log(`Attempting to delete project: ${projectId}`);
    
    // Find the project first to verify it exists and user has permission
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId)
    });
    
    if (!project) {
      console.log(`Project not found for deletion: ${projectId}`);
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if user is authorized to delete this project
    if (project.organisationId) {
      // We use isOrgMember middleware functionality directly
      try {
        const organisationId = project.organisationId;
        const userId = req.user.id;
        
        // Check if user is a member of this org with appropriate permissions
        const membership = await db.query.organisationMemberships.findFirst({
          where: (memberships, { and, eq }) => 
            and(
              eq(memberships.userId, userId),
              eq(memberships.organisationId, organisationId)
            )
        });
        
        if (!membership) {
          return res.status(403).json({ message: "You don't have permission to delete this project" });
        }
        
        // Only admin or owner can delete projects
        if (membership.role !== 'admin' && membership.role !== 'owner') {
          return res.status(403).json({
            message: "Only organization admins or owners can delete projects"
          });
        }
      } catch (error) {
        console.error("Error checking org membership for deletion:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    } 
    // If project doesn't have organisationId, must be user's own project
    else if (project.userId !== req.user.id) {
      return res.status(403).json({ message: "You don't have permission to delete this project" });
    }
    
    // Perform the deletion
    const result = await db.delete(projects).where(eq(projects.id, projectId));
    
    console.log(`Project deletion result:`, result);
    
    return res.status(204).end();
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;