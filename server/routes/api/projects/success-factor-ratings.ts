import express, { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { successFactorRatings } from '@shared/schema';
import { resonanceRatingSchema, resonanceRatingsArraySchema } from '@shared/types';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../../../middlewares/isAuthenticated';
import { z } from 'zod';

const router = express.Router();

// GET /api/projects/:projectId/success-factor-ratings
router.get('/:projectId/success-factor-ratings', isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = (req.user as any).id;
    
    // Diagnostic log
    console.log('🔹 [API:GET] Fetching ratings for projectId:', projectId, 'userId:', userId);
    
    // Verify project exists and user has access
    const projectExists = await db.query.projects.findFirst({
      where: eq(db.projects.id, parseInt(projectId)),
    });
    
    if (!projectExists) {
      console.log(`❌ [API:GET] Project ${projectId} not found`);
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has access to this project
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
          console.log(`⛔ [API:GET] Unauthorized access to project ${projectId} by user ${userId}`);
          return res.status(403).json({ message: 'Unauthorized access to project' });
        }
      } else {
        console.log(`⛔ [API:GET] Unauthorized access to project ${projectId} by user ${userId}`);
        return res.status(403).json({ message: 'Unauthorized access to project' });
      }
    }
    
    // Fetch ratings for this project
    const ratings = await db.query.successFactorRatings.findMany({
      where: eq(successFactorRatings.projectId, parseInt(projectId)),
    });
    
    console.log(`✅ [API:GET] Found ${ratings.length} ratings for project ${projectId}`);
    return res.status(200).json(ratings);
  } catch (error) {
    console.error('❌ [API:GET] Error fetching success factor ratings:', error);
    return res.status(500).json({ message: 'Failed to fetch success factor ratings' });
  }
});

// PUT /api/projects/:projectId/success-factor-ratings
router.put('/:projectId/success-factor-ratings', isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = (req.user as any).id;
    
    // Diagnostic log
    console.log('🔹 [API:PUT] Received request - projectId:', projectId, 'userId:', userId);
    console.log('🔹 [API:PUT] Request body:', JSON.stringify(req.body));
    
    // Validate input
    let ratings;
    try {
      ratings = resonanceRatingsArraySchema.parse(req.body);
      console.log('✅ [API:PUT] Validation succeeded - Ratings:', JSON.stringify(ratings));
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ [API:PUT] Validation failed - Errors:', JSON.stringify(error.errors));
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      throw error;
    }
    
    // Verify project exists and user has access
    const projectExists = await db.query.projects.findFirst({
      where: eq(db.projects.id, parseInt(projectId)),
    });
    
    if (!projectExists) {
      console.log(`❌ [API:PUT] Project ${projectId} not found`);
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has access to this project
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
          console.log(`⛔ [API:PUT] Unauthorized access to project ${projectId} by user ${userId}`);
          return res.status(403).json({ message: 'Unauthorized access to project' });
        }
      } else {
        console.log(`⛔ [API:PUT] Unauthorized access to project ${projectId} by user ${userId}`);
        return res.status(403).json({ message: 'Unauthorized access to project' });
      }
    }
    
    // Process each rating
    const results = [];
    
    for (const rating of ratings) {
      console.log(`🔹 [API:PUT] Processing rating for factorId: ${rating.factorId}, resonance: ${rating.resonance}`);
      
      // Check if rating exists
      const existingRating = await db.query.successFactorRatings.findFirst({
        where: and(
          eq(successFactorRatings.projectId, parseInt(projectId)),
          eq(successFactorRatings.factorId, rating.factorId)
        ),
      });
      
      if (existingRating) {
        console.log(`🔄 [API:PUT] Updating existing rating for factorId: ${rating.factorId}`);
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
        console.log(`➕ [API:PUT] Inserting new rating for factorId: ${rating.factorId}`);
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
    
    console.log(`✅ [API:PUT] Successfully updated ${results.length} ratings for project ${projectId}`);
    return res.status(200).json({
      message: 'Success factor ratings updated successfully',
      ratings: results
    });
  } catch (error) {
    console.error('❌ [API:PUT] Error updating success factor ratings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      message: 'Failed to update success factor ratings',
      error: errorMessage,
      details: process.env.NODE_ENV !== 'production' ? String(error) : undefined
    });
  }
});

export default router;