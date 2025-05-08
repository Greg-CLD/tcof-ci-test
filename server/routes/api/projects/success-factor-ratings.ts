import express from 'express';
import { db } from '@db';
import { successFactorRatings, successFactorRatingInsertSchema } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../../../middlewares/isAuthenticated';
import { z } from 'zod';

const router = express.Router();

// Define a Zod schema for validation
const ratingSchema = z.object({
  factorId: z.string().min(1, "Factor ID is required"),
  resonance: z.union([
    z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    z.string().transform(val => {
      const num = parseInt(val);
      if (isNaN(num)) throw new Error("Rating must be a valid number");
      return num;
    })
  ]),
  notes: z.string().optional(),
});

// Type for a collection of ratings
const ratingsArraySchema = z.array(ratingSchema);

// GET /api/projects/:projectId/success-factor-ratings
router.get('/:projectId/success-factor-ratings', isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Verify project exists and user has access
    const projectExists = await db.query.projects.findFirst({
      where: eq(db.projects.id, parseInt(projectId)),
    });
    
    if (!projectExists) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has access to this project
    const userId = (req.user as any).id;
    if (projectExists.userId !== userId) {
      // Check if this is an organization project and if user is a member
      if (projectExists.organisationId) {
        const isMember = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(db.organisationMemberships.userId, userId),
            eq(db.organisationMemberships.organisationId, projectExists.organisationId)
          ),
        });
        
        if (!isMember) {
          return res.status(403).json({ message: 'Unauthorized access to project' });
        }
      } else {
        return res.status(403).json({ message: 'Unauthorized access to project' });
      }
    }
    
    // Fetch ratings for this project
    const ratings = await db.query.successFactorRatings.findMany({
      where: eq(successFactorRatings.projectId, parseInt(projectId)),
    });
    
    return res.status(200).json(ratings);
  } catch (error) {
    console.error('Error fetching success factor ratings:', error);
    return res.status(500).json({ message: 'Failed to fetch success factor ratings' });
  }
});

// PUT /api/projects/:projectId/success-factor-ratings
router.put('/:projectId/success-factor-ratings', isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate input
    let ratings;
    try {
      ratings = ratingsArraySchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      throw error;
    }
    
    // Verify project exists and user has access
    const projectExists = await db.query.projects.findFirst({
      where: eq(db.projects.id, parseInt(projectId)),
    });
    
    if (!projectExists) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has access to this project
    const userId = (req.user as any).id;
    if (projectExists.userId !== userId) {
      // Check if this is an organization project and if user is a member
      if (projectExists.organisationId) {
        const isMember = await db.query.organisationMemberships.findFirst({
          where: and(
            eq(db.organisationMemberships.userId, userId),
            eq(db.organisationMemberships.organisationId, projectExists.organisationId)
          ),
        });
        
        if (!isMember) {
          return res.status(403).json({ message: 'Unauthorized access to project' });
        }
      } else {
        return res.status(403).json({ message: 'Unauthorized access to project' });
      }
    }
    
    // Process each rating
    const results = [];
    
    for (const rating of ratings) {
      // Check if rating exists
      const existingRating = await db.query.successFactorRatings.findFirst({
        where: and(
          eq(successFactorRatings.projectId, parseInt(projectId)),
          eq(successFactorRatings.factorId, rating.factorId)
        ),
      });
      
      if (existingRating) {
        // Update existing rating
        const [updated] = await db
          .update(successFactorRatings)
          .set({
            resonance: rating.resonance,
            notes: rating.notes,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(successFactorRatings.projectId, parseInt(projectId)),
              eq(successFactorRatings.factorId, rating.factorId)
            )
          )
          .returning();
        
        results.push(updated);
      } else {
        // Insert new rating
        const [inserted] = await db
          .insert(successFactorRatings)
          .values({
            projectId: parseInt(projectId),
            factorId: rating.factorId,
            resonance: rating.resonance,
            notes: rating.notes
          })
          .returning();
        
        results.push(inserted);
      }
    }
    
    return res.status(200).json({
      message: 'Success factor ratings updated successfully',
      ratings: results
    });
  } catch (error) {
    console.error('Error updating success factor ratings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      message: 'Failed to update success factor ratings',
      error: errorMessage,
      details: process.env.NODE_ENV !== 'production' ? String(error) : undefined
    });
  }
});

export default router;