import express, { Request, Response } from "express";
import { personalHeuristics, personalHeuristicInsertSchema, type InsertPersonalHeuristic } from "@shared/schema";
import { db } from "../../../db";
import { isAuthenticated } from "../../../middleware/auth";
import { sql } from "drizzle-orm";
import { z } from "zod";

const router = express.Router();

/**
 * GET /api/projects/:projectId/heuristics
 * Get all personal heuristics for a project
 */
router.get("/:projectId/heuristics", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    console.log(`→ GET /api/projects/${projectId}/heuristics`);

    // Check if table exists
    try {
      // Convert projectId to number
      const numericProjectId = parseInt(projectId, 10);
      if (isNaN(numericProjectId)) {
        return res.status(400).json({ error: true, message: "Invalid project ID" });
      }

      // Fetch all heuristics for this project
      const result = await db.query.personalHeuristics.findMany({
        where: (heuristic, { eq }) => eq(heuristic.projectId, numericProjectId)
      });

      // Return the heuristics
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching heuristics:", error);
      return res.status(500).json({ error: true, message: "Error fetching heuristics" });
    }
  } catch (error) {
    console.error("Error in GET /personal-heuristics:", error);
    return res.status(500).json({ error: true, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Validation schema for creating heuristics
const createHeuristicSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  favourite: z.boolean().optional().default(false)
});

/**
 * POST /api/projects/:projectId/heuristics
 * Create a new personal heuristic
 */
router.post("/:projectId/heuristics", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    console.log(`→ POST /api/projects/${projectId}/heuristics`);
    console.log("Request body:", req.body);

    // Validate request body
    let validatedData;
    try {
      validatedData = createHeuristicSchema.parse(req.body);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return res.status(400).json({ 
        error: true, 
        message: "Invalid heuristic data", 
        details: validationError instanceof z.ZodError ? validationError.errors : undefined 
      });
    }

    // Convert projectId to number
    const numericProjectId = parseInt(projectId, 10);
    if (isNaN(numericProjectId)) {
      return res.status(400).json({ error: true, message: "Invalid project ID" });
    }

    // Insert the heuristic
    const heuristicToInsert: InsertPersonalHeuristic = {
      projectId: numericProjectId,
      name: validatedData.name,
      description: validatedData.description || "",
      favourite: validatedData.favourite || false
    };

    console.log("Inserting heuristic:", heuristicToInsert);

    const result = await db
      .insert(personalHeuristics)
      .values(heuristicToInsert)
      .returning();

    // Return the newly created heuristic
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error in POST /personal-heuristics:", error);
    return res.status(500).json({ error: true, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

/**
 * PUT /api/projects/:projectId/heuristics/:heuristicId
 * Update an existing personal heuristic
 */
router.put("/:projectId/heuristics/:heuristicId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, heuristicId } = req.params;
    console.log(`→ PUT /api/projects/${projectId}/heuristics/${heuristicId}`);
    console.log("Request body:", req.body);

    // Validate request body
    let validatedData;
    try {
      validatedData = createHeuristicSchema.parse(req.body);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return res.status(400).json({ 
        error: true, 
        message: "Invalid heuristic data", 
        details: validationError instanceof z.ZodError ? validationError.errors : undefined 
      });
    }

    // Convert projectId to number
    const numericProjectId = parseInt(projectId, 10);
    if (isNaN(numericProjectId)) {
      return res.status(400).json({ error: true, message: "Invalid project ID" });
    }

    // Check if heuristic exists and belongs to this project
    const existingHeuristic = await db.query.personalHeuristics.findFirst({
      where: (heuristic, { eq, and }) => 
        and(
          eq(heuristic.id, heuristicId),
          eq(heuristic.projectId, numericProjectId)
        )
    });

    if (!existingHeuristic) {
      return res.status(404).json({ error: true, message: "Heuristic not found or does not belong to this project" });
    }

    // Update the heuristic
    console.log(`Updating heuristic with ID ${heuristicId}`);
    const result = await db
      .update(personalHeuristics)
      .set({
        name: validatedData.name,
        description: validatedData.description || "",
        favourite: validatedData.favourite || false,
        updatedAt: new Date()
      })
      .where(sql`${personalHeuristics.id} = ${heuristicId}`)
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: true, message: "Heuristic not found" });
    }

    // Return the updated heuristic
    return res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error in PUT /personal-heuristics:", error);
    return res.status(500).json({ error: true, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

/**
 * DELETE /api/projects/:projectId/heuristics/:heuristicId
 * Delete a personal heuristic
 */
router.delete("/:projectId/heuristics/:heuristicId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, heuristicId } = req.params;
    console.log(`→ DELETE /api/projects/${projectId}/heuristics/${heuristicId}`);

    // Convert projectId to number
    const numericProjectId = parseInt(projectId, 10);
    if (isNaN(numericProjectId)) {
      return res.status(400).json({ error: true, message: "Invalid project ID" });
    }

    // Check if heuristic exists and belongs to this project
    const existingHeuristic = await db.query.personalHeuristics.findFirst({
      where: (heuristic, { eq, and }) => 
        and(
          eq(heuristic.id, heuristicId),
          eq(heuristic.projectId, numericProjectId)
        )
    });

    if (!existingHeuristic) {
      return res.status(404).json({ error: true, message: "Heuristic not found or does not belong to this project" });
    }

    // Delete the heuristic
    await db
      .delete(personalHeuristics)
      .where(sql`${personalHeuristics.id} = ${heuristicId}`);

    // Return success
    return res.status(200).json({ success: true, message: "Heuristic deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /personal-heuristics:", error);
    return res.status(500).json({ error: true, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;