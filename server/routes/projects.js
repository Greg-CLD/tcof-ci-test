import express from "express";
import { db } from "@db";
import { projects } from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isOrgMember } from "../middlewares/isOrgMember.js";
import { isValidUUID, isNumericId, convertNumericIdToUuid } from "../utils/uuid-utils.js";
import { v4 as uuidv4 } from 'uuid';
import { projectsDb } from '../projectsDb.ts';
import { cloneAllSuccessFactorTasks } from '../cloneSuccessFactors.ts';

/**
 * Middleware to validate a project ID
 * This ensures only UUID format project IDs are accepted
 */
function validateProjectId(req, res, next) {
  const projectId = req.params.projectId || req.params.id || req.body.projectId;
  
  if (!projectId) {
    // ID wasn't provided, proceed to next middleware (which may handle the error)
    return next();
  }
  
  // Check if it's a numeric ID
  if (isNumericId(projectId)) {
    console.error(`Rejected request with numeric project ID: ${projectId}`);
    return res.status(400).json({ 
      message: "Invalid project ID format. Numeric IDs are no longer supported.", 
      error: "NUMERIC_ID_NOT_SUPPORTED",
      projectId
    });
  }
  
  // Check if it's a valid UUID
  if (!isValidUUID(projectId)) {
    console.error(`Rejected request with invalid project ID format: ${projectId}`);
    return res.status(400).json({ 
      message: "Invalid project ID format. Must be a valid UUID.", 
      error: "INVALID_UUID_FORMAT",
      projectId
    });
  }
  
  // Valid UUID provided, continue
  next();
}

const router = express.Router();

/**
 * GET /api/projects/debug/list
 * Debug endpoint to log all project IDs and types
 */
router.get("/debug/list", isAuthenticated, async (req, res) => {
  try {
    // Load all projects
    const projects = await db.query.projects.findMany();
    
    console.log("\n=== Project ID Debug List ===");
    projects.forEach(project => {
      const idType = project.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) 
        ? "UUID" 
        : "number";
      console.log(`ID: ${project.id} (${idType}) - Name: ${project.name}`);
    });
    console.log("=== End Project List ===\n");
    
    return res.json({ message: "Project list logged to server console" });
  } catch (error) {
    console.error("Error logging projects:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

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
router.get("/:id", isAuthenticated, validateProjectId, async (req, res) => {
  try {
    const rawProjectId = req.params.id;
    
    // Log the request
    console.log(`Fetching detailed project: ${rawProjectId}`);
    
    // If we've reached here, the ID passed validation
    // Attempt to find by direct UUID match or convert numeric ID to UUID
    let projectId = rawProjectId;
    
    // If it's a numeric ID (shouldn't happen with middleware) convert it
    if (isNumericId(rawProjectId)) {
      projectId = convertNumericIdToUuid(rawProjectId);
      console.log(`Converted numeric ID ${rawProjectId} to UUID ${projectId}`);
    }
    
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
router.put("/:id", isAuthenticated, validateProjectId, async (req, res) => {
  try {
    const rawProjectId = req.params.id;
    console.log('Updating project', rawProjectId, req.body);
    
    // If we've reached here, the ID passed validation
    // Attempt to find by direct UUID match or convert numeric ID to UUID
    let projectId = rawProjectId;
    
    // If it's a numeric ID (shouldn't happen with middleware) convert it
    if (isNumericId(rawProjectId)) {
      projectId = convertNumericIdToUuid(rawProjectId);
      console.log(`Converted numeric ID ${rawProjectId} to UUID ${projectId}`);
    }
    
    // First, check if project exists and user has permission
    console.log(`Getting project with ID: ${projectId}`);
    
    // Find the project
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
    const { 
      name, 
      description, 
      sector, 
      orgType, 
      currentStage, 
      customSector, 
      teamSize,
      isProfileComplete,
      industry,
      organisationSize
    } = req.body;
    
    // Build update object with only provided fields
    const updateData = {};
    
    // Only include fields that are provided in the request
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sector !== undefined) updateData.sector = sector;
    if (orgType !== undefined) updateData.orgType = orgType;
    if (currentStage !== undefined) updateData.currentStage = currentStage;
    if (customSector !== undefined) updateData.customSector = customSector;
    if (teamSize !== undefined) updateData.teamSize = teamSize;
    if (isProfileComplete !== undefined) updateData.isProfileComplete = isProfileComplete;
    if (industry !== undefined) updateData.industry = industry;
    if (organisationSize !== undefined) updateData.organisationSize = organisationSize;
    
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
router.delete("/:id", isAuthenticated, validateProjectId, async (req, res) => {
  try {
    const rawProjectId = req.params.id;
    
    // If we've reached here, the ID passed validation
    // Attempt to find by direct UUID match or convert numeric ID to UUID
    let projectId = rawProjectId;
    
    // If it's a numeric ID (shouldn't happen with middleware) convert it
    if (isNumericId(rawProjectId)) {
      projectId = convertNumericIdToUuid(rawProjectId);
      console.log(`Converted numeric ID ${rawProjectId} to UUID ${projectId}`);
    }
    
    console.log(`Attempting to delete project with ID: ${projectId}`);
    
    // Find the project first to verify it exists and user has permission
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId)
    });
    
    if (!project) {
      console.log(`Project not found for deletion: ${projectId}`);
      return res.status(404).json({ 
        message: "Project not found", 
        details: `No project found with ID: ${projectId}`
      });
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
    
    // Perform the deletion using the validated project ID
    const result = await db.delete(projects).where(eq(projects.id, projectId));
    
    console.log(`Project deletion result:`, result);
    
    if (!result || result.length === 0) {
      return res.status(500).json({ 
        message: "Failed to delete project", 
        details: "Database operation succeeded but no rows were affected" 
      });
    }
    
    return res.status(200).json({ 
      message: "Project deleted successfully", 
      id: projectId
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const projectData = req.body;
    
    console.log(`Creating project for user ${userId}:`, projectData);
    
    // Generate a UUID for the project ID
    const projectId = uuidv4();
    
    // Create a project record with the Drizzle ORM
    const [newProject] = await db.insert(projects)
      .values({
        id: projectId,
        userId: userId,
        name: projectData.name || 'New Project',
        description: projectData.description || '',
        sector: projectData.sector || '',
        customSector: projectData.customSector || '',
        orgType: projectData.orgType || '',
        teamSize: projectData.teamSize || '',
        currentStage: projectData.currentStage || '',
        organisationId: projectData.organisationId || null,
        industry: projectData.industry || '',
        organisationSize: projectData.organisationSize || '',
        isProfileComplete: projectData.isProfileComplete || false,
        createdAt: new Date(),
        lastUpdated: new Date()
      })
      .returning();

    if (!newProject) {
      console.error(`Failed to create project for user ${userId}`);
      return res.status(500).json({ message: "Failed to create project" });
    }

    console.log(`Successfully created project ${newProject.id} for user ${userId}`);

    try {
      await cloneAllSuccessFactorTasks(newProject.id);
    } catch (cloneErr) {
      console.error("Error cloning Success Factor tasks:", cloneErr);
    }

    // Clear the projects cache in the session if it exists
    if (req.user.projects) {
      delete req.user.projects;
    }
    
    return res.status(201).json(newProject);
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(500).json({ 
      message: "Internal server error", 
      error: error.message
    });
  }
});

export default router;