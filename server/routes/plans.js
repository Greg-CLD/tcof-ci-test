// plans.js - Routes for plan data management
import express from 'express';
import { db } from '../../db/index.js';
import { plans } from '@shared/schema.ts';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// GET a plan by project ID
router.get('/project/:projectId', isAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    // Find the plan associated with this project
    const [plan] = await db.select().from(plans)
      .where(and(
        eq(plans.projectId, projectId),
        eq(plans.userId, req.user.id)
      ));

    if (!plan) {
      // Return empty plan structure if no plan exists yet
      return res.status(200).json({
        id: null,
        projectId,
        blocks: {
          block1: {
            successFactors: [],
            personalHeuristics: [],
            completed: false
          },
          block2: {
            tasks: [],
            stakeholders: [],
            completed: false
          },
          block3: {
            timeline: null,
            deliveryApproach: "",
            deliveryNotes: "",
            completed: false
          }
        }
      });
    }

    return res.status(200).json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    return res.status(500).json({ message: "Failed to fetch plan" });
  }
});

// POST to create or update a plan
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { projectId, blocks, name } = req.body;
    
    if (!projectId || !blocks) {
      return res.status(400).json({ message: "Project ID and blocks data are required" });
    }

    // Check if a plan for this project already exists
    const [existingPlan] = await db.select().from(plans)
      .where(and(
        eq(plans.projectId, projectId),
        eq(plans.userId, req.user.id)
      ));

    let plan;
    
    if (existingPlan) {
      // Update existing plan
      const [updatedPlan] = await db.update(plans)
        .set({
          blocks,
          name: name || existingPlan.name,
          updatedAt: new Date()
        })
        .where(eq(plans.id, existingPlan.id))
        .returning();
      
      plan = updatedPlan;
    } else {
      // Create new plan
      const [newPlan] = await db.insert(plans)
        .values({
          projectId,
          userId: req.user.id,
          name: name || `Plan for Project ${projectId}`,
          blocks
        })
        .returning();
      
      plan = newPlan;
    }

    return res.status(200).json(plan);
  } catch (error) {
    console.error('Error saving plan:', error);
    return res.status(500).json({ message: "Failed to save plan" });
  }
});

// PATCH to update a specific block of a plan
router.patch('/:planId/block/:blockId', isAuthenticated, async (req, res) => {
  try {
    const { planId, blockId } = req.params;
    const blockData = req.body;
    
    if (!blockData) {
      return res.status(400).json({ message: "Block data is required" });
    }

    // Get the current plan
    const [existingPlan] = await db.select().from(plans)
      .where(eq(plans.id, planId));

    if (!existingPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Make sure the user owns this plan
    if (existingPlan.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized access to plan" });
    }

    // Update the specific block
    const updatedBlocks = {...existingPlan.blocks};
    
    if (!updatedBlocks[blockId]) {
      return res.status(400).json({ message: `Invalid block ID: ${blockId}` });
    }
    
    updatedBlocks[blockId] = {
      ...updatedBlocks[blockId],
      ...blockData
    };

    // Save the updated plan
    const [updatedPlan] = await db.update(plans)
      .set({
        blocks: updatedBlocks,
        updatedAt: new Date()
      })
      .where(eq(plans.id, planId))
      .returning();

    return res.status(200).json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan block:', error);
    return res.status(500).json({ message: "Failed to update plan block" });
  }
});

// Export router as default
export default router;