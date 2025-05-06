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

export default router;