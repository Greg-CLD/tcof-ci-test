import { Router } from 'express';
import { db } from '../../../db.js';
import { plans } from '../../../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../../../middlewares/auth.js';

const router = Router();

/**
 * PATCH to update a specific block of a plan for a project, creating the plan if it doesn't exist
 */
router.patch('/api/plans/project/:projectId/block/:blockId', isAuthenticated, async (req, res) => {
  try {
    const { projectId, blockId } = req.params;
    const blockData = req.body;
    
    if (!blockData) {
      return res.status(400).json({ message: "Block data is required" });
    }

    // Check if a plan for this project already exists
    const [existingPlan] = await db.select().from(plans)
      .where(and(
        eq(plans.projectId, projectId),
        eq(plans.userId, req.user.id)
      ));
    
    if (existingPlan) {
      // Update the specific block
      const updatedBlocks = {...existingPlan.blocks};
      
      if (!updatedBlocks[blockId]) {
        updatedBlocks[blockId] = {};
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
        .where(eq(plans.id, existingPlan.id))
        .returning();

      return res.status(200).json(updatedPlan);
    } else {
      // Create a new plan with the provided block data
      const initialBlocks = {
        [blockId]: blockData
      };
      
      const [newPlan] = await db.insert(plans)
        .values({
          projectId,
          userId: req.user.id,
          name: `Plan for Project ${projectId}`,
          blocks: initialBlocks
        })
        .returning();
      
      return res.status(201).json(newPlan);
    }
  } catch (error) {
    console.error('Error updating plan block:', error);
    return res.status(500).json({ message: "Failed to update plan block" });
  }
});

// Export router
export default router;